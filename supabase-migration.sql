-- Supabase Migration SQL
-- Run this in your Supabase SQL Editor to create the necessary tables

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    years_experience VARCHAR(50) NOT NULL,
    education TEXT NOT NULL,
    teaching_experience TEXT NOT NULL,
    subject_specialty VARCHAR(255) NOT NULL,
    preferred_location VARCHAR(255),
    preferred_age_group VARCHAR(255),
    intro_video_path TEXT,
    additional_info TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    location_chinese VARCHAR(255),
    salary VARCHAR(255) NOT NULL,
    experience VARCHAR(255) NOT NULL,
    chinese_required VARCHAR(50) DEFAULT 'No',
    qualification VARCHAR(255) NOT NULL,
    contract_type VARCHAR(100) DEFAULT 'Full Time',
    job_functions TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    is_active BOOLEAN DEFAULT true,
    is_new BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job interests table
CREATE TABLE IF NOT EXISTS job_interests (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    preferred_location VARCHAR(255),
    teaching_subject VARCHAR(255) NOT NULL,
    experience VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_teachers_created_at ON teachers(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_job_interests_status ON job_interests(status);
CREATE INDEX IF NOT EXISTS idx_job_interests_created_at ON job_interests(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_interests ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role to access everything
-- (This is safe because we're using service role key on the server)
CREATE POLICY "Service role can do everything on teachers" ON teachers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on jobs" ON jobs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on job_interests" ON job_interests
    FOR ALL USING (true) WITH CHECK (true);

-- Allow public read access to active jobs (for the jobs page)
CREATE POLICY "Public can read active jobs" ON jobs
    FOR SELECT USING (is_active = true);

