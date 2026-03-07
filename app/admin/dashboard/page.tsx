'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminOnly from '@/components/AdminOnly'

type DashboardData = {
  todaySales: number
  todayOrders: number
  totalCustomers: number
  lowStockCount: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    todaySales: 0,
    todayOrders: 0,
    totalCustomers: 0,
    lowStockCount: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const today = new Date().toISOString().split('T')[0]

    // Today's sales
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', today)

    const todaySales = sales?.reduce((sum, s) => sum + parseFloat(s.total_amount.toString()), 0) || 0
    const todayOrders = sales?.length || 0

    // Total customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })

    // Low stock products
    const { count: lowStock } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('stock_quantity', 5)

    setData({
      todaySales,
      todayOrders,
      totalCustomers: customerCount || 0,
      lowStockCount: lowStock || 0,
    })
  }

  return (
    <AdminOnly>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Today's Sales</p>
            <p className="text-3xl font-bold text-green-600">₹{data.todaySales.toFixed(2)}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Today's Orders</p>
            <p className="text-3xl font-bold text-blue-600">{data.todayOrders}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Customers</p>
            <p className="text-3xl font-bold text-purple-600">{data.totalCustomers}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Low Stock Items</p>
            <p className="text-3xl font-bold text-red-600">{data.lowStockCount}</p>
          </div>
        </div>

        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <a href="/admin/pos" className="bg-indigo-600 text-white p-4 rounded-lg text-center font-medium active:scale-95">
              New Sale
            </a>
            <a href="/admin/products" className="bg-gray-200 text-gray-700 p-4 rounded-lg text-center font-medium active:scale-95">
              Manage Products
            </a>
          </div>
        </div>
      </main>
    </div>
    </AdminOnly>
  )
}
