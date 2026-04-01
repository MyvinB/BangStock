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
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
Get the service role key from **Supabase → Settings → API → service_role**.

### 3. Set Up Database
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase-schema.sql`
3. Paste and run the SQL to create all tables
4. Run these fixes for existing constraints:
```sql
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses DROP COLUMN IF EXISTS date;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
```

5. Run these indexes for performance:
```sql
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_staff_id ON sales(staff_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_payment_mode ON sales(payment_mode);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_sale_items_variant_id ON sale_items(variant_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_cash_reconciliation_date ON cash_reconciliation(date DESC);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_refunds_sale_id ON refunds(sale_id);
CREATE INDEX idx_refunds_product_id ON refunds(product_id);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);
```

### 4. Enable Storage
1. Go to Storage in Supabase Dashboard
2. Create a new bucket called `product-images`
3. Make it public (for client-facing site)
4. Run these storage policies in SQL Editor:
```sql
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');
```

### 5. Set Up Admin User
1. Go to Supabase Dashboard → Authentication → Users → Add User
2. Create your admin account
3. Run this SQL to promote them to admin:
```sql
-- Insert all existing users as staff first
INSERT INTO profiles (id, role) SELECT id, 'staff' FROM auth.users;

-- Promote yourself to admin
UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 7. Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```
Add all three environment variables in Vercel Dashboard → Settings → Environment Variables.

## Features
- ✅ Product & Stock Management with image upload
- ✅ POS System with payment modes (Cash, UPI, Card)
- ✅ Customer data capture
- ✅ Expense tracking
- ✅ Cash reconciliation
- ✅ Owner dashboard
- ✅ Client-facing shop (live stock + images)
- ✅ Real-time sync
- ✅ Role-based access (Admin / Staff)
- ✅ Staff management UI
- ✅ Audit trail
- ✅ Auto stock deduction
- ✅ Image storage

## Roles
| Feature | Admin | Staff |
|---|---|---|
| POS | ✅ | ✅ |
| Products | ✅ | ✅ |
| Customers | ✅ | ✅ |
| Expenses | ✅ | ❌ |
| Cash Reconciliation | ✅ | ❌ |
| Dashboard | ✅ | ❌ |
| Staff Management | ✅ | ❌ |

## Project Structure
```
bangstock-app/
├── app/
│   ├── admin/
│   │   ├── page.tsx              # Admin home
│   │   ├── layout.tsx            # Auth guard
│   │   ├── pos/                  # Point of Sale
│   │   ├── products/             # Product & image management
│   │   ├── customers/            # Customer list
│   │   ├── expenses/             # Expense tracking
│   │   ├── reconciliation/       # Cash reconciliation
│   │   ├── dashboard/            # Analytics (admin only)
│   │   └── staff/                # Staff management (admin only)
│   ├── shop/                     # Public storefront
│   ├── login/                    # Login page
│   └── api/
│       └── staff/                # Staff CRUD API
├── components/
│   └── AdminOnly.tsx             # Admin-only route guard
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── supabase-admin.ts         # Supabase admin client (server-side)
│   └── auth.tsx                  # Auth context + role
└── supabase-schema.sql           # Full database schema
```

## Free Tier Limits
- Supabase: 500 MB database, 1 GB storage, 50k MAU
- Vercel: Unlimited deployments, 100 GB bandwidth
- Perfect for single retail shop with moderate traffic
