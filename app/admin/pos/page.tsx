'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { BrowserQRCodeReader } from '@zxing/browser'
import type { Product, Variant, CartItem, PaymentMode } from '@/types'
import { PAYMENT_MODES } from '@/lib/constants'

export default function POSPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash')
  const [customTotal, setCustomTotal] = useState('')

  async function onPhoneChange(phone: string) {
    setCustomerPhone(phone)
    if (phone.length >= 10) {
      const { data } = await supabase.from('customers').select('name').eq('phone', phone).maybeSingle()
      if (data) setCustomerName(data.name)
    }
  }
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [variantPicker, setVariantPicker] = useState<Product | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<any>(null)
  const processedRef = useRef(false)

  const [threshold, setThreshold] = useState(5)

  useEffect(() => {
    fetchProducts();
    const saved = parseInt(localStorage?.getItem('bangstock_low_stock_threshold') ?? '5');
    setThreshold(saved);
  }, [])

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, selling_price, stock_quantity, image_url, product_variants(*)')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
    if (data) setProducts(data as any)
  }

  function cartKey(productId: string, variantId?: string) {
    return variantId ? `${productId}-${variantId}` : productId
  }

  function addToCart(product: Product, variant: Variant | null) {
    const key = cartKey(product.id, variant?.id)
    setCart(prev => {
      const existing = prev.find(i => i.key === key)
      if (existing) return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { key, product, variant, quantity: 1 }]
    })
  }

  function handleProductClick(product: Product) {
    if (product.product_variants?.length > 0) {
      setVariantPicker(product)
    } else {
      addToCart(product, null)
    }
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) setCart(prev => prev.filter(i => i.key !== key))
    else setCart(prev => prev.map(i => i.key === key ? { ...i, quantity } : i))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0)
  const enteredTotal = customTotal !== '' ? parseFloat(customTotal) : subtotal
  const total = customTotal !== '' ? Math.max(0, Math.min(enteredTotal, subtotal)) : subtotal
  const discountAmt = subtotal - total
  const discountPct = subtotal > 0 ? (discountAmt / subtotal) * 100 : 0

  async function startScan() {
    processedRef.current = false
    setScanning(true)
    setTimeout(async () => {
      const reader = new BrowserQRCodeReader()
      scannerRef.current = reader
      try {
        await reader.decodeFromVideoDevice(undefined, videoRef.current!, async (result) => {
          if (!result || processedRef.current || scannerRef.current !== reader) return
          processedRef.current = true
          const scannedSku = result.getText()
          stopScan()

          const { data: variant } = await supabase
            .from('product_variants')
            .select('*, products(*)')
            .eq('sku', scannedSku)
            .maybeSingle()

          if (variant) {
            addToCart(variant.products as any, variant as any)
          } else {
            const { data: product } = await supabase
              .from('products')
              .select('*, product_variants(*)')
              .eq('sku', scannedSku)
              .maybeSingle()
            if (product) handleProductClick(product as any)
            else alert('Product not found for SKU: ' + scannedSku)
          }
        })
      } catch (err) {
        alert('Camera error. Please allow camera access.')
        setScanning(false)
      }
    }, 100)
  }

  function stopScan() {
    try { scannerRef.current?.reset?.() } catch {}
    scannerRef.current = null
    setScanning(false)
  }

  async function completeSale() {
    if (cart.length === 0) return alert('Cart is empty')
    if (!customerPhone) return alert('Enter customer phone')

    const { data: existingCustomer } = await supabase
      .from('customers').select('id').eq('phone', customerPhone).maybeSingle()

    let customerId = existingCustomer?.id
    if (!customerId) {
      const { data: newCustomer, error } = await supabase
        .from('customers').insert([{ name: customerName || 'Guest', phone: customerPhone }]).select('id').single()
      if (error) return alert('Failed to create customer: ' + error.message)
      customerId = newCustomer?.id
    }

    const { data: sale } = await supabase
      .from('sales').insert([{ customer_id: customerId, total_amount: total, discount_percent: discountPct, payment_mode: paymentMode, staff_id: user?.id }]).select('id').single()

    if (sale) {
      await supabase.from('sale_items').insert(cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
      })))
      alert('Sale completed!')
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setCustomTotal('')
      fetchProducts()
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesName = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesVariant = p.product_variants?.some(v => 
      (v.color?.toLowerCase() || '').includes(search.toLowerCase()) || 
      (v.size?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (v.sku?.toLowerCase() || '').includes(search.toLowerCase())
    );
    return matchesName || matchesVariant;
  })

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 relative overflow-hidden flex flex-col">
      {/* Decorative Radial Glowing Backdrops */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Sticky Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/80">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <a href="/admin" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mb-0.5">
              <span>←</span> Back to Operations
            </a>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Point of Sale</h1>
          </div>
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
            📠 Drawer Connected
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 flex-1">
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Products Pane */}
          <div className="space-y-6">
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Search products..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border border-slate-200 bg-white text-slate-900 placeholder-slate-450 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500" 
              />
              <button 
                onClick={scanning ? stopScan : startScan}
                className={`px-6 py-3 rounded-xl font-semibold active:scale-95 transition-all duration-200 flex items-center gap-1.5 shadow-lg ${scanning ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15'}`}
              >
                {scanning ? '✕ Stop' : '📷 Scan'}
              </button>
            </div>

            {/* QR Scanner */}
            {scanning && (
              <div className="rounded-xl overflow-hidden border border-indigo-500/20 bg-white relative shadow-xl">
                <video ref={videoRef} className="w-full animate-pulse" />
                <div className="absolute inset-0 border-[3px] border-indigo-500/10 pointer-events-none rounded-xl" />
                <p className="text-center text-xs text-slate-500 py-3 bg-slate-50 border-t border-slate-100">
                  Point camera at QR code label
                </p>
              </div>
            )}

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {filteredProducts.map((product) => (
                <button 
                  key={product.id} 
                  onClick={() => handleProductClick(product)}
                  className="w-full bg-white border border-slate-200/60 hover:border-slate-350 hover:bg-slate-50/30 p-4 rounded-xl text-left hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 shadow-sm"
                >
                  <div className="flex gap-4 items-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0 border border-slate-100" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">📦</div>
                    )}
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-slate-900 tracking-tight">{product.name}</h3>
                          {product.stock_quantity <= threshold && (
                            <span className="text-[9px] font-extrabold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full uppercase select-none">
                              Low Stock ({product.stock_quantity})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Stock: <span className="font-semibold text-slate-700">{product.stock_quantity}</span>
                          {product.product_variants?.length > 0 && (
                            <>
                              <span className="mx-1.5 opacity-30">•</span>
                              <span>{product.product_variants.length} variations</span>
                            </>
                          )}
                        </p>
                      </div>
                      <p className="text-lg font-black text-indigo-600">₹{product.selling_price}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart Pane */}
          <div className="space-y-6">
            {/* Mobile Sticky Tab button */}
            {cart.length > 0 && (
              <button 
                onClick={() => {
                  const el = document.getElementById('pos-cart')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="lg:hidden fixed bottom-6 right-6 z-30 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-full shadow-2xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-indigo-600/20"
              >
                🛒 {cart.reduce((s, i) => s + i.quantity, 0)} items · ₹{total.toFixed(0)}
              </button>
            )}

            <div id="pos-cart" className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xl lg:sticky lg:top-24 h-fit space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Shopping Cart</h2>
                <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                  {cart.length} unique items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <span className="text-3xl block">🛒</span>
                  <p className="text-sm font-semibold">No items added to sale yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.key} className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div className="flex-1 space-y-1 pr-4">
                          <p className="font-semibold text-slate-900 leading-tight">{item.product.name}</p>
                          {item.variant && (
                            <span className="inline-flex text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full uppercase">
                              {item.variant.color} / {item.variant.size}
                            </span>
                          )}
                          <p className="text-xs text-slate-500">₹{item.product.selling_price} each</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center font-bold active:scale-90 transition-all border border-slate-200/50"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-sm text-slate-800">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center font-bold active:scale-90 transition-all border border-slate-200/50"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => updateQuantity(item.key, 0)}
                            className="ml-1 text-slate-400 hover:text-red-500 transition-colors p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex">
                        <span className="border border-slate-200 border-r-0 bg-slate-50 text-slate-500 rounded-l-xl px-3.5 flex items-center text-sm font-semibold select-none">
                          +91
                        </span>
                        <input 
                          type="tel" 
                          placeholder="Phone *" 
                          value={customerPhone}
                          onChange={(e) => onPhoneChange(e.target.value)}
                          className="flex-1 border border-slate-200 rounded-r-xl px-4 py-3 bg-white focus:outline-none focus:border-indigo-500 text-sm text-slate-900" 
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Customer Name (optional)" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-indigo-500 text-sm text-slate-900" 
                      />
                    </div>

                    <div className="flex gap-2">
                      {PAYMENT_MODES.map((mode) => (
                        <button 
                          key={mode} 
                          onClick={() => setPaymentMode(mode)}
                          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${paymentMode === mode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-slate-100 text-slate-700 border border-slate-200/50 hover:bg-slate-200'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2.5">
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Original Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>

                      {/* Quick Discount Shortcuts */}
                      <div className="flex gap-2 flex-wrap mb-3.5">
                        <button type="button" onClick={() => setCustomTotal((subtotal * 0.95).toFixed(2))}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold border border-slate-200/50">
                          5% Off
                        </button>
                        <button type="button" onClick={() => setCustomTotal((subtotal * 0.90).toFixed(2))}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold border border-slate-200/50">
                          10% Off
                        </button>
                        <button type="button" onClick={() => setCustomTotal(Math.max(0, subtotal - 100).toFixed(2))}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold border border-slate-200/50">
                          ₹100 Off
                        </button>
                        <button type="button" onClick={() => setCustomTotal(Math.max(0, subtotal - 500).toFixed(2))}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold border border-slate-200/50">
                          ₹500 Off
                        </button>
                        {customTotal !== '' && (
                          <button type="button" onClick={() => setCustomTotal('')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-2.5 py-1.5 rounded-lg font-bold border border-rose-100/50">
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          placeholder="Custom checkout total amount (₹)" 
                          min="0" 
                          max={subtotal} 
                          value={customTotal}
                          onChange={(e) => setCustomTotal(e.target.value)}
                          className="flex-1 border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-indigo-500 text-sm text-slate-900" 
                        />
                        {discountAmt > 0 && (
                          <div className="text-right whitespace-nowrap">
                            <span className="block text-[10px] text-red-500 font-bold">-{discountPct.toFixed(1)}% OFF</span>
                            <span className="text-xs text-red-500 font-semibold">-₹{discountAmt.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="py-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Final Amount</span>
                      <span className="text-2xl font-black tracking-tight text-emerald-600">₹{total.toFixed(2)}</span>
                    </div>

                    <button 
                      onClick={completeSale}
                      className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all shadow-lg shadow-green-600/15"
                    >
                      Complete & Print Receipt
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Variant Picker Modal */}
      {variantPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center z-50 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-t-2xl p-6 w-full max-w-lg space-y-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg tracking-tight text-slate-900">{variantPicker.name}</h3>
              <p className="text-xs text-slate-500">Select size and color dimension</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {variantPicker.product_variants.map(v => (
                <button 
                  key={v.id}
                  disabled={v.stock_quantity === 0}
                  onClick={() => { addToCart(variantPicker, v); setVariantPicker(null) }}
                  className={`p-4 rounded-xl border text-left active:scale-[0.98] transition-all duration-200 flex flex-col justify-between h-20 ${v.stock_quantity === 0 ? 'opacity-30 cursor-not-allowed bg-transparent border-slate-100' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50'}`}
                >
                  <p className="font-bold text-slate-800 text-sm uppercase tracking-wider">{v.color} / {v.size}</p>
                  <p className="text-xs text-slate-500 font-semibold">{v.stock_quantity} units available</p>
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setVariantPicker(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all border border-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
