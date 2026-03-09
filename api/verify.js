const { verifyToken, setCorsHeaders } = require('./lib/auth');

module.exports = async (req, res) => {
    setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const decoded = verifyToken(req);

        return res.status(200).json({
            valid: true,
            user: {
                userId: decoded.userId,
                username: decoded.username,
                displayName: decoded.displayName
            }
        });

    } catch (error) {
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        if (error.message && error.message.includes('JWT_SECRET')) {
            return res.status(500).json({ error: 'Server configuration error' });
        }
        console.error('Verify error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
