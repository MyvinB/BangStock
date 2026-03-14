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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
          <h1 className="text-2xl font-bold">Customers</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <input type="text" placeholder="Search by name or phone..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 mb-4" />

        <div className="space-y-3">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white rounded-lg shadow">
              <button onClick={() => toggleOrders(customer.id)}
                className="w-full p-4 text-left active:scale-[0.99]">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{customer.name}</h3>
                    <p className="text-gray-600">{customer.phone}</p>
                    <p className="text-sm text-gray-400">Joined {new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className="text-gray-400 text-xl">{expandedId === customer.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandedId === customer.id && (
                <div className="border-t px-4 pb-4">
                  {loadingOrders ? (
                    <p className="text-gray-400 text-sm py-3">Loading orders...</p>
                  ) : orders.length === 0 ? (
                    <p className="text-gray-400 text-sm py-3">No orders yet</p>
                  ) : (
                    <div className="divide-y">
                      {orders.map(sale => (
                        <div key={sale.id} className="py-3">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-bold text-gray-900">₹{sale.total_amount}</p>
                            <p className="text-xs text-gray-400">
                              {sale.payment_mode} · {new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            {sale.sale_items.map((item, i) => (
                              <p key={i} className={`text-sm ${item.refunded_qty >= item.quantity ? 'text-red-400 line-through' : 'text-gray-600'}`}>
                                {(item.product as any)?.name}
                                {item.variant && <span className="text-indigo-500"> · {(item.variant as any)?.color}/{(item.variant as any)?.size}</span>}
                                {' '}× {item.quantity} — ₹{(item.unit_price * item.quantity).toFixed(0)}
                                {item.refunded_qty > 0 && item.refunded_qty < item.quantity && (
                                  <span className="text-red-500"> ({item.refunded_qty} refunded)</span>
                                )}
                                {item.refunded_qty >= item.quantity && (
                                  <span className="text-red-500"> (refunded)</span>
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
