const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Helper to verify token and get user
function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET);
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Verify authentication
        const decoded = verifyToken(req);
        const userId = decoded.userId;

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        if (req.method === 'GET') {
            // Get all turns for user, ordered by date descending
            const { data, error } = await supabase
                .from('turns')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching turns:', error);
                return res.status(500).json({ error: 'Failed to fetch turns' });
            }

            return res.status(200).json(data || []);

        } else if (req.method === 'POST') {
            // Create new turn(s)
            const { turns } = req.body; // Array of { date, arch, note }

            if (!Array.isArray(turns) || turns.length === 0) {
                return res.status(400).json({ error: 'turns must be a non-empty array' });
            }

            // Validate each turn
            for (const turn of turns) {
                if (!turn.date || !turn.arch) {
                    return res.status(400).json({ error: 'Each turn must have date and arch' });
                }
                if (!['top', 'bottom'].includes(turn.arch)) {
                    return res.status(400).json({ error: 'arch must be "top" or "bottom"' });
                }
            }

            // Insert turns with user_id
            const turnsToInsert = turns.map(turn => ({
                user_id: userId,
                date: turn.date,
                arch: turn.arch,
                note: turn.note || null
            }));

            const { data, error } = await supabase
                .from('turns')
                .insert(turnsToInsert)
                .select();

            if (error) {
                // Check if it's a unique constraint violation (duplicate turn)
                if (error.code === '23505') {
                    return res.status(409).json({ error: 'A turn for this date and arch already exists' });
                }
                console.error('Error creating turns:', error);
                return res.status(500).json({ error: 'Failed to create turns' });
            }

            return res.status(201).json(data);

        } else if (req.method === 'DELETE') {
            // Delete a turn (undo)
            const turnId = req.query.id || req.body.id;

            if (!turnId) {
                return res.status(400).json({ error: 'Turn ID is required' });
            }

            const { error } = await supabase
                .from('turns')
                .delete()
                .eq('id', turnId)
                .eq('user_id', userId); // Ensure user can only delete their own turns

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
        
        console.error('Turns API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
