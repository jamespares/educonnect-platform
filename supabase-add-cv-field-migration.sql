-- Migration to add CV path field to teachers table
-- Run this in your Supabase SQL Editor

-- Add cv_path column to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS cv_path TEXT;

-- Add comment for documentation
COMMENT ON COLUMN teachers.cv_path IS 'Path to uploaded CV/resume file in Supabase Storage';
