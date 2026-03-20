'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminOnly from '@/components/AdminOnly'

export default function ReconciliationPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [cashInHand, setCashInHand] = useState('')
  const [data, setData] = useState({
    cashSales: 0,
    upiSales: 0,
    cardSales: 0,
    totalExpenses: 0,
  })

  useEffect(() => { fetchData() }, [date])

  async function fetchData() {
    const start = `${date}T00:00:00`
    const end = `${date}T23:59:59`

    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, payment_mode')
      .gte('created_at', start)
      .lte('created_at', end)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('payment_mode', 'Cash')
      .gte('created_at', start)
      .lte('created_at', end)

    const cashSales = sales?.filter(s => s.payment_mode === 'Cash').reduce((sum, s) => sum + s.total_amount, 0) || 0
    const upiSales = sales?.filter(s => s.payment_mode === 'UPI').reduce((sum, s) => sum + s.total_amount, 0) || 0
    const cardSales = sales?.filter(s => s.payment_mode === 'Card').reduce((sum, s) => sum + s.total_amount, 0) || 0
    const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

    setData({ cashSales, upiSales, cardSales, totalExpenses })
  }

  const expectedCash = data.cashSales - data.totalExpenses
  const difference = cashInHand ? parseFloat(cashInHand) - expectedCash : null

  return (
    <AdminOnly>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
          <h1 className="text-2xl font-bold">Cash Reconciliation</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-base font-semibold text-gray-900 mb-1">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Cash Sales</p>
            <p className="text-2xl font-bold text-green-600">₹{data.cashSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">UPI Sales</p>
            <p className="text-2xl font-bold text-blue-600">₹{data.upiSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Card Sales</p>
            <p className="text-2xl font-bold text-purple-600">₹{data.cardSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Cash Expenses</p>
            <p className="text-2xl font-bold text-red-600">₹{data.totalExpenses.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Expected Cash in Hand</p>
          <p className="text-2xl font-bold text-gray-900">₹{expectedCash.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Cash Sales − Cash Expenses</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-base font-semibold text-gray-900 mb-1">Actual Cash in Hand</label>
          <input
            type="number"
            placeholder="Enter actual cash count"
            step="0.01"
            value={cashInHand}
            onChange={(e) => setCashInHand(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
          />
        </div>

        {difference !== null && (
          <div className={`p-4 rounded-lg shadow text-center ${difference === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-sm font-medium text-gray-700">Difference</p>
            <p className={`text-3xl font-bold ${difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {difference >= 0 ? '+' : ''}₹{difference.toFixed(2)}
            </p>
            <p className="text-sm mt-1 text-gray-600">
              {difference === 0 ? '✅ Balanced' : difference > 0 ? '⚠️ Cash over' : '⚠️ Cash short'}
            </p>
          </div>
        )}
      </main>
    </div>
    </AdminOnly>
  )
}
