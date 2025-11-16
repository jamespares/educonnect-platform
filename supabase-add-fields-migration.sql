-- Migration to add new fields to teachers table
-- Run this in your Supabase SQL Editor

-- Add new columns to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS headshot_photo_path TEXT,
ADD COLUMN IF NOT EXISTS linkedin VARCHAR(500),
ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
ADD COLUMN IF NOT EXISTS wechat_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS professional_experience TEXT;

-- Add comments for documentation
COMMENT ON COLUMN teachers.headshot_photo_path IS 'Path to uploaded headshot photo in Supabase Storage';
COMMENT ON COLUMN teachers.linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN teachers.instagram IS 'Instagram username';
COMMENT ON COLUMN teachers.wechat_id IS 'WeChat ID for communication';
COMMENT ON COLUMN teachers.professional_experience IS 'Professional experience description for candidates without teaching experience';

