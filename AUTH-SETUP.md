# Authentication Setup

## ✅ Login System Added!

Now only authenticated users can access admin pages.

## How to Create Admin User

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Open your `bangstock` project
3. Click **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Fill in:
   - **Email:** `admin@bangstock.com`
   - **Password:** `YourSecurePassword123`
   - **Auto Confirm User:** ✅ Check this box
6. Click **"Create user"**

### Option 2: Via Email Signup (If you enable it)

1. Enable email signup in Supabase:
   - Go to **Authentication** → **Providers**
   - Enable **Email** provider
2. Create signup page (optional)

## How It Works

### Protected Routes
- ✅ `/admin/*` - Requires login
- ✅ `/shop` - Public (no login needed)
- ✅ `/` - Public homepage

### Login Flow
1. User visits `/admin`
2. Not logged in → Redirected to `/login`
3. Enter email + password
4. Success → Access admin pages
5. Click "Sign Out" to logout

## Test It

1. **Start dev server:**
```bash
npm run dev
```

2. **Try accessing admin without login:**
   - Go to http://localhost:3000/admin
   - Should redirect to login page

3. **Login:**
   - Email: `admin@bangstock.com`
   - Password: (what you set in Supabase)
   - Click "Sign In"

4. **Access granted:**
   - Now you can use POS, Products, etc.
   - Click "Sign Out" to logout

## Security Features

✅ **Protected Admin Routes** - Can't access without login  
✅ **Session Management** - Stays logged in until sign out  
✅ **Auto Redirect** - Redirects to login if not authenticated  
✅ **Public Shop** - Customers don't need login  
✅ **Secure Passwords** - Handled by Supabase Auth  

## Multiple Users

To add staff members:
1. Create new user in Supabase Dashboard
2. Give them email + password
3. They can login and use POS

## Role-Based Access (Future)

Currently all logged-in users have full access. To add roles:
1. Add `role` field to users table
2. Create policies for Owner vs Staff
3. Hide certain pages based on role

For now, only create accounts for trusted staff!

## Forgot Password (Optional)

To enable password reset:
1. Configure email in Supabase (SMTP settings)
2. Add "Forgot Password" link on login page
3. Use `supabase.auth.resetPasswordForEmail()`

## Production Security

Before deploying:
- ✅ Use strong passwords
- ✅ Enable email confirmation
- ✅ Set up proper SMTP for password resets
- ✅ Don't share admin credentials
- ✅ Create separate accounts for each staff member
