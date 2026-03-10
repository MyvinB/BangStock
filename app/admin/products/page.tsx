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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingStock, setEditingStock] = useState<{ id: string; value: string } | null>(null)
  const [formData, setFormData] = useState({
    sku: '', name: '', category: '', cost_price: '', selling_price: '', stock_quantity: '',
  })

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (data) setProducts(data)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { alert('Upload failed: ' + error.message); return null }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)

    let image_url = null
    if (imageFile) image_url = await uploadImage(imageFile)

    const { error } = await supabase.from('products').insert([{
      sku: formData.sku,
      name: formData.name,
      category: formData.category || null,
      cost_price: parseFloat(formData.cost_price),
      selling_price: parseFloat(formData.selling_price),
      stock_quantity: parseInt(formData.stock_quantity),
      image_url,
    }])

    setUploading(false)
    if (!error) {
      setFormData({ sku: '', name: '', category: '', cost_price: '', selling_price: '', stock_quantity: '' })
      setImageFile(null)
      setImagePreview(null)
      setShowForm(false)
      fetchProducts()
    }
  }

  async function saveStock(id: string, value: string) {
    const qty = parseInt(value)
    if (isNaN(qty) || qty < 0) return
    await supabase.from('products').update({ stock_quantity: qty }).eq('id', id)
    setEditingStock(null)
    fetchProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error?.code === '23503') {
      // Has sales history — soft delete instead
      await supabase.from('products').update({ is_active: false }).eq('id', id)
    }
    fetchProducts()
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
              <input type="text" placeholder="SKU *" required value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg" />
              <input type="text" placeholder="Product Name *" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg" />
              <input type="text" placeholder="Category" value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg" />
              <input type="number" placeholder="Cost Price *" required step="0.01" value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg" />
              <input type="number" placeholder="Selling Price *" required step="0.01" value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg" />
              <input type="number" placeholder="Stock Quantity *" required value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="border rounded-lg px-4 py-3 text-lg" />
            </div>

            {/* Image Upload */}
            <div className="mt-4">
              <label className="block text-base font-semibold text-gray-900 mb-2">Product Image</label>
              <input type="file" accept="image/*" onChange={handleImageChange}
                className="w-full border rounded-lg px-4 py-3" />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-3 h-32 w-32 object-cover rounded-lg border" />
              )}
            </div>

            <button type="submit" disabled={uploading}
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium active:scale-95 disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Add Product'}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white p-4 rounded-lg shadow flex gap-4 items-center">
              <label className="cursor-pointer flex-shrink-0 relative group">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-2xl">📦</div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium">
                  Upload
                </div>
                <input type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const url = await uploadImage(file)
                    if (!url) return
                    const { error } = await supabase.from('products').update({ image_url: url }).eq('id', product.id)
                    if (error) { alert('Save failed: ' + error.message); return }
                    fetchProducts()
                  }}
                />
              </label>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{product.name}</h3>
                <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">Stock:</span>
                  {editingStock?.id === product.id ? (
                    <input
                      type="number"
                      autoFocus
                      value={editingStock.value}
                      onChange={(e) => setEditingStock({ id: product.id, value: e.target.value })}
                      onBlur={() => saveStock(product.id, editingStock.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveStock(product.id, editingStock.value)}
                      className="w-20 border-2 border-indigo-400 rounded px-2 py-0.5 text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingStock({ id: product.id, value: String(product.stock_quantity) })}
                      className="text-sm font-medium text-indigo-600 underline underline-offset-2"
                    >
                      {product.stock_quantity}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600">Cost: ₹{product.cost_price} | Sell: ₹{product.selling_price}</p>
              </div>
              <button onClick={() => deleteProduct(product.id)} className="text-red-600 px-4 py-2 active:scale-95">
                Delete
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
