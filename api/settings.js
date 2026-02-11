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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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
            // Get user settings
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('Error fetching settings:', error);
                return res.status(500).json({ error: 'Failed to fetch settings' });
            }

            // If no settings exist, return defaults
            if (!data) {
                const defaultSettings = {
                    topTotal: 27,
                    bottomTotal: 23,
                    installDate: null,
                    scheduleType: 'every_n_days',
                    intervalDays: 2,
                    childName: 'Child'
                };
                return res.status(200).json(defaultSettings);
            }

            // Transform database fields to frontend format
            const response = {
                topTotal: data.top_total,
                bottomTotal: data.bottom_total,
                installDate: data.install_date,
                scheduleType: data.schedule_type,
                intervalDays: data.interval_days,
                childName: data.child_name
            };

            return res.status(200).json(response);

        } else if (req.method === 'PUT') {
            // Update settings
            const {
                topTotal,
                bottomTotal,
                installDate,
                scheduleType,
                intervalDays,
                childName
            } = req.body;

            // Validate schedule type
            if (scheduleType && !['every_n_days', 'twice_per_week'].includes(scheduleType)) {
                return res.status(400).json({ error: 'scheduleType must be "every_n_days" or "twice_per_week"' });
            }

            const dataToSave = {
                user_id: userId,
                top_total: topTotal,
                bottom_total: bottomTotal,
                install_date: installDate || null,
                schedule_type: scheduleType || 'every_n_days',
                interval_days: intervalDays || 2,
                child_name: childName || 'Child'
            };

            // Check if settings exist
            const { data: existing, error: checkError } = await supabase
                .from('settings')
                .select('id')
                .eq('user_id', userId)
                .single();

            let result;
            if (existing) {
                // Update existing
                result = await supabase
                    .from('settings')
                    .update(dataToSave)
                    .eq('user_id', userId)
                    .select();
            } else {
                // Insert new
                result = await supabase
                    .from('settings')
                    .insert(dataToSave)
                    .select();
            }

            if (result.error) {
                console.error('Error saving settings:', result.error);
                return res.status(500).json({ error: 'Failed to save settings' });
            }

            return res.status(200).json({ success: true });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        console.error('Settings API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
