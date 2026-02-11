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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
            // Get all treatment notes for user, ordered by date descending
            const { data, error } = await supabase
                .from('treatment_notes')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching treatment notes:', error);
                return res.status(500).json({ error: 'Failed to fetch treatment notes' });
            }

            return res.status(200).json(data || []);

        } else if (req.method === 'POST') {
            // Create new treatment note
            const { date, note } = req.body;

            if (!date || !note) {
                return res.status(400).json({ error: 'date and note are required' });
            }

            const { data, error } = await supabase
                .from('treatment_notes')
                .insert({
                    user_id: userId,
                    date: date,
                    note: note
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating treatment note:', error);
                return res.status(500).json({ error: 'Failed to create treatment note' });
            }

            return res.status(201).json(data);

        } else if (req.method === 'PUT') {
            // Update treatment note
            const { id, date, note } = req.body;

            if (!id) {
                return res.status(400).json({ error: 'id is required' });
            }
            if (!date || !note) {
                return res.status(400).json({ error: 'date and note are required' });
            }

            const { data, error } = await supabase
                .from('treatment_notes')
                .update({
                    date: date,
                    note: note
                })
                .eq('id', id)
                .eq('user_id', userId) // Ensure user can only update their own notes
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
            // Delete treatment note
            const noteId = req.query.id || req.body.id;

            if (!noteId) {
                return res.status(400).json({ error: 'Note ID is required' });
            }

            const { error } = await supabase
                .from('treatment_notes')
                .delete()
                .eq('id', noteId)
                .eq('user_id', userId); // Ensure user can only delete their own notes

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
        
        console.error('Treatment notes API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
