-- Spreader Turn Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Users table (hard-coded users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracker data table (one row per user, stores their state)
CREATE TABLE IF NOT EXISTS tracker_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    top_total INTEGER DEFAULT 27,
    bottom_total INTEGER DEFAULT 23,
    top_done INTEGER DEFAULT 1,
    bottom_done INTEGER DEFAULT 1,
    interval_days INTEGER DEFAULT 2,
    install_date DATE,
    last_turn_date DATE,
    last_top_turn_date DATE,
    last_bottom_turn_date DATE,
    child_name TEXT DEFAULT 'Child',
    log_together BOOLEAN DEFAULT true,
    history JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tracker_data_user_id ON tracker_data(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_tracker_data_updated_at 
    BEFORE UPDATE ON tracker_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default users (you'll need to hash passwords - see setup instructions)
-- Example: INSERT INTO users (username, password_hash, display_name) VALUES
-- ('dad', '$2a$10$...', 'Dad'),
-- ('mom', '$2a$10$...', 'Mom');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data (enforced by API, but good to have)
CREATE POLICY "Users can read own data" ON tracker_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON tracker_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON tracker_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);
