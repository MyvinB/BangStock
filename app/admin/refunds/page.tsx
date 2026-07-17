'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type SaleItem = {
  id: string; product_id: string; variant_id: string | null
  quantity: number; unit_price: number; refunded_qty: number
  product: { name: string } | null; variant: { color: string; size: string } | null
}
type Sale = {
  id: string; total_amount: number; payment_mode: string; created_at: string
  customer: { name: string; phone: string } | null; sale_items: SaleItem[]
}

export default function RefundsPage() {
  const [phone, setPhone] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [selected, setSelected] = useState<Sale | null>(null)
  const [refundQty, setRefundQty] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function searchSales() {
    if (!phone.trim()) return
    const { data: customer } = await supabase
      .from('customers').select('id').eq('phone', phone.trim()).maybeSingle()
    if (!customer) return setSales([])

    const { data } = await supabase
      .from('sales')
      .select('id, total_amount, payment_mode, created_at, customer:customers(name, phone), sale_items(id, product_id, variant_id, quantity, unit_price, product:products(name), variant:product_variants(color, size))')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch existing refunds for these sales
    const saleIds = data?.map(s => s.id) || []
    const { data: refunds } = saleIds.length > 0
      ? await supabase.from('refunds').select('sale_item_id, quantity').in('sale_id', saleIds)
      : { data: [] }

    const refundMap: Record<string, number> = {}
    refunds?.forEach(r => { refundMap[r.sale_item_id] = (refundMap[r.sale_item_id] || 0) + r.quantity })

    const enriched = data?.map(sale => ({
      ...sale,
      sale_items: sale.sale_items.map((item: any) => ({
        ...item,
        refunded_qty: refundMap[item.id] || 0,
      }))
    }))

    setSales((enriched as any) || [])
    setSelected(null)
    setRefundQty({})
  }

  function selectSale(sale: Sale) {
    setSelected(sale)
    setRefundQty({})
    setReason('')
  }

  const refundTotal = selected
    ? selected.sale_items.reduce((sum, item) => sum + (refundQty[item.id] || 0) * item.unit_price, 0)
    : 0

  const hasRefundItems = Object.values(refundQty).some(q => q > 0)

  async function processRefund() {
    if (!selected || !hasRefundItems) return
    setLoading(true)
    try {
      const inserts = selected.sale_items
        .filter(item => (refundQty[item.id] || 0) > 0)
        .map(item => ({
          sale_id: selected.id,
          sale_item_id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: refundQty[item.id],
          refund_amount: refundQty[item.id] * item.unit_price,
          reason: reason || null,
        }))

      const { error } = await supabase.from('refunds').insert(inserts)
      if (error) return alert('Refund failed: ' + error.message)

      alert(`Refund of ₹${refundTotal.toFixed(2)} processed! Stock restored.`)
      setSelected(null)
      setRefundQty({})
      setReason('')
      searchSales()
    } finally {
      setLoading(false)
    }
  }

  return (
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
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Refund Processing</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 flex-1 max-w-2xl space-y-6">
        <div className="flex gap-3">
          <input 
            type="tel" 
            placeholder="Search customer phone number..." 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchSales()}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-indigo-500 text-sm placeholder-slate-400 text-slate-900" 
          />
          <button 
            onClick={searchSales}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-600/15"
          >
            Search
          </button>
        </div>

        {sales.length > 0 && !selected && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              Sales Records for {sales[0]?.customer?.name || phone}
            </h2>
            <div className="space-y-3">
              {sales.map(sale => {
                const allRefunded = sale.sale_items.every(i => i.refunded_qty >= i.quantity)
                return (
                  <button 
                    key={sale.id} 
                    onClick={() => !allRefunded && selectSale(sale)}
                    disabled={allRefunded}
                    className={`w-full bg-white border border-slate-200/60 p-5 rounded-2xl text-left active:scale-[0.99] transition-all shadow-sm ${allRefunded ? 'opacity-40 cursor-not-allowed bg-transparent' : 'hover:border-slate-350 hover:shadow-md'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="font-extrabold text-base text-slate-950">₹{sale.total_amount}</p>
                        <p className="text-xs text-slate-500 font-semibold">{sale.payment_mode} · {sale.sale_items.length} unique items</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        {allRefunded && (
                          <span className="inline-block text-[9px] font-extrabold bg-red-55/60 text-red-600 border border-red-100/50 px-2 py-0.5 rounded-full uppercase">
                            Fully Refunded
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {sales.length === 0 && phone && (
          <div className="text-center py-12 text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200/50">
            <span className="text-3xl block">🔍</span>
            <p className="text-sm font-semibold">No sales found for this customer record</p>
          </div>
        )}

        {selected && (
          <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Select Items to Refund</h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Sale on {new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {selected.payment_mode} · ₹{selected.total_amount}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-indigo-600 hover:underline font-bold">
                ← Back to List
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {selected.sale_items.map(item => {
                const remaining = item.quantity - item.refunded_qty
                return (
                  <div key={item.id} className={`flex justify-between items-center py-4 ${remaining === 0 ? 'opacity-40' : ''}`}>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-slate-900 leading-tight">{(item.product as any)?.name}</p>
                      {item.variant && (
                        <span className="inline-flex text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full uppercase">
                          {(item.variant as any)?.color} / {(item.variant as any)?.size}
                        </span>
                      )}
                      <p className="text-xs text-slate-500">
                        ₹{item.unit_price} × {item.quantity} purchased
                        {item.refunded_qty > 0 && <span className="text-red-500 font-bold ml-1"> ({item.refunded_qty} already refunded)</span>}
                      </p>
                    </div>
                    {remaining > 0 && (
                      <div className="flex items-center gap-2.5">
                        <button 
                          onClick={() => setRefundQty(p => ({ ...p, [item.id]: Math.max((p[item.id] || 0) - 1, 0) }))}
                          className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center font-bold active:scale-90 transition-all border border-slate-200/50"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-slate-800">{refundQty[item.id] || 0}</span>
                        <button 
                          onClick={() => setRefundQty(p => ({ ...p, [item.id]: Math.min((p[item.id] || 0) + 1, remaining) }))}
                          className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center font-bold active:scale-90 transition-all border border-slate-200/50"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <textarea 
              placeholder="Provide a reason for processing this refund (optional)..." 
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900 placeholder-slate-400" 
              rows={2} 
            />

            {hasRefundItems && (
              <div className="py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Refund Amount</span>
                <span className="text-2xl font-black tracking-tight text-rose-600">₹{refundTotal.toFixed(2)}</span>
              </div>
            )}

            <button 
              onClick={processRefund} 
              disabled={!hasRefundItems || loading}
              className="w-full bg-red-650 hover:bg-red-600 text-white py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-red-600/15"
            >
              {loading ? 'Processing Refund...' : 'Confirm & Process Refund'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
