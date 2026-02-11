-- Expander Turn Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Users table (hard-coded users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (replaces tracker_data)
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    top_total INTEGER DEFAULT 27,
    bottom_total INTEGER DEFAULT 23,
    install_date DATE,
    schedule_type TEXT DEFAULT 'every_n_days' CHECK (schedule_type IN ('every_n_days', 'twice_per_week')),
    interval_days INTEGER DEFAULT 2,
    child_name TEXT DEFAULT 'Child',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turns table (individual turn entries)
CREATE TABLE IF NOT EXISTS turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    arch TEXT NOT NULL CHECK (arch IN ('top', 'bottom')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, arch)
);

-- Treatment notes table (separate from turns)
CREATE TABLE IF NOT EXISTS treatment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_turns_user_date ON turns(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_turns_user_arch ON turns(user_id, arch);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_user_date ON treatment_notes(user_id, date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_notes_updated_at 
    BEFORE UPDATE ON treatment_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_notes ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can read own settings" ON settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own turns" ON turns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own turns" ON turns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own turns" ON turns
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own treatment notes" ON treatment_notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own treatment notes" ON treatment_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own treatment notes" ON treatment_notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own treatment notes" ON treatment_notes
    FOR DELETE USING (auth.uid() = user_id);
