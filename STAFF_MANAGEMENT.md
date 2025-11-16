# Staff Management Guide

## How to Log In

1. **Navigate to the login page**: Go to `/login` on your website (e.g., `https://yourdomain.com/login`)

2. **Default Credentials** (after running migration):
   - **Username**: `admin`
   - **Password**: `admin123`
   
   ⚠️ **IMPORTANT**: Change this password immediately after first login!

3. **After successful login**, you'll be redirected to `/admin` (the staff dashboard)

## Managing Staff Accounts

Use the `manage-staff.js` script to manage staff accounts from the command line.

### Prerequisites

Make sure you have your `.env` file configured with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Available Commands

#### List All Staff Members
```bash
node manage-staff.js list
```

#### Add a New Staff Member
```bash
node manage-staff.js add <username> <password> [fullname]
```

**Example:**
```bash
node manage-staff.js add john "securePassword123" "John Doe"
node manage-staff.js add jane "myPassword456"
```

#### Update a Staff Member's Password
```bash
node manage-staff.js update-password <username> <newpassword>
```

**Example:**
```bash
node manage-staff.js update-password admin "newSecurePassword789"
```

#### Delete a Staff Member
```bash
node manage-staff.js delete <username>
```

**Example:**
```bash
node manage-staff.js delete john
```

#### Deactivate a Staff Member (prevents login)
```bash
node manage-staff.js deactivate <username>
```

**Example:**
```bash
node manage-staff.js deactivate john
```

#### Activate a Staff Member (re-enable login)
```bash
node manage-staff.js activate <username>
```

**Example:**
```bash
node manage-staff.js activate john
```

## Initial Setup Steps

1. **Run the database migration**:
   - Open your Supabase SQL Editor
   - Run the contents of `supabase-staff-schools-migration.sql`
   - This creates the staff, schools, and matches tables

2. **Change the default admin password**:
   ```bash
   node manage-staff.js update-password admin "YourSecurePasswordHere"
   ```

3. **Add additional staff members** (optional):
   ```bash
   node manage-staff.js add staff1 "password123" "Staff Member 1"
   node manage-staff.js add staff2 "password456" "Staff Member 2"
   ```

4. **Verify staff accounts**:
   ```bash
   node manage-staff.js list
   ```

## Login Flow

1. User navigates to `/login`
2. Enters username and password
3. Server checks credentials against the `staff` table in the database
4. If valid, creates a session and redirects to `/admin`
5. If invalid, shows error message

## Security Best Practices

1. **Use strong passwords**: Minimum 12 characters with mix of letters, numbers, and symbols
2. **Change default password immediately**: The default `admin123` password should be changed right away
3. **Deactivate instead of delete**: When a staff member leaves, deactivate their account rather than deleting it (preserves audit trail)
4. **Regular password updates**: Encourage staff to update passwords periodically
5. **Limit admin accounts**: Only create admin accounts for users who need full access

## Troubleshooting

### Can't log in?
- Verify the migration SQL was run successfully
- Check that the staff table exists: `SELECT * FROM staff;`
- Verify your `.env` file has correct Supabase credentials
- Try listing staff: `node manage-staff.js list`

### "Invalid credentials" error?
- Double-check username and password spelling
- Verify the staff account is active: `node manage-staff.js list`
- Try updating the password: `node manage-staff.js update-password <username> <newpassword>`

### Database connection errors?
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Check that your Supabase project is active
- Ensure the service role key has proper permissions

## Notes

- All passwords are hashed using bcrypt before storage
- Staff accounts can have roles: `admin` or `staff` (currently both have same permissions)
- Inactive staff accounts cannot log in but are preserved in the database
- The system falls back to legacy admin credentials (from environment variables) if database lookup fails

