# BangStock Retail Control System

A modern retail management system with POS, inventory tracking, and client-facing storefront.

## Tech Stack
- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Storage + Auth)
- **Deployment:** Vercel (Free tier)

## Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Copy your project URL and anon key from Settings → API

### 2. Configure Environment Variables
Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Set Up Database
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase-schema.sql`
3. Paste and run the SQL to create all tables

### 4. Enable Storage
1. Go to Storage in Supabase Dashboard
2. Create a new bucket called `product-images`
3. Make it public (for client-facing site)

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Add environment variables in Vercel dashboard.

## Features
- ✅ Product & Stock Management
- ✅ POS System with payment modes
- ✅ Customer data capture
- ✅ Expense tracking
- ✅ Cash reconciliation
- ✅ Owner dashboard
- ✅ Client-facing inventory (live stock)
- ✅ Real-time sync
- ✅ Role-based access
- ✅ Audit trail
- ✅ Auto stock deduction
- ✅ Image storage

## Project Structure
```
bangstock-app/
├── app/                    # Next.js app directory
│   ├── (admin)/           # Admin/POS routes (protected)
│   ├── (public)/          # Client-facing storefront
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities & Supabase client
└── supabase-schema.sql   # Database schema
```

## Free Tier Limits
- Supabase: 500 MB database, 1 GB storage, 50k MAU
- Vercel: Unlimited deployments, 100 GB bandwidth
- Perfect for single retail shop with moderate traffic
