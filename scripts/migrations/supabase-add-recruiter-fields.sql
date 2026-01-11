-- Migration to add recruiter/HR contact fields to schools table
-- Run this in your Supabase SQL Editor

-- Add recruiter fields to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS hr_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS recruiter_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS recruiter_wechat_id VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN schools.hr_email IS 'HR department email for recruitment';
COMMENT ON COLUMN schools.recruiter_email IS 'Primary recruiter contact email';
COMMENT ON COLUMN schools.recruiter_wechat_id IS 'WeChat ID of the recruiter/HR contact';

-- Create index for searching by recruiter email
CREATE INDEX IF NOT EXISTS idx_schools_recruiter_email ON schools(recruiter_email);
