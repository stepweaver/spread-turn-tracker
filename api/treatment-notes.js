const { verifyToken, setCorsHeaders } = require('./lib/auth');
const { readObjects, overwriteObjects, generateId, nowIso } = require('./lib/sheets');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTE_LENGTH = 2000;

function isValidDate(str) {
    if (!str) return false;
    if (!DATE_REGEX.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
}

function validateNote(note) {
    const n = (note || '').toString().trim();
    if (!n) return { valid: false, error: 'note is required' };
    if (n.length > MAX_NOTE_LENGTH) {
        return { valid: false, error: `note must be ${MAX_NOTE_LENGTH} characters or less` };
    }
    return { valid: true, value: n };
}

function sortNotes(rows) {
    return [...rows].sort((a, b) => {
        const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
        if (dateCompare !== 0) return dateCompare;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
}

module.exports = async (req, res) => {
    setCorsHeaders(res, 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        verifyToken(req);

        if (req.method === 'GET') {
            const rows = await readObjects('treatment_notes');
            return res.status(200).json(sortNotes(rows));

        }

        if (req.method === 'POST') {
            const { date, note } = req.body || {};

            if (!date) {
                return res.status(400).json({ error: 'date is required' });
            }
            const noteResult = validateNote(note);
            if (!noteResult.valid) {
                return res.status(400).json({ error: noteResult.error });
            }
            if (!isValidDate(date)) {
                return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
            }

            const rows = await readObjects('treatment_notes');
            const timestamp = nowIso();

            const newRow = {
                id: generateId(),
                user_id: 'shared',
                date,
                note: noteResult.value,
                created_at: timestamp,
                updated_at: timestamp
            };

            const nextRows = [...rows, newRow];
            await overwriteObjects('treatment_notes', nextRows);

            return res.status(201).json(newRow);

        }

        if (req.method === 'PUT') {
            const { id, date, note } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'id is required' });
            }
            if (!date) {
                return res.status(400).json({ error: 'date is required' });
            }
            const noteResult = validateNote(note);
            if (!noteResult.valid) {
                return res.status(400).json({ error: noteResult.error });
            }
            if (!isValidDate(date)) {
                return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
            }

            const rows = await readObjects('treatment_notes');
            const index = rows.findIndex((row) => row.id === id);

            if (index === -1) {
                return res.status(404).json({ error: 'Treatment note not found' });
            }

            const existing = rows[index];
            rows[index] = {
                ...existing,
                date,
                note: noteResult.value,
                updated_at: nowIso()
            };

            await overwriteObjects('treatment_notes', rows);

            return res.status(200).json(rows[index]);

        }

        if (req.method === 'DELETE') {
            const noteId = req.query.id || req.body?.id;

            if (!noteId) {
                return res.status(400).json({ error: 'Note ID is required' });
            }

            const rows = await readObjects('treatment_notes');
            const filtered = rows.filter((row) => row.id !== noteId);

            if (filtered.length === rows.length) {
                return res.status(404).json({ error: 'Treatment note not found' });
            }

            await overwriteObjects('treatment_notes', filtered);

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.error('Treatment notes API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
