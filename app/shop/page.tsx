'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string
  name: string
  selling_price: number
  stock_quantity: number
  image_url: string | null
  category: string | null
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProducts(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">BangStock Shop</h1>
          <p className="text-gray-600">Live Inventory</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-4">No products available</p>
            <p className="text-sm text-gray-400">Add products via Admin panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-200 flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400">No image</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                  {product.category && (
                    <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                  )}
                  <p className="text-lg font-bold text-indigo-600">₹{product.selling_price}</p>
                  <p className="text-sm text-gray-500 mt-1">{product.stock_quantity} in stock</p>
                  <button
                    onClick={() => window.open(`https://wa.me/YOUR_PHONE?text=I'm interested in ${product.name}`, '_blank')}
                    className="mt-3 w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors font-medium active:scale-95 touch-manipulation"
                  >
                    Inquire on WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
