'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Customer = { id: string; name: string; phone: string; created_at: string }
type SaleItem = { id: string; quantity: number; unit_price: number; product: { name: string } | null; variant: { color: string; size: string } | null; refunded_qty: number }
type Sale = { id: string; total_amount: number; payment_mode: string; created_at: string; sale_items: SaleItem[] }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Sale[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    if (data) setCustomers(data)
  }

  async function toggleOrders(customerId: string) {
    if (expandedId === customerId) { setExpandedId(null); return }
    setExpandedId(customerId)
    setLoadingOrders(true)
    const { data } = await supabase
      .from('sales')
      .select('id, total_amount, payment_mode, created_at, sale_items(id, quantity, unit_price, product:products(name), variant:product_variants(color, size))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch refunds for these sales
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

    setOrders((enriched as any) || [])
    setLoadingOrders(false)
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

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
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Customers Database</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 flex-1 max-w-3xl">
        <input 
          type="text" 
          placeholder="Search by customer name or phone number..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-indigo-500 text-sm mb-6 shadow-sm placeholder-slate-400" 
        />

        <div className="space-y-4">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-300">
              <button 
                onClick={() => toggleOrders(customer.id)}
                className="w-full p-5 text-left active:scale-[0.99] transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-slate-900 tracking-tight">{customer.name}</h3>
                    <p className="text-xs text-slate-600 font-medium">📞 {customer.phone}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Joined {new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className="text-slate-400 font-semibold text-sm bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-colors">
                    {expandedId === customer.id ? 'Hide Orders ▲' : 'View Orders ▼'}
                  </span>
                </div>
              </button>

              {expandedId === customer.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order History</h4>
                  {loadingOrders ? (
                    <p className="text-slate-400 text-xs py-3 font-semibold">Loading history logs...</p>
                  ) : orders.length === 0 ? (
                    <p className="text-slate-400 text-xs py-3 font-semibold">No transactions recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 bg-white border border-slate-200/50 rounded-xl overflow-hidden">
                      {orders.map(sale => (
                        <div key={sale.id} className="p-4 hover:bg-slate-50/20 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-extrabold text-sm text-slate-950">₹{sale.total_amount}</p>
                            <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">
                              {sale.payment_mode} · {new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {sale.sale_items.map((item, i) => (
                              <p key={i} className={`text-xs ${item.refunded_qty >= item.quantity ? 'text-red-400 line-through' : 'text-slate-600 font-medium'}`}>
                                📦 {(item.product as any)?.name}
                                {item.variant && <span className="text-indigo-500 font-semibold"> · {(item.variant as any)?.color}/{(item.variant as any)?.size}</span>}
                                {' '}× <span className="font-bold text-slate-800">{item.quantity}</span> — ₹{(item.unit_price * item.quantity).toFixed(0)}
                                {item.refunded_qty > 0 && item.refunded_qty < item.quantity && (
                                  <span className="text-red-500 font-bold ml-1"> ({item.refunded_qty} refunded)</span>
                                )}
                                {item.refunded_qty >= item.quantity && (
                                  <span className="text-red-500 font-bold ml-1"> (refunded)</span>
                                )}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
