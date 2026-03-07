# BangStock Setup Guide

## Step 1: Create Supabase Account (2 minutes)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project:
   - Name: `bangstock`
   - Database Password: (save this!)
   - Region: Choose closest to India (e.g., Mumbai)
   - Click "Create new project" (takes ~2 minutes)

## Step 2: Get Your Credentials (1 minute)

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

## Step 3: Add Credentials to Your App (1 minute)

1. Open `bangstock-app/.env.local`
2. Replace with your actual values:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_key_here
```

## Step 4: Create Database Tables (2 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Open `bangstock-app/supabase-schema.sql` on your computer
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click "Run" (bottom right)
7. You should see "Success. No rows returned"

## Step 5: Set Up Image Storage (1 minute)

1. In Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Name: `product-images`
4. Make it **Public**
5. Click "Create bucket"

## Step 6: Run Your App (1 minute)

```bash
cd bangstock-app
npm run dev
```

Open http://localhost:3000 in your browser!

## Step 7: Deploy to Vercel (3 minutes)

1. Push code to GitHub:
```bash
git add .
git commit -m "Initial BangStock setup"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. Go to https://vercel.com
3. Sign up with GitHub
4. Click "Import Project"
5. Select your `bangstock-app` repository
6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Click "Deploy"

Your app will be live at `https://your-app.vercel.app` in ~2 minutes!

## Next Steps

- Add your WhatsApp number in `app/shop/page.tsx` (search for `YOUR_PHONE`)
- Start adding products through the admin panel
- Customize colors and branding in Tailwind config

## Troubleshooting

**"Failed to fetch products"**
- Check `.env.local` has correct Supabase credentials
- Restart dev server after changing `.env.local`

**"Insufficient stock" error**
- Make sure you ran the SQL schema (Step 4)
- Check product stock_quantity is > 0

**Images not showing**
- Verify `product-images` bucket is public
- Check image URLs are correct in database
