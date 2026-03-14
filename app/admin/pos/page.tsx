'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { BrowserQRCodeReader } from '@zxing/browser'

type Variant = { id: string; size: string; color: string; stock_quantity: number; sku: string }

type Product = {
  id: string
  name: string
  selling_price: number
  stock_quantity: number
  image_url: string | null
  product_variants: Variant[]
}

type CartItem = {
  key: string
  product: Product
  variant: Variant | null
  quantity: number
}

export default function POSPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>('Cash')

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

  useEffect(() => { fetchProducts() }, [])

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

  const total = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0)

  async function startScan() {
    processedRef.current = false
    setScanning(true)
    // Wait for video element to mount
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
      .from('sales').insert([{ customer_id: customerId, total_amount: total, payment_mode: paymentMode, staff_id: user?.id }]).select('id').single()

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
      fetchProducts()
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
          <h1 className="text-2xl font-bold">Point of Sale</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Products */}
          <div>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Search products..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3" />
              <button onClick={scanning ? stopScan : startScan}
                className={`px-4 py-3 rounded-lg font-medium active:scale-95 ${scanning ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}>
                {scanning ? '✕ Stop' : '📷 Scan'}
              </button>
            </div>

            {/* QR Scanner */}
            {scanning && (
              <div className="mb-4 rounded-lg overflow-hidden border-2 border-indigo-400">
                <video ref={videoRef} className="w-full" />
                <p className="text-center text-sm text-gray-500 py-2">Point camera at QR code</p>
              </div>
            )}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredProducts.map((product) => (
                <button key={product.id} onClick={() => handleProductClick(product)}
                  className="w-full bg-white p-4 rounded-lg shadow text-left hover:shadow-md active:scale-95">
                  <div className="flex gap-3 items-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">📦</div>
                    )}
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500">
                          Stock: {product.stock_quantity}
                          {product.product_variants?.length > 0 && ` · ${product.product_variants.length} variants`}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-indigo-600">₹{product.selling_price}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white p-6 rounded-lg shadow-lg sticky top-24 h-fit">
            <h2 className="text-xl font-bold mb-4">Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.key} className="flex justify-between items-center border-b pb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-xs text-indigo-600">{item.variant.color} / {item.variant.size}</p>
                        )}
                        <p className="text-sm text-gray-500">₹{item.product.selling_price} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-200 rounded active:scale-95">-</button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-200 rounded active:scale-95">+</button>
                        <button onClick={() => updateQuantity(item.key, 0)}
                          className="ml-2 text-red-500 active:scale-95">✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex gap-2">
                    <span className="border-2 border-gray-300 rounded-lg px-3 py-3 bg-gray-100 text-gray-600">+91</span>
                    <input type="tel" placeholder="Customer Phone *" value={customerPhone}
                      onChange={(e) => onPhoneChange(e.target.value)}
                      className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3" />
                  </div>
                  <input type="text" placeholder="Customer Name (optional)" value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3" />
                  <div className="flex gap-2">
                    {(['Cash', 'UPI', 'Card'] as const).map((mode) => (
                      <button key={mode} onClick={() => setPaymentMode(mode)}
                        className={`flex-1 py-3 rounded-lg font-medium ${paymentMode === mode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="text-2xl font-bold text-center py-4">Total: ₹{total.toFixed(2)}</div>
                  <button onClick={completeSale}
                    className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg active:scale-95">
                    Complete Sale
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Variant Picker Modal */}
      {variantPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-lg">
            <h3 className="font-bold text-lg text-gray-900 mb-4">{variantPicker.name} — Select Variant</h3>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {variantPicker.product_variants.map(v => (
                <button key={v.id}
                  disabled={v.stock_quantity === 0}
                  onClick={() => { addToCart(variantPicker, v); setVariantPicker(null) }}
                  className={`p-3 rounded-lg border-2 text-left active:scale-95 ${v.stock_quantity === 0 ? 'opacity-40 cursor-not-allowed border-gray-200' : 'border-indigo-200 hover:border-indigo-500'}`}>
                  <p className="font-medium text-gray-900">{v.color} / {v.size}</p>
                  <p className="text-xs text-gray-500">{v.stock_quantity} in stock</p>
                </button>
              ))}
            </div>
            <button onClick={() => setVariantPicker(null)}
              className="mt-4 w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium active:scale-95">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
