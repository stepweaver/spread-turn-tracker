const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load users from environment variable
// Format: JSON array like: [{"username":"stephen","password":"yourpass","displayName":"Dad"},{"username":"kelsey","password":"yourpass","displayName":"Mom"}]
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

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

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
        // Debug: Log environment variable status (don't log actual values)
        console.log('Environment check:', {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasAppUsers: !!process.env.APP_USERS
        });
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Get users from environment variable
        let users;
        try {
            users = getUsers();
        } catch (error) {
            console.error('Error loading users:', error.message);
            return res.status(500).json({ error: 'Server configuration error: ' + error.message });
        }
        
        // Find user in the list
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password (compare with stored hash or plain text for simplicity)
        // In production, you'd compare with bcrypt hash from database
        const passwordMatch = password === user.password;
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get or create user in Supabase
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
            console.error('Missing Supabase credentials');
            return res.status(500).json({ error: 'Server configuration error: Supabase credentials not set' });
        }
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Check if user exists in database
        let { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id, username, display_name')
            .eq('username', username)
            .single();

        // If user doesn't exist, create them (first time login)
        if (!dbUser) {
            // Hash password for storage
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

            // Initialize settings for new user
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

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: dbUser.id, 
                username: dbUser.username,
                displayName: dbUser.display_name
            },
            JWT_SECRET,
            { expiresIn: '30d' } // Token valid for 30 days
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
        console.error('Error stack:', error.stack);
        // Return more detailed error in development
        const isDev = process.env.VERCEL_ENV === 'development' || !process.env.VERCEL_ENV;
        return res.status(500).json({ 
            error: isDev ? error.message : 'Internal server error',
            details: isDev ? error.stack : undefined,
            type: error.name || 'Error'
        });
    }
};
