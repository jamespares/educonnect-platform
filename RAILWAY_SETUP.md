# Railway Deployment Setup Guide

## Critical Issue: MySQL Environment Variables Not Set

Your application is currently using SQLite instead of MySQL because the MySQL environment variables are not configured in Railway.

## Step 1: Get MySQL Connection Details

1. Go to your Railway dashboard
2. Click on your **MySQL service** (not your app service)
3. Go to the **Variables** tab
4. Copy the following values:
   - `MYSQL_URL` or `DATABASE_URL`
   - `MYSQLHOST` or `MYSQL_HOST`
   - `MYSQLPORT` or `MYSQL_PORT`
   - `MYSQLUSER` or `MYSQL_USER`
   - `MYSQLPASSWORD` or `MYSQL_PASSWORD`
   - `MYSQLDATABASE` or `MYSQL_DATABASE`

## Step 2: Set Environment Variables in Your App Service

1. Go to your Railway dashboard
2. Click on your **educonnect-platform** service (your app, not MySQL)
3. Go to the **Variables** tab
4. Click **+ New Variable** and add these (use the values from Step 1):

### Required MySQL Variables

```
MYSQL_HOST=mysql.railway.internal
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=<paste-from-mysql-service>
MYSQL_DATABASE=railway
```

### Other Required Variables

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=EduConnect-2025-SecureSession-9x8m3k2p0
ADMIN_USERNAME=admin
ADMIN_PASSWORD=EduConnect2025!Strong
RESEND_API_KEY=re_drxCeN5p_Nbj4KPVezCw9CWQysp1R3P4i
EMAIL_TO=team@educonnectchina.com
```

### Optional (Railway sets automatically)

```
RAILWAY_VOLUME_MOUNT_PATH=/data
```

## Step 3: Verify Configuration

After setting the variables, Railway will automatically redeploy. Check the logs:

1. Go to **Deploy Logs** tab
2. Look for this line:
   ```
   🔍 Database Configuration:
     - MYSQL_HOST: ✓ Set
     - Database Type: MySQL
   ```

If you see "SQLite" instead of "MySQL", the environment variables are still not set correctly.

## Step 4: Test the Deployment

### A. Check Diagnostic Endpoint

1. Visit: `https://educonnectchina.com/admin`
2. Login with credentials
3. Open browser console and run:
   ```javascript
   fetch('/api/debug/status')
     .then(r => r.json())
     .then(console.log)
   ```

You should see:
```json
{
  "success": true,
  "data": {
    "database": {
      "type": "MySQL",
      "mysqlConfigured": true,
      "connectionStatus": "connected"
    }
  }
}
```

### B. Test Application Submission

1. Go to `https://educonnectchina.com/signup`
2. Fill out the form with a NEW email (not jamesedpares@gmail.com)
3. Upload a test video
4. Submit
5. Check admin panel - you should see the new application

## Step 5: Fix Session Issues (If Admin Panel Shows 302 Errors)

The 302 errors on `/api/teachers` suggest session authentication isn't working. This is because Railway's default session store (MemoryStore) doesn't work across multiple instances.

### Current Issue in Code (server.js:45-53)

The app uses `MemoryStore` which causes:
- Sessions not persisting across requests
- Login not staying authenticated
- 302 redirects to /login

### Quick Fix: Set Session Cookie Settings

In Railway environment variables, ensure:

```
NODE_ENV=production
```

But we also need to fix the session configuration for production. The code currently has:

```javascript
cookie: {
    secure: false, // Should be true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000
}
```

## Common Issues

### Issue: "Initializing SQLite database connection"
**Solution:** `MYSQL_HOST` environment variable is not set in Railway. Go back to Step 2.

### Issue: "SQLITE_CONSTRAINT: UNIQUE constraint failed"
**Solution:** You're still using SQLite. The duplicate email is in the temporary SQLite database, not MySQL. Set MySQL environment variables and redeploy.

### Issue: "Error loading teachers" in admin panel
**Solution:** Either:
1. Not logged in (clear cookies, login again)
2. MySQL not connected (check environment variables)
3. Session not persisting (fix session configuration in code)

### Issue: HTTP 302 on /api/teachers
**Solution:** Session authentication failing. This is the MemoryStore issue - sessions aren't persisting. You need to:
1. Clear browser cookies for educonnectchina.com
2. Login again
3. If still fails, we need to fix the session store in production

## Railway MySQL Connection String Format

If Railway provides a single `DATABASE_URL` or `MYSQL_URL`, it looks like:

```
mysql://root:PASSWORD@mysql.railway.internal:3306/railway
```

Break this down to:
- `MYSQL_USER` = `root`
- `MYSQL_PASSWORD` = `PASSWORD`
- `MYSQL_HOST` = `mysql.railway.internal`
- `MYSQL_PORT` = `3306`
- `MYSQL_DATABASE` = `railway`

## Verifying Volume Mount

To verify the volume is mounted and videos can be uploaded:

1. Check Deploy Logs for:
   ```
   📁 Uploads directory: /data/uploads
   ✅ Created uploads directory
   ```

2. After uploading a video, the file should persist in `/data/uploads/` even after redeployment.

## Next Steps After Fixing MySQL Connection

1. **Test application submission** - Submit a test application with a unique email
2. **Check MySQL database** - Verify data is in MySQL (use Railway's MySQL dashboard or connect via MySQL client)
3. **Test video upload** - Submit with video, check if it persists across redeploys
4. **Test admin panel** - Login and view teachers list

## Support

If you still see issues after setting environment variables:
1. Share the Deploy Logs (filter for "Database Configuration")
2. Share the output from `/api/debug/status` endpoint
3. Check the HTTP Logs for the `/api/teachers` request status code
