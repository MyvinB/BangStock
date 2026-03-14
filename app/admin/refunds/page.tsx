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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
          <h1 className="text-2xl font-bold">Refunds</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-2">
          <input type="tel" placeholder="Customer Phone" value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchSales()}
            className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3" />
          <button onClick={searchSales}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium active:scale-95">
            Search
          </button>
        </div>

        {sales.length > 0 && !selected && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Sales for {sales[0]?.customer?.name || phone}</h2>
            {sales.map(sale => {
              const allRefunded = sale.sale_items.every(i => i.refunded_qty >= i.quantity)
              return (
                <button key={sale.id} onClick={() => !allRefunded && selectSale(sale)}
                  disabled={allRefunded}
                  className={`w-full bg-white p-4 rounded-lg shadow text-left active:scale-95 ${allRefunded ? 'opacity-50' : 'hover:shadow-md'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">₹{sale.total_amount}</p>
                      <p className="text-sm text-gray-500">{sale.payment_mode} · {sale.sale_items.length} item(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      {allRefunded && <p className="text-xs text-red-500 font-medium">Fully Refunded</p>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {sales.length === 0 && phone && (
          <p className="text-gray-500 text-center py-8">No sales found for this phone number</p>
        )}

        {selected && (
          <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Select Items to Refund</h2>
              <button onClick={() => setSelected(null)} className="text-sm text-indigo-600 underline">← Back to sales</button>
            </div>
            <p className="text-sm text-gray-500">
              Sale on {new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {selected.payment_mode} · ₹{selected.total_amount}
            </p>

            <div className="divide-y">
              {selected.sale_items.map(item => {
                const remaining = item.quantity - item.refunded_qty
                return (
                  <div key={item.id} className={`flex justify-between items-center py-3 ${remaining === 0 ? 'opacity-40' : ''}`}>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{(item.product as any)?.name}</p>
                      {item.variant && <p className="text-xs text-indigo-600">{(item.variant as any)?.color} / {(item.variant as any)?.size}</p>}
                      <p className="text-sm text-gray-500">
                        ₹{item.unit_price} × {item.quantity} purchased
                        {item.refunded_qty > 0 && <span className="text-red-500"> ({item.refunded_qty} already refunded)</span>}
                      </p>
                    </div>
                    {remaining > 0 && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setRefundQty(p => ({ ...p, [item.id]: Math.max((p[item.id] || 0) - 1, 0) }))}
                          className="w-8 h-8 bg-gray-200 rounded active:scale-95">-</button>
                        <span className="w-8 text-center font-bold">{refundQty[item.id] || 0}</span>
                        <button onClick={() => setRefundQty(p => ({ ...p, [item.id]: Math.min((p[item.id] || 0) + 1, remaining) }))}
                          className="w-8 h-8 bg-gray-200 rounded active:scale-95">+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <textarea placeholder="Reason for refund (optional)" value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm" rows={2} />

            {hasRefundItems && (
              <div className="text-2xl font-bold text-center text-red-600 py-2">
                Refund: ₹{refundTotal.toFixed(2)}
              </div>
            )}

            <button onClick={processRefund} disabled={!hasRefundItems || loading}
              className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg active:scale-95 disabled:opacity-50">
              {loading ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
