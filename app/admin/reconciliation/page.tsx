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
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Cash Reconciliation</h1>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8 flex-1 max-w-2xl space-y-6">
          {/* Date Picker Card */}
          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Ledger Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          {/* Sales channels grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Sales</p>
              <p className="text-2xl font-black text-emerald-600">₹{data.cashSales.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UPI Sales</p>
              <p className="text-2xl font-black text-indigo-600">₹{data.upiSales.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card Sales</p>
              <p className="text-2xl font-black text-violet-600">₹{data.cardSales.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Expenses</p>
              <p className="text-2xl font-black text-rose-600">₹{data.totalExpenses.toFixed(2)}</p>
            </div>
          </div>

          {/* Calculations panel */}
          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Cash in Drawer</p>
              <p className="text-2xl font-black text-slate-900">₹{expectedCash.toFixed(2)}</p>
              <p className="text-[9px] text-slate-450 font-bold uppercase">Formula: Cash Sales − Cash Expenses</p>
            </div>
            <span className="text-2xl">🏦</span>
          </div>

          {/* Input field actual counts */}
          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Actual Cash in Drawer Count</label>
            <input
              type="number"
              placeholder="Enter physical cash amount (₹)"
              step="0.01"
              value={cashInHand}
              onChange={(e) => setCashInHand(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          {/* Reconciliation Difference banner */}
          {difference !== null && (
            <div className={`p-6 rounded-2xl border text-center space-y-1.5 shadow-sm transition-all duration-300 ${difference === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">Drawer Balance Difference</p>
              <p className={`text-3xl font-black ${difference === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {difference >= 0 ? '+' : ''}₹{difference.toFixed(2)}
              </p>
              <p className="text-xs font-extrabold uppercase tracking-wide">
                {difference === 0 ? '✅ Balanced Correctly' : difference > 0 ? '⚠️ Drawer Overbalance (Excess Cash)' : '⚠️ Drawer Shortage (Missing Cash)'}
              </p>
            </div>
          )}
        </main>
      </div>
    </AdminOnly>
  )
}
