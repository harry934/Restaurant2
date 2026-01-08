# Admin Login Setup Guide

## ✅ What I Fixed

Your admin login now supports **TWO admins** using environment variables, perfect for Railway deployment!

## 🔧 How It Works

The login system now checks in this order:

1. **Admin 1** (from environment variables)
2. **Admin 2** (from environment variables)
3. **Database staff logins** (fallback for additional staff)

## 🚀 Setting Up on Railway

### Step 1: Add Environment Variables

In your Railway dashboard, go to your project settings and add these variables:

```
ADMIN1_USER=your_username_1
ADMIN1_PASS=your_password_1
ADMIN1_NAME=John Doe

ADMIN2_USER=your_username_2
ADMIN2_PASS=your_password_2
ADMIN2_NAME=Jane Smith
```

### Step 2: Login Instructions

When logging into the admin panel:

- **Username**: Use `ADMIN1_USER` or `ADMIN2_USER` value
- **Password**: Use the corresponding password
- **Staff Name**: Leave EMPTY or type anything (it's optional for env admins)

## 📝 Example Login

**For Admin 1:**

- Username: `admin1` (whatever you set in ADMIN1_USER)
- Password: `SecurePass123` (whatever you set in ADMIN1_PASS)
- Staff Name: (leave empty or type anything)

**For Admin 2:**

- Username: `admin2` (whatever you set in ADMIN2_USER)
- Password: `AnotherPass456` (whatever you set in ADMIN2_PASS)
- Staff Name: (leave empty or type anything)

## 🔒 Security Notes

- Never commit your `.env` file to GitHub
- Use strong, unique passwords for each admin
- The `ADMIN_TOKEN` should be a long random string

## 🐛 Troubleshooting

### "Invalid credentials" error?

1. Check that environment variables are set correctly in Railway
2. Make sure there are no extra spaces in the values
3. Verify username and password match exactly (case-sensitive)

### Still can't login locally?

1. Check your `.env` file has the variables
2. Restart your server after adding variables
3. Check server logs for `[ADMIN LOGIN]` messages

## 📌 Local Development

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials.
