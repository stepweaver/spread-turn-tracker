const { verifyToken, setCorsHeaders } = require('./lib/auth');
const { readObjects, overwriteObjects, nowIso, generateId } = require('./lib/sheets');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(str) {
    if (!str) return true;
    if (!DATE_REGEX.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
}

function toInt(value, fallback) {
    if (value === '' || value === null || value === undefined) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function getDefaultSettings() {
    return {
        topTotal: 27,
        bottomTotal: 23,
        installDate: null,
        scheduleType: 'every_n_days',
        intervalDays: 2,
        childName: 'Child'
    };
}

module.exports = async (req, res) => {
    setCorsHeaders(res, 'GET, PUT, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        verifyToken(req);

        if (req.method === 'GET') {
            const rows = await readObjects('settings');
            const active = rows[0];

            if (!active) {
                return res.status(200).json(getDefaultSettings());
            }

            return res.status(200).json({
                topTotal: toInt(active.top_total, 27),
                bottomTotal: toInt(active.bottom_total, 23),
                installDate: active.install_date || null,
                scheduleType: active.schedule_type || 'every_n_days',
                intervalDays: toInt(active.interval_days, 2),
                childName: active.child_name || 'Child'
            });
        }

        if (req.method === 'PUT') {
            const {
                topTotal,
                bottomTotal,
                installDate,
                scheduleType,
                intervalDays,
                childName
            } = req.body || {};

            if (scheduleType && !['every_n_days', 'twice_per_week'].includes(scheduleType)) {
                return res.status(400).json({ error: 'scheduleType must be "every_n_days" or "twice_per_week"' });
            }

            const top = topTotal !== undefined ? parseInt(topTotal, 10) : 27;
            const bottom = bottomTotal !== undefined ? parseInt(bottomTotal, 10) : 23;
            const interval = intervalDays !== undefined ? parseInt(intervalDays, 10) : 2;

            if (Number.isNaN(top) || top < 1 || top > 999) {
                return res.status(400).json({ error: 'topTotal must be between 1 and 999' });
            }
            if (Number.isNaN(bottom) || bottom < 1 || bottom > 999) {
                return res.status(400).json({ error: 'bottomTotal must be between 1 and 999' });
            }
            if (Number.isNaN(interval) || interval < 1 || interval > 365) {
                return res.status(400).json({ error: 'intervalDays must be between 1 and 365' });
            }
            if (!isValidDate(installDate)) {
                return res.status(400).json({ error: 'installDate must be YYYY-MM-DD format' });
            }

            const child = (childName || 'Child').toString().trim();
            if (child.length > 100) {
                return res.status(400).json({ error: 'childName must be 100 characters or less' });
            }

            const rows = await readObjects('settings');
            const existing = rows[0] || null;
            const timestamp = nowIso();

            const activeRow = {
                id: existing?.id || generateId(),
                user_id: existing?.user_id || 'shared',
                top_total: String(top),
                bottom_total: String(bottom),
                install_date: installDate || '',
                schedule_type: scheduleType || 'every_n_days',
                interval_days: String(interval),
                child_name: child || 'Child',
                created_at: existing?.created_at || timestamp,
                updated_at: timestamp
            };

            await overwriteObjects('settings', [activeRow]);

            return res.status(200).json({ success: true });

        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.error('Settings API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
