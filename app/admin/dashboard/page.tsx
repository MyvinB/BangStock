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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* Today Summary */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Today</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{todaySales.toFixed(0)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Orders</p>
              <p className="text-2xl font-bold text-blue-600">{todayOrders}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Gross Profit</p>
              <p className="text-2xl font-bold text-indigo-600">₹{todayProfit.toFixed(0)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">New Customers</p>
              <p className="text-2xl font-bold text-purple-600">{newCustomersToday}</p>
            </div>
          </div>
        </section>

        {/* Payment Breakdown */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Today's Payment Breakdown</h2>
          <div className="grid grid-cols-3 gap-3">
            {paymentBreakdown.map(p => (
              <div key={p.mode} className="bg-white p-4 rounded-lg shadow text-center">
                <p className="text-gray-500 text-xs">{p.mode}</p>
                <p className="text-xl font-bold text-gray-900">₹{p.total.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Month Summary */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">This Month</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{monthSales.toFixed(0)}</p>
              {monthGrowth && (
                <p className={`text-xs mt-1 ${parseFloat(monthGrowth) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(monthGrowth) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(monthGrowth))}% vs last month
                </p>
              )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Expenses</p>
              <p className="text-2xl font-bold text-red-600">₹{monthExpenses.toFixed(0)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Net (Revenue − Expenses)</p>
              <p className={`text-2xl font-bold ${monthSales - monthExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{(monthSales - monthExpenses).toFixed(0)}
              </p>
            </div>
          </div>
        </section>

        {/* Customers */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Customers</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">New This Week</p>
              <p className="text-2xl font-bold text-blue-600">{newCustomersWeek}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">Repeat Customers</p>
              <p className="text-2xl font-bold text-indigo-600">{repeatCustomers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-500 text-xs">One-time Customers</p>
              <p className="text-2xl font-bold text-gray-600">{totalCustomers - repeatCustomers}</p>
            </div>
          </div>
        </section>

        {/* Top Products */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Top Products (Last 30 Days)</h2>
          <div className="bg-white rounded-lg shadow divide-y">
            {topProducts.length === 0 && <p className="p-4 text-gray-500 text-sm">No sales data yet</p>}
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex justify-between items-center px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-5">{i + 1}</span>
                  <p className="font-medium text-gray-900">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹{p.revenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">{p.qty} sold</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Low Stock */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Low Stock</h2>
            {editingThreshold ? (
              <input type="number" autoFocus value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                onBlur={saveThreshold}
                onKeyDown={(e) => e.key === 'Enter' && saveThreshold()}
                className="w-16 border-2 border-indigo-400 rounded px-2 py-0.5 text-sm text-gray-900" />
            ) : (
              <button onClick={() => { setThresholdInput(String(threshold)); setEditingThreshold(true) }}
                className="text-xs text-indigo-600 underline">threshold: {threshold}</button>
            )}
          </div>
          <div className="bg-white rounded-lg shadow divide-y">
            {lowStockItems.length === 0 && <p className="p-4 text-gray-500 text-sm">All products well stocked ✅</p>}
            {lowStockItems.map(p => (
              <div key={p.name} className="flex justify-between items-center px-4 py-3">
                <p className="font-medium text-gray-900">{p.name}</p>
                <span className="text-sm font-bold text-red-600">{p.stock_quantity} left</span>
              </div>
            ))}
          </div>
        </section>

        {/* Dead Stock */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Dead Stock (No Sales in 30 Days)</h2>
          <div className="bg-white rounded-lg shadow divide-y">
            {deadStock.length === 0 && <p className="p-4 text-gray-500 text-sm">All products are selling ✅</p>}
            {deadStock.map(p => (
              <div key={p.name} className="flex justify-between items-center px-4 py-3">
                <p className="font-medium text-gray-900">{p.name}</p>
                <span className="text-sm text-gray-500">{p.stock_quantity} in stock</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <a href="/admin/pos" className="bg-indigo-600 text-white p-4 rounded-lg text-center font-medium active:scale-95">
              New Sale
            </a>
            <a href="/admin/products" className="bg-gray-200 text-gray-700 p-4 rounded-lg text-center font-medium active:scale-95">
              Manage Products
            </a>
          </div>
        </section>

      </main>
    </div>
    </AdminOnly>
  )
}
