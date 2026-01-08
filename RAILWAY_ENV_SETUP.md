# Railway Environment Variables Setup

## Required Environment Variables for Admin Names

To display the correct admin names in the dashboard, you need to set these environment variables in Railway:

### Admin 1 Configuration

```
ADMIN1_USER=admin1
ADMIN1_PASS=admin123
ADMIN1_NAME=Your Full Name Here
```

### Admin 2 Configuration

```
ADMIN2_USER=admin2
ADMIN2_PASS=pcnc2026
ADMIN2_NAME=Second Admin Name Here
```

## How to Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Click "New Variable"
5. Add each variable:
   - Variable name: `ADMIN1_NAME`
   - Value: `John Doe` (or whatever name you want)
6. Repeat for `ADMIN2_NAME`

## Example Configuration

If you want the admins to show as:

- Admin 1: "John Doe"
- Admin 2: "Jane Smith"

Set these in Railway:

```
ADMIN1_NAME=John Doe
ADMIN2_NAME=Jane Smith
```

## What Happens Now

✅ **With Environment Variables Set:**

- Login as admin1 → Dashboard shows "Welcome John Doe"
- Login as admin2 → Dashboard shows "Welcome Jane Smith"

❌ **Without Environment Variables:**

- Login as admin1 → Dashboard shows "Welcome Admin1" (default)
- Login as admin2 → Dashboard shows "Welcome Admin2" (default)

## Alternative: Using Database Staff Logins

If you prefer to manage admin accounts in the database instead of environment variables:

1. Login to admin dashboard
2. Go to "System Settings"
3. Click on "Internal Team" or "Staff Access" section
4. Add/edit staff accounts with their names

**Note:** The database method was mentioned in the code but the UI for it might need to be implemented in the settings page.

## Current Fix Applied

I've updated `server.js` to properly return the `staffName` in the login response for database-stored accounts. This ensures that regardless of which authentication method is used (environment variables or database), the admin name will be displayed correctly.

## Testing

After setting the environment variables in Railway:

1. Redeploy your application (Railway should auto-deploy when you push)
2. Login to the admin dashboard
3. Check the sidebar - you should see "Welcome [Your Name]" instead of "Welcome John"

---

**Last Updated:** January 8, 2026
