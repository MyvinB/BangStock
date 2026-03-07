'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string
  sku: string
  name: string
  category: string | null
  cost_price: number
  selling_price: number
  stock_quantity: number
  image_url: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProducts(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('products').insert([{
      sku: formData.sku,
      name: formData.name,
      category: formData.category || null,
      cost_price: parseFloat(formData.cost_price),
      selling_price: parseFloat(formData.selling_price),
      stock_quantity: parseInt(formData.stock_quantity),
    }])

    if (!error) {
      setFormData({ sku: '', name: '', category: '', cost_price: '', selling_price: '', stock_quantity: '' })
      setShowForm(false)
      fetchProducts()
    }
  }

  async function deleteProduct(id: string) {
    if (confirm('Delete this product?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
            <h1 className="text-2xl font-bold">Products</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium active:scale-95"
          >
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="SKU *"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg"
              />
              <input
                type="text"
                placeholder="Product Name *"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg"
              />
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg"
              />
              <input
                type="number"
                placeholder="Cost Price *"
                required
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg"
              />
              <input
                type="number"
                placeholder="Selling Price *"
                required
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg"
              />
              <input
                type="number"
                placeholder="Stock Quantity *"
                required
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg"
              />
            </div>
            <button
              type="submit"
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium active:scale-95"
            >
              Add Product
            </button>
          </form>
        )}

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{product.name}</h3>
                <p className="text-sm text-gray-600">SKU: {product.sku} | Stock: {product.stock_quantity}</p>
                <p className="text-sm text-gray-600">Cost: ₹{product.cost_price} | Sell: ₹{product.selling_price}</p>
              </div>
              <button
                onClick={() => deleteProduct(product.id)}
                className="text-red-600 px-4 py-2 active:scale-95"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
