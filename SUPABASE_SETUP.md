# Supabase Setup Guide

This guide will help you migrate from MySQL/SQLite to Supabase for EduConnect.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Note down your:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Service Role Key (found in Settings → API → service_role key)

## Step 2: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase-migration.sql`
3. Click **Run** to execute the migration
4. Verify tables are created in **Table Editor**

## Step 3: Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it: `intro-videos` (or set `SUPABASE_STORAGE_BUCKET` env var to match)
4. Make it **Public** (so videos can be accessed via URL)
5. Click **Create bucket**

## Step 4: Set Up Environment Variables

Add these to your Railway (or local `.env`) environment variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=intro-videos
```

**Important:** Use the **service_role** key, not the anon key. The service role key has full access and bypasses RLS policies.

## Step 5: Deploy

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Migrate to Supabase"
   git push origin main
   ```

2. Railway will automatically deploy
3. Check logs to verify Supabase connection

## Step 6: Verify Setup

1. Visit `/api/debug/status` (requires admin login)
2. Check that database type shows "Supabase"
3. Try submitting a test application with a video

## Migration from Existing Database

If you have existing data in MySQL/SQLite:

1. Export your data from the old database
2. Use Supabase's import tools or write a migration script
3. The table structure matches, so you can map columns directly

## Troubleshooting

### "Failed to initialize Supabase"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- Verify the service role key has the correct permissions

### "Failed to upload video"
- Check that the storage bucket exists and is named correctly
- Verify the bucket is set to **Public**
- Check bucket policies allow uploads

### "Row Level Security" errors
- The migration SQL includes policies for service role access
- If you see RLS errors, check that the policies were created correctly

## Storage Bucket Policies

The migration SQL sets up basic policies, but you may want to customize:

- **Public read access** for videos (so they can be viewed)
- **Service role write access** for uploads (handled by server)

You can adjust these in Supabase Dashboard → Storage → Policies.

