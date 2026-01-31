const bcrypt = require('bcryptjs');

// Utility endpoint to hash passwords for initial setup
// Usage: POST /api/hash-password with { password: "yourpassword" }
// This helps you generate hashes to insert into the database

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password required' });
        }

        // Hash the password
        const hash = await bcrypt.hash(password, 10);

        return res.status(200).json({
            password,
            hash,
            sql: `INSERT INTO users (username, password_hash, display_name) VALUES ('username', '${hash}', 'Display Name');`
        });

    } catch (error) {
        console.error('Hash password error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
