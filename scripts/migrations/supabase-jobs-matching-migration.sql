-- Migration to enhance jobs table for teacher matching
-- Run this in your Supabase SQL Editor

-- Add new columns to jobs table for matching
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS age_groups TEXT[], -- Array of age groups for this position
ADD COLUMN IF NOT EXISTS subjects TEXT[], -- Array of subjects (alternative to job_functions for matching)
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS province VARCHAR(255);

-- Create teacher-job matches table
CREATE TABLE IF NOT EXISTS teacher_job_matches (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2), -- Score from 0-100 indicating match quality
    match_reasons TEXT[], -- Array of reasons why they match
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'contacted', 'interviewed', 'placed', 'rejected'
    notes TEXT,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, job_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_school_id ON jobs(school_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_teacher_id ON teacher_job_matches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_job_id ON teacher_job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_status ON teacher_job_matches(status);

-- Create trigger for updated_at on teacher_job_matches
CREATE TRIGGER update_teacher_job_matches_updated_at BEFORE UPDATE ON teacher_job_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE teacher_job_matches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to access everything
CREATE POLICY "Service role can do everything on teacher_job_matches" ON teacher_job_matches
    FOR ALL USING (true) WITH CHECK (true);

-- Comment: After running this migration, you'll have:
-- 1. Jobs can optionally be linked to schools via school_id
-- 2. Jobs have age_groups array for matching with teacher preferences
-- 3. Jobs have subjects array for matching with teacher specialties
-- 4. Jobs have city/province for location matching
-- 5. teacher_job_matches table to store teacher-job matches with scores and status

