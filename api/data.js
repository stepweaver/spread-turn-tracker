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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
            // Get tracker data
            const { data, error } = await supabase
                .from('tracker_data')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('Error fetching data:', error);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }

            // If no data exists, return defaults
            if (!data) {
                const defaultData = {
                    topTotal: 27,
                    bottomTotal: 23,
                    topDone: 1,
                    bottomDone: 1,
                    intervalDays: 2,
                    installDate: null,
                    lastTurnDate: null,
                    lastTopTurnDate: null,
                    lastBottomTurnDate: null,
                    childName: 'Child',
                    logTogether: true,
                    history: []
                };
                return res.status(200).json(defaultData);
            }

            // Transform database fields to frontend format
            const response = {
                topTotal: data.top_total,
                bottomTotal: data.bottom_total,
                topDone: data.top_done,
                bottomDone: data.bottom_done,
                intervalDays: data.interval_days,
                installDate: data.install_date,
                lastTurnDate: data.last_turn_date,
                lastTopTurnDate: data.last_top_turn_date,
                lastBottomTurnDate: data.last_bottom_turn_date,
                childName: data.child_name,
                logTogether: data.log_together,
                history: data.history || []
            };

            return res.status(200).json(response);

        } else if (req.method === 'POST' || req.method === 'PUT') {
            // Save tracker data
            const {
                topTotal,
                bottomTotal,
                topDone,
                bottomDone,
                intervalDays,
                installDate,
                lastTurnDate,
                lastTopTurnDate,
                lastBottomTurnDate,
                childName,
                logTogether,
                history
            } = req.body;

            // Check if data exists
            const { data: existing, error: checkError } = await supabase
                .from('tracker_data')
                .select('id')
                .eq('user_id', userId)
                .single();

            const dataToSave = {
                user_id: userId,
                top_total: topTotal,
                bottom_total: bottomTotal,
                top_done: topDone,
                bottom_done: bottomDone,
                interval_days: intervalDays,
                install_date: installDate || null,
                last_turn_date: lastTurnDate || null,
                last_top_turn_date: lastTopTurnDate || null,
                last_bottom_turn_date: lastBottomTurnDate || null,
                child_name: childName,
                log_together: logTogether,
                history: history || []
            };

            let result;
            if (existing) {
                // Update existing
                result = await supabase
                    .from('tracker_data')
                    .update(dataToSave)
                    .eq('user_id', userId)
                    .select();
            } else {
                // Insert new
                result = await supabase
                    .from('tracker_data')
                    .insert(dataToSave)
                    .select();
            }

            if (result.error) {
                console.error('Error saving data:', result.error);
                return res.status(500).json({ error: 'Failed to save data' });
            }

            return res.status(200).json({ success: true });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        console.error('Data API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
