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

function sortTurns(rows) {
    return [...rows].sort((a, b) => {
        const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
        if (dateCompare !== 0) return dateCompare;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
}

module.exports = async (req, res) => {
    setCorsHeaders(res, 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        verifyToken(req);

        if (req.method === 'GET') {
            const rows = await readObjects('turns');
            return res.status(200).json(sortTurns(rows));

        }

        if (req.method === 'POST') {
            const { turns } = req.body || {};

            if (!Array.isArray(turns) || turns.length === 0) {
                return res.status(400).json({ error: 'turns must be a non-empty array' });
            }

            const existingRows = await readObjects('turns');

            for (const turn of turns) {
                if (!turn.date || !turn.arch) {
                    return res.status(400).json({ error: 'Each turn must have date and arch' });
                }
                if (!['top', 'bottom'].includes(turn.arch)) {
                    return res.status(400).json({ error: 'arch must be "top" or "bottom"' });
                }
                if (!isValidDate(turn.date)) {
                    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
                }

                const note = turn.note ? String(turn.note).trim() : '';
                if (note.length > MAX_NOTE_LENGTH) {
                    return res.status(400).json({ error: `note must be ${MAX_NOTE_LENGTH} characters or less` });
                }

                const duplicate = existingRows.find(
                    (row) => row.date === turn.date && row.arch === turn.arch
                );

                if (duplicate) {
                    return res.status(409).json({ error: 'A turn for this date and arch already exists' });
                }
            }

            const timestamp = nowIso();

            const newRows = turns.map((turn) => ({
                id: generateId(),
                user_id: 'shared',
                date: turn.date,
                arch: turn.arch,
                note: turn.note ? String(turn.note).trim().slice(0, MAX_NOTE_LENGTH) : '',
                created_at: timestamp
            }));

            const allRows = [...existingRows, ...newRows];
            await overwriteObjects('turns', allRows);

            return res.status(201).json(newRows);

        }

        if (req.method === 'DELETE') {
            const turnId = req.query.id || req.body?.id;

            if (!turnId) {
                return res.status(400).json({ error: 'Turn ID is required' });
            }

            const rows = await readObjects('turns');
            const filtered = rows.filter((row) => row.id !== turnId);

            if (filtered.length === rows.length) {
                return res.status(404).json({ error: 'Turn not found' });
            }

            await overwriteObjects('turns', filtered);

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.error('Turns API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
