const { verifyToken, setCorsHeaders } = require('./lib/auth');
const { getSupabaseClient } = require('./lib/supabase');
const { getSharedUserId } = require('./lib/shared');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(str) {
    if (!str) return true;
    if (!DATE_REGEX.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
}

module.exports = async (req, res) => {
    setCorsHeaders(res, 'GET, PUT, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        verifyToken(req);
        const supabase = getSupabaseClient();
        const sharedUserId = await getSharedUserId(supabase);
        if (!sharedUserId) {
            return res.status(500).json({ error: 'No users configured' });
        }

        if (req.method === 'GET') {
            // All users see the same settings (shared family data)
            // Get first settings row (any user) to support existing data, then prefer shared user
            const { data: sharedData } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', sharedUserId)
                .maybeSingle();

            let data = sharedData;
            if (!data) {
                const { data: fallbackData } = await supabase
                    .from('settings')
                    .select('*')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                data = fallbackData;
            }

            if (!data) {
                return res.status(200).json({
                    topTotal: 27,
                    bottomTotal: 23,
                    installDate: null,
                    scheduleType: 'every_n_days',
                    intervalDays: 2,
                    childName: 'Child'
                });
            }

            return res.status(200).json({
                topTotal: data.top_total,
                bottomTotal: data.bottom_total,
                installDate: data.install_date,
                scheduleType: data.schedule_type,
                intervalDays: data.interval_days,
                childName: data.child_name
            });

        } else if (req.method === 'PUT') {
            const {
                topTotal,
                bottomTotal,
                installDate,
                scheduleType,
                intervalDays,
                childName
            } = req.body;

            if (scheduleType && !['every_n_days', 'twice_per_week'].includes(scheduleType)) {
                return res.status(400).json({ error: 'scheduleType must be "every_n_days" or "twice_per_week"' });
            }

            const top = topTotal !== undefined ? parseInt(topTotal, 10) : 27;
            const bottom = bottomTotal !== undefined ? parseInt(bottomTotal, 10) : 23;
            const interval = intervalDays !== undefined ? parseInt(intervalDays, 10) : 2;

            if (isNaN(top) || top < 1 || top > 999) {
                return res.status(400).json({ error: 'topTotal must be between 1 and 999' });
            }
            if (isNaN(bottom) || bottom < 1 || bottom > 999) {
                return res.status(400).json({ error: 'bottomTotal must be between 1 and 999' });
            }
            if (isNaN(interval) || interval < 1 || interval > 365) {
                return res.status(400).json({ error: 'intervalDays must be between 1 and 365' });
            }
            if (!isValidDate(installDate)) {
                return res.status(400).json({ error: 'installDate must be YYYY-MM-DD format' });
            }

            const child = (childName || 'Child').toString().trim();
            if (child.length > 100) {
                return res.status(400).json({ error: 'childName must be 100 characters or less' });
            }

            const dataToSave = {
                user_id: userId,
                top_total: top,
                bottom_total: bottom,
                install_date: installDate || null,
                schedule_type: scheduleType || 'every_n_days',
                interval_days: interval,
                child_name: child || 'Child'
            };

            const { data: existing } = await supabase
                .from('settings')
                .select('id')
                .eq('user_id', sharedUserId)
                .maybeSingle();

            const result = existing
                ? await supabase.from('settings').update(dataToSave).eq('user_id', sharedUserId).select()
                : await supabase.from('settings').insert(dataToSave).select();

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
        if (error.message && error.message.includes('JWT_SECRET')) {
            return res.status(500).json({ error: 'Server configuration error' });
        }
        console.error('Settings API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
