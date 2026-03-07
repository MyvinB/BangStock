# How to Use BangStock

## 🚀 Quick Start

### 1. Add Your First Product
1. Go to: http://localhost:3000/admin/products
2. Click **"+ Add Product"**
3. Fill in:
   - SKU: `TSH001`
   - Name: `Oversized Black Tee`
   - Category: `Tees`
   - Cost Price: `300`
   - Selling Price: `599`
   - Stock: `10`
4. Click **"Add Product"**

### 2. Make Your First Sale
1. Go to: http://localhost:3000/admin/pos
2. Click on a product to add to cart
3. Adjust quantity with +/- buttons
4. Enter customer phone: `9876543210`
5. Select payment mode: Cash/UPI/Card
6. Click **"Complete Sale"**
7. ✅ Stock automatically deducted!

### 3. View Customer Data
1. Go to: http://localhost:3000/admin/customers
2. See all customers with purchase history

### 4. Check Dashboard
1. Go to: http://localhost:3000/admin/dashboard
2. View today's sales, orders, and low stock alerts

### 5. Customer Shop View
1. Go to: http://localhost:3000/shop
2. This is what customers see (live inventory)
3. Share this link with customers!

## 📱 Mobile Usage

### Install on Phone
1. Deploy to Vercel first
2. Open deployed URL on phone
3. **iPhone:** Safari → Share → Add to Home Screen
4. **Android:** Chrome → Menu → Install App

### Use as POS on Tablet
- Install the app on tablet
- Keep it at checkout counter
- Staff can process sales quickly
- Works offline after first load

## 🔄 Workflow

**Daily Operations:**
1. Staff opens POS on tablet/phone
2. Customer selects items
3. Staff adds to cart in POS
4. Enter customer phone
5. Complete sale
6. Stock updates automatically
7. Customer sees updated stock on shop page

**Owner Monitoring:**
1. Check dashboard daily
2. View sales and profit
3. Monitor low stock
4. Add new products
5. View customer database

## 🎯 Key Features

✅ **Auto Stock Deduction** - No manual updates needed  
✅ **Real-time Sync** - Shop shows live inventory  
✅ **Customer Database** - Auto-saved on first purchase  
✅ **Mobile-First** - Works perfectly on phones/tablets  
✅ **Offline Support** - PWA works without internet  
✅ **No Login Required** - (Add auth later if needed)  

## 📝 Next Steps

1. **Add more products** via Products page
2. **Customize WhatsApp number** in `app/shop/page.tsx`
3. **Add product images** via Supabase Storage
4. **Deploy to Vercel** to go live
5. **Install on staff phones** for mobile POS

## 🆘 Common Issues

**"Insufficient stock" error**
- Product stock is 0 or less than quantity
- Add more stock in Products page

**Products not showing in shop**
- Check stock_quantity > 0
- Refresh the page

**Sale not completing**
- Enter customer phone (required)
- Check cart is not empty

## 🔐 Security (Optional)

Currently no login required for testing. To add authentication:
1. Enable Supabase Auth
2. Add login page
3. Protect admin routes
4. Keep shop page public

For now, just don't share the admin URL publicly!
