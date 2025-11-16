-- Migration to add staff, schools, and matching functionality
-- Run this in your Supabase SQL Editor

-- Staff table for admin/staff authentication
CREATE TABLE IF NOT EXISTS staff (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_chinese VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    location_chinese VARCHAR(255),
    city VARCHAR(255),
    province VARCHAR(255),
    school_type VARCHAR(100), -- e.g., 'International', 'Bilingual', 'Public', 'Private'
    age_groups TEXT[], -- Array of age groups they serve, e.g., ['Elementary', 'Middle School', 'High School']
    subjects_needed TEXT[], -- Array of subjects they need teachers for
    experience_required VARCHAR(100), -- e.g., '1-3 years', '3-5 years', '5+ years'
    chinese_required BOOLEAN DEFAULT false,
    salary_range VARCHAR(255),
    contract_type VARCHAR(100), -- e.g., 'Full Time', 'Part Time'
    benefits TEXT,
    description TEXT,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher-school matches table
CREATE TABLE IF NOT EXISTS teacher_school_matches (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2), -- Score from 0-100 indicating match quality
    match_reasons TEXT[], -- Array of reasons why they match
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'contacted', 'interviewed', 'placed', 'rejected'
    notes TEXT,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, school_id)
);

-- Add is_matched field to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS is_matched BOOLEAN DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_schools_location ON schools(location);
CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_school_matches_teacher_id ON teacher_school_matches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_school_matches_school_id ON teacher_school_matches(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_school_matches_status ON teacher_school_matches(status);
CREATE INDEX IF NOT EXISTS idx_teachers_is_matched ON teachers(is_matched);

-- Create triggers for updated_at
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_school_matches_updated_at BEFORE UPDATE ON teacher_school_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_school_matches ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role to access everything
CREATE POLICY "Service role can do everything on staff" ON staff
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on schools" ON schools
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on teacher_school_matches" ON teacher_school_matches
    FOR ALL USING (true) WITH CHECK (true);

-- Insert a default master admin user (password: 'admin123' - CHANGE THIS IMMEDIATELY!)
-- Password hash for 'admin123' using bcrypt
-- IMPORTANT: Change this password immediately after first login!
-- Master admin can manage other staff members from the dashboard
INSERT INTO staff (username, password_hash, full_name, role) 
VALUES ('admin', '$2b$10$TzEhPvDZuWatX/Ziw8EBfew6qBB9iamR5L3TJZmqYMu6mHrpg25V2', 'Master Admin', 'master_admin')
ON CONFLICT (username) DO NOTHING;

