-- Setup Users Script
-- This file shows how to create users with hashed passwords
-- You'll need to generate password hashes using bcrypt
-- 
-- Option 1: Use an online bcrypt generator: https://bcrypt-generator.com/
-- Option 2: Use Node.js: require('bcryptjs').hashSync('yourpassword', 10)
-- Option 3: Use the API endpoint /api/hash-password (see api/hash-password.js)
--
-- Then run these INSERT statements in Supabase SQL Editor:

-- Example (replace with your actual hashed passwords):
-- INSERT INTO users (username, password_hash, display_name) VALUES
-- ('dad', '$2a$10$YourHashedPasswordHere', 'Dad'),
-- ('mom', '$2a$10$YourHashedPasswordHere', 'Mom')
-- ON CONFLICT (username) DO NOTHING;

-- After creating users, you can also initialize their tracker data:
-- INSERT INTO tracker_data (user_id, top_total, bottom_total, top_done, bottom_done)
-- SELECT id, 27, 23, 1, 1 FROM users WHERE username = 'dad'
-- ON CONFLICT (user_id) DO NOTHING;
