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

module.exports = async (req, res) => {
    setCorsHeaders(res, 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        verifyToken(req);
        const supabase = getSupabaseClient();

        if (req.method === 'GET') {
            // All users see the same turns (shared family data)
            const { data, error } = await supabase
                .from('turns')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching turns:', error);
                return res.status(500).json({ error: 'Failed to fetch turns' });
            }

            return res.status(200).json(data || []);

        } else if (req.method === 'POST') {
            const { turns } = req.body;

            if (!Array.isArray(turns) || turns.length === 0) {
                return res.status(400).json({ error: 'turns must be a non-empty array' });
            }

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
                const note = turn.note ? String(turn.note).trim() : null;
                if (note && note.length > MAX_NOTE_LENGTH) {
                    return res.status(400).json({ error: `note must be ${MAX_NOTE_LENGTH} characters or less` });
                }
            }

            const sharedUserId = await getSharedUserId(supabase);
            if (!sharedUserId) {
                return res.status(500).json({ error: 'No users configured' });
            }

            const turnsToInsert = turns.map(turn => ({
                user_id: sharedUserId,
                date: turn.date,
                arch: turn.arch,
                note: turn.note ? String(turn.note).trim().slice(0, MAX_NOTE_LENGTH) || null : null
            }));

            const { data, error } = await supabase
                .from('turns')
                .insert(turnsToInsert)
                .select();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({ error: 'A turn for this date and arch already exists' });
                }
                console.error('Error creating turns:', error);
                return res.status(500).json({ error: 'Failed to create turns' });
            }

            return res.status(201).json(data);

        } else if (req.method === 'DELETE') {
            const turnId = req.query.id || req.body.id;

            if (!turnId) {
                return res.status(400).json({ error: 'Turn ID is required' });
            }

            const { error } = await supabase
                .from('turns')
                .delete()
                .eq('id', turnId);

            if (error) {
                console.error('Error deleting turn:', error);
                return res.status(500).json({ error: 'Failed to delete turn' });
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
        console.error('Turns API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
