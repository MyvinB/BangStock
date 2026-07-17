'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminOnly from '@/components/AdminOnly'
import { LOW_STOCK_KEY } from '@/lib/constants'

type TopProduct = { name: string; qty: number; revenue: number }
type LowStockProduct = { name: string; stock_quantity: number }
type DeadStockProduct = { name: string; stock_quantity: number }
type PaymentBreakdown = { mode: string; total: number }

export default function DashboardPage() {
  const [threshold, setThreshold] = useState(5)
  const [editingThreshold, setEditingThreshold] = useState(false)
  const [thresholdInput, setThresholdInput] = useState('5')

  // Summary stats
  const [todaySales, setTodaySales] = useState(0)
  const [todayOrders, setTodayOrders] = useState(0)
  const [todayProfit, setTodayProfit] = useState(0)
  const [monthSales, setMonthSales] = useState(0)
  const [lastMonthSales, setLastMonthSales] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [newCustomersToday, setNewCustomersToday] = useState(0)
  const [newCustomersWeek, setNewCustomersWeek] = useState(0)
  const [repeatCustomers, setRepeatCustomers] = useState(0)

  // Lists
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([])
  const [deadStock, setDeadStock] = useState<DeadStockProduct[]>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([])

  useEffect(() => {
    const saved = parseInt(localStorage?.getItem(LOW_STOCK_KEY) ?? '5')
    setThreshold(saved)
    setThresholdInput(String(saved))
  }, [])

  useEffect(() => { fetchAll() }, [threshold])

  async function fetchAll() {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    // Today's sales
    const { data: todaySalesData } = await supabase
      .from('sales').select('total_amount, payment_mode').gte('created_at', today)
    setTodaySales(todaySalesData?.reduce((s, r) => s + r.total_amount, 0) || 0)
    setTodayOrders(todaySalesData?.length || 0)

    // Payment breakdown today
    const modes = ['Cash', 'UPI', 'Card']
    setPaymentBreakdown(modes.map(mode => ({
      mode,
      total: todaySalesData?.filter(s => s.payment_mode === mode).reduce((s, r) => s + r.total_amount, 0) || 0
    })))

    // Month sales
    const { data: monthData } = await supabase
      .from('sales').select('total_amount').gte('created_at', monthStart)
    setMonthSales(monthData?.reduce((s, r) => s + r.total_amount, 0) || 0)

    // Last month sales
    const { data: lastMonthData } = await supabase
      .from('sales').select('total_amount').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd)
    setLastMonthSales(lastMonthData?.reduce((s, r) => s + r.total_amount, 0) || 0)

    // Month expenses
    const { data: expData } = await supabase
      .from('expenses').select('amount').gte('created_at', monthStart)
    setMonthExpenses(expData?.reduce((s, r) => s + r.amount, 0) || 0)

    // Today's profit (from sale_items)
    const { data: todayItems } = await supabase
      .from('sale_items')
      .select('quantity, unit_price, product:products(cost_price)')
      .gte('created_at', today)
    const profit = todayItems?.reduce((s, item: any) => {
      return s + (item.unit_price - (item.product?.cost_price || 0)) * item.quantity
    }, 0) || 0
    setTodayProfit(profit)

    // Top products (last 30 days)
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('quantity, unit_price, product:products(name)')
      .gte('created_at', thirtyDaysAgo)

    const productMap: Record<string, TopProduct> = {}
    saleItems?.forEach((item: any) => {
      const name = item.product?.name || 'Unknown'
      if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
      productMap[name].qty += item.quantity
      productMap[name].revenue += item.unit_price * item.quantity
    })
    setTopProducts(Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5))

    // Low stock
    const { data: lowStock } = await supabase
      .from('products').select('name, stock_quantity')
      .eq('is_active', true).lt('stock_quantity', threshold).order('stock_quantity')
    setLowStockItems(lowStock || [])

    // Dead stock (active products with no sales in 30 days)
    const { data: soldProductIds } = await supabase
      .from('sale_items').select('product_id').gte('created_at', thirtyDaysAgo)
    const soldIds = new Set(soldProductIds?.map((i: any) => i.product_id))
    const { data: allProducts } = await supabase
      .from('products').select('id, name, stock_quantity').eq('is_active', true).gt('stock_quantity', 0)
    setDeadStock((allProducts || []).filter(p => !soldIds.has(p.id)))

    // Customers
    const { count: total } = await supabase.from('customers').select('*', { count: 'exact', head: true })
    setTotalCustomers(total || 0)

    const { count: todayNew } = await supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', today)
    setNewCustomersToday(todayNew || 0)

    const { count: weekNew } = await supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo)
    setNewCustomersWeek(weekNew || 0)

    // Repeat customers (more than 1 sale)
    const { data: salesByCustomer } = await supabase.from('sales').select('customer_id')
    const custCount: Record<string, number> = {}
    salesByCustomer?.forEach(s => { if (s.customer_id) custCount[s.customer_id] = (custCount[s.customer_id] || 0) + 1 })
    setRepeatCustomers(Object.values(custCount).filter(c => c > 1).length)
  }

  function saveThreshold() {
    const val = parseInt(thresholdInput)
    if (isNaN(val) || val < 1) return
    localStorage.setItem(LOW_STOCK_KEY, String(val))
    setThreshold(val)
    setEditingThreshold(false)
  }

  const monthGrowth = lastMonthSales > 0 ? ((monthSales - lastMonthSales) / lastMonthSales * 100).toFixed(1) : null

  return (
    <AdminOnly>
      <div className="min-h-screen bg-slate-50/50 text-slate-900 relative overflow-hidden flex flex-col">
        {/* Decorative Radial Glowing Backdrops */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Sticky Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/80">
          <div className="container mx-auto px-6 py-4">
            <a href="/admin" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mb-0.5">
              <span>←</span> Back to Operations
            </a>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Dashboard Metrics</h1>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8 flex-1 max-w-4xl space-y-8">
          {/* Today Summary */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Today's Summary</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</p>
                <p className="text-2xl font-black text-emerald-600">₹{todaySales.toFixed(0)}</p>
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders</p>
                <p className="text-2xl font-black text-blue-600">{todayOrders}</p>
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Profit</p>
                <p className="text-2xl font-black text-indigo-600">₹{todayProfit.toFixed(0)}</p>
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Customers</p>
                <p className="text-2xl font-black text-violet-600">{newCustomersToday}</p>
              </div>
            </div>
          </section>

          {/* Payment Breakdown */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Today's Payment Channels</h2>
            <div className="grid grid-cols-3 gap-4">
              {paymentBreakdown.map(p => (
                <div key={p.mode} className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.mode}</p>
                  <p className="text-xl font-black text-slate-900">₹{p.total.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Month Summary */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">This Month Performance</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</p>
                <p className="text-2xl font-black text-emerald-600">₹{monthSales.toFixed(0)}</p>
                {monthGrowth && (
                  <p className={`text-[10px] font-bold ${parseFloat(monthGrowth) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {parseFloat(monthGrowth) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(monthGrowth))}% vs last month
                  </p>
                )}
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
                <p className="text-2xl font-black text-rose-600">₹{monthExpenses.toFixed(0)}</p>
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5 col-span-2 lg:col-span-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Operations (Rev − Exp)</p>
                <p className={`text-2xl font-black ${monthSales - monthExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{(monthSales - monthExpenses).toFixed(0)}
                </p>
              </div>
            </div>
          </section>

          {/* Customers */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Customer Performance</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Listings</p>
                <p className="text-2xl font-black text-slate-900">{totalCustomers}</p>
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New This Week</p>
                <p className="text-2xl font-black text-blue-600">{newCustomersWeek}</p>
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repeat Rate</p>
                <p className="text-2xl font-black text-indigo-600">{repeatCustomers}</p>
              </div>
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">One-time Visitors</p>
                <p className="text-2xl font-black text-slate-500">{totalCustomers - repeatCustomers}</p>
              </div>
            </div>
          </section>

          {/* Top Products */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Top Products (Last 30 Days)</h2>
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
              {topProducts.length === 0 && <p className="p-5 text-slate-400 text-xs font-semibold">No transactions recorded yet.</p>}
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex justify-between items-center p-4 hover:bg-slate-50/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5">#0{i + 1}</span>
                    <p className="font-extrabold text-sm text-slate-900 tracking-tight">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950">₹{p.revenue.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{p.qty} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Low Stock */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Inventory</h2>
              {editingThreshold ? (
                <input type="number" autoFocus value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  onBlur={saveThreshold}
                  onKeyDown={(e) => e.key === 'Enter' && saveThreshold()}
                  className="w-16 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs bg-white text-slate-900 text-center font-bold" />
              ) : (
                <button onClick={() => { setThresholdInput(String(threshold)); setEditingThreshold(true) }}
                  className="text-xs font-bold text-indigo-600 hover:underline">
                  Alert limit: {threshold} units
                </button>
              )}
            </div>
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
              {lowStockItems.length === 0 && <p className="p-5 text-slate-455 text-xs font-semibold">All products well stocked correctly. ✅</p>}
              {lowStockItems.map(p => (
                <div key={p.name} className="flex justify-between items-center p-4">
                  <p className="font-extrabold text-sm text-slate-900 tracking-tight">{p.name}</p>
                  <span className="text-xs font-bold bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-1 rounded-full uppercase">
                    {p.stock_quantity} remaining
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Dead Stock */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Dead Stock (No Sales in 30 Days)</h2>
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
              {deadStock.length === 0 && <p className="p-5 text-slate-455 text-xs font-semibold">All active catalog products are selling correctly. ✅</p>}
              {deadStock.map(p => (
                <div key={p.name} className="flex justify-between items-center p-4">
                  <p className="font-extrabold text-sm text-slate-900 tracking-tight">{p.name}</p>
                  <span className="text-xs font-bold text-slate-600">{p.stock_quantity} units sitting in stock</span>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-2 gap-4">
            <a href="/admin/pos" className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl text-center font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-600/15">
              Launch POS Register
            </a>
            <a href="/admin/products" className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-4 rounded-xl text-center font-bold text-sm active:scale-95 transition-all border border-slate-200/50">
              Manage Products Catalog
            </a>
          </section>
        </main>
      </div>
    </AdminOnly>
  )
}
