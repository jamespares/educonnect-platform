# Cleanup Guide: Removing MySQL/SQLite Code

After successfully migrating to Supabase and verifying everything works, you can safely remove the following:

## ✅ Safe to Delete (After Migration)

### Files to Delete:
1. **`database.js`** - Old MySQL/SQLite database class (replaced by `supabase-database.js`)
2. **`migrate-to-mysql.js`** - MySQL migration script (no longer needed)
3. **`setup-and-migrate.js`** - Old setup script (no longer needed)
4. **`teachers.db`** - SQLite database file (if it exists locally)
5. **`migrate-to-supabase.js`** - Keep this for now, but you can delete after migration is complete

### Dependencies to Remove (Optional):
From `package.json`, you can remove:
- `mysql2` - MySQL client (if you're sure you won't need it)
- `sqlite3` - SQLite client (if you're sure you won't need it)

**Note:** Keep them for now until you're 100% sure everything works. You can remove them later.

## 🗑️ Environment Variables to Remove (After Migration)

In Railway, you can remove these MySQL-related variables:
- `MYSQL_HOST` / `MYSQLHOST`
- `MYSQL_PORT` / `MYSQLPORT`
- `MYSQL_USER` / `MYSQLUSER`
- `MYSQL_PASSWORD` / `MYSQLPASSWORD`
- `MYSQL_DATABASE` / `MYSQLDATABASE`
- `MYSQL_URL`
- `MYSQL_PUBLIC_URL`
- `MYSQL_ROOT_PASSWORD`

**Keep these:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `EMAIL_TO`
- `RESEND_API_KEY`
- `SESSION_SECRET`

## 🚫 Don't Delete Yet

Keep these until you've verified everything works:
- `migrate-to-supabase.js` - Useful for reference or re-running migration
- MySQL/SQLite dependencies - Keep until you're confident

## 📋 Cleanup Checklist

- [ ] Run migration script successfully
- [ ] Test submitting a new teacher application
- [ ] Test viewing applications in admin dashboard
- [ ] Test video uploads
- [ ] Verify all data migrated correctly
- [ ] Test job listings
- [ ] Test job interest submissions
- [ ] Remove MySQL environment variables from Railway
- [ ] Delete old database files locally
- [ ] (Optional) Remove unused npm packages

## ⚠️ Important Notes

1. **Backup First**: Before deleting anything, make sure you have backups
2. **Test Thoroughly**: Test all functionality before removing code
3. **Keep Migration Script**: Keep `migrate-to-supabase.js` for a while in case you need to re-run it
4. **Railway MySQL Service**: You can delete the MySQL service from Railway dashboard after migration is complete and verified

