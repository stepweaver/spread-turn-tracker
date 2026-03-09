const { verifyToken, setCorsHeaders } = require('./lib/auth');
const { getSupabaseClient } = require('./lib/supabase');
const { getSharedUserId } = require('./lib/shared');

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

module.exports = async (req, res) => {
    setCorsHeaders(res, 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        verifyToken(req);
        const supabase = getSupabaseClient();

        if (req.method === 'GET') {
            // All users see the same treatment notes (shared family data)
            const { data, error } = await supabase
                .from('treatment_notes')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching treatment notes:', error);
                return res.status(500).json({ error: 'Failed to fetch treatment notes' });
            }

            return res.status(200).json(data || []);

        } else if (req.method === 'POST') {
            const { date, note } = req.body;

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

            const sharedUserId = await getSharedUserId(supabase);
            if (!sharedUserId) {
                return res.status(500).json({ error: 'No users configured' });
            }

            const { data, error } = await supabase
                .from('treatment_notes')
                .insert({
                    user_id: sharedUserId,
                    date: date,
                    note: noteResult.value
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating treatment note:', error);
                return res.status(500).json({ error: 'Failed to create treatment note' });
            }

            return res.status(201).json(data);

        } else if (req.method === 'PUT') {
            const { id, date, note } = req.body;

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

            const { data, error } = await supabase
                .from('treatment_notes')
                .update({
                    date: date,
                    note: noteResult.value
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating treatment note:', error);
                return res.status(500).json({ error: 'Failed to update treatment note' });
            }

            if (!data) {
                return res.status(404).json({ error: 'Treatment note not found' });
            }

            return res.status(200).json(data);

        } else if (req.method === 'DELETE') {
            const noteId = req.query.id || req.body.id;

            if (!noteId) {
                return res.status(400).json({ error: 'Note ID is required' });
            }

            const { error } = await supabase
                .from('treatment_notes')
                .delete()
                .eq('id', noteId);

            if (error) {
                console.error('Error deleting treatment note:', error);
                return res.status(500).json({ error: 'Failed to delete treatment note' });
            }

            return res.status(200).json({ success: true });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (error.message && error.message.includes('JWT_SECRET')) {
            return res.status(500).json({ error: 'Server configuration error' });
        }
        console.error('Treatment notes API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
