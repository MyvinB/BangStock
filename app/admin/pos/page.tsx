'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string
  name: string
  selling_price: number
  stock_quantity: number
  image_url: string | null
}

type CartItem = {
  product: Product
  quantity: number
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>('Cash')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, selling_price, stock_quantity, image_url')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
    if (data) setProducts(data)
  }

  function addToCart(product: Product) {
    const existing = cart.find(item => item.product.id === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ))
    }
  }

  const total = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0)

  async function completeSale() {
    if (cart.length === 0) return alert('Cart is empty')
    if (!customerPhone) return alert('Enter customer phone')

    // Get or create customer
    let customerId = null
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert([{ name: customerName || 'Guest', phone: customerPhone }])
        .select('id')
        .single()
      if (customerError) return alert('Failed to create customer: ' + customerError.message)
      customerId = newCustomer?.id
    }

    // Create sale
    const { data: sale } = await supabase
      .from('sales')
      .insert([{
        customer_id: customerId,
        total_amount: total,
        payment_mode: paymentMode,
      }])
      .select('id')
      .single()

    if (sale) {
      // Add sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
      }))

      await supabase.from('sale_items').insert(saleItems)

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
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 mb-4 text-lg"
            />
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full bg-white p-4 rounded-lg shadow text-left hover:shadow-md active:scale-95"
                >
                  <div className="flex gap-3 items-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">📦</div>
                    )}
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{product.name}</h3>
                        <p className="text-sm text-gray-600">Stock: {product.stock_quantity}</p>
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
                    <div key={item.product.id} className="flex justify-between items-center border-b pb-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-600">₹{item.product.selling_price} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-200 rounded active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-200 rounded active:scale-95"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="ml-2 text-red-600 active:scale-95"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <input
                    type="tel"
                    placeholder="Customer Phone *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border rounded-lg px-4 py-3 text-lg"
                  />
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border rounded-lg px-4 py-3 text-lg"
                  />
                  
                  <div className="flex gap-2">
                    {(['Cash', 'UPI', 'Card'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPaymentMode(mode)}
                        className={`flex-1 py-3 rounded-lg font-medium ${
                          paymentMode === mode
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="text-2xl font-bold text-center py-4">
                    Total: ₹{total.toFixed(2)}
                  </div>

                  <button
                    onClick={completeSale}
                    className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg active:scale-95"
                  >
                    Complete Sale
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
