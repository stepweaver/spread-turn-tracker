const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret, setCorsHeaders } = require('./lib/auth');
const { getSupabaseClient } = require('./lib/supabase');

function getUsers() {
    const usersEnv = process.env.APP_USERS;
    if (!usersEnv) {
        throw new Error('APP_USERS environment variable is not set');
    }
    try {
        return JSON.parse(usersEnv);
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
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        let users;
        try {
            users = getUsers();
        } catch (error) {
            console.error('Error loading users:', error.message);
            return res.status(500).json({ error: 'Server configuration error: ' + error.message });
        }

        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordMatch = await verifyPassword(password, user);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const supabase = getSupabaseClient();

        let { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id, username, display_name')
            .eq('username', username)
            .single();

        if (!dbUser) {
            const passwordHash = await bcrypt.hash(password, 10);

            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    username: user.username,
                    password_hash: passwordHash,
                    display_name: user.displayName
                })
                .select('id, username, display_name')
                .single();

            if (createError) {
                console.error('Error creating user:', createError);
                return res.status(500).json({ error: 'Failed to create user' });
            }

            dbUser = newUser;

            await supabase
                .from('settings')
                .insert({
                    user_id: dbUser.id,
                    top_total: 27,
                    bottom_total: 23,
                    interval_days: 2,
                    child_name: 'Child',
                    schedule_type: 'every_n_days'
                });
        }

        const token = jwt.sign(
            {
                userId: dbUser.id,
                username: dbUser.username,
                displayName: dbUser.display_name
            },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        return res.status(200).json({
            token,
            user: {
                id: dbUser.id,
                username: dbUser.username,
                displayName: dbUser.display_name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        const isDev = process.env.VERCEL_ENV === 'development' || !process.env.VERCEL_ENV;
        return res.status(500).json({
            error: isDev ? error.message : 'Internal server error',
            details: isDev ? error.stack : undefined,
            type: error.name || 'Error'
        });
    }
};
