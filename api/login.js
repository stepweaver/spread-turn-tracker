const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret, setCorsHeaders } = require('./lib/auth');

function getUsers() {
    const usersEnv = process.env.APP_USERS;
    if (!usersEnv) {
        throw new Error('APP_USERS environment variable is not set');
    }

    try {
        const parsed = JSON.parse(usersEnv);
        if (!Array.isArray(parsed)) {
            throw new Error('APP_USERS must be a JSON array');
        }
        return parsed;
    } catch (error) {
        throw new Error('APP_USERS must be valid JSON array');
    }
}

async function verifyPassword(password, user) {
    if (user.passwordHash) {
        return bcrypt.compare(password, user.passwordHash);
    }
    if (user.password !== undefined) {
        return password === user.password;
    }
    return false;
}

module.exports = async (req, res) => {
    setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const users = getUsers();
        const user = users.find((u) => u.username === username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordMatch = await verifyPassword(password, user);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userId = user.id || user.username;
        const displayName = user.displayName || user.username;

        const token = jwt.sign(
            {
                userId,
                username: user.username,
                displayName
            },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        return res.status(200).json({
            token,
            user: {
                id: userId,
                username: user.username,
                displayName
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
