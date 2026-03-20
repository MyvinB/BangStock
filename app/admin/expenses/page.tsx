'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

type Expense = {
  id: string
  description: string
  amount: number
  category: string | null
  payment_mode: string
  image_url: string | null
  created_at: string
}

type Product = {
  id: string
  name: string
  cost_price: number
  product_variants: { id: string; color: string; size: string; stock_quantity: number }[]
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string; qty: number }[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)

  useEffect(() => { fetchExpenses(); fetchProducts() }, [])

  async function fetchExpenses() {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, cost_price, product_variants(id, color, size, stock_quantity)').eq('is_active', true)
    if (data) setProducts(data as any)
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `expenses/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { alert('Upload failed: ' + error.message); return null }
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
  }

  function updateInventoryAmount() {
    const total = selectedProducts.reduce((sum, sp) => {
      const prod = products.find(p => p.id === sp.productId)
      return sum + (prod ? prod.cost_price * sp.qty : 0)
    }, 0)
    setAmount(total > 0 ? String(total) : '')
    const names = selectedProducts.map(sp => {
      const prod = products.find(p => p.id === sp.productId)
      return prod ? `${prod.name} x${sp.qty}` : ''
    }).filter(Boolean).join(', ')
    if (names) setDescription('Inventory: ' + names)
  }

  function addProductToExpense(productId: string) {
    setSelectedProducts(prev => {
      const exists = prev.find(sp => sp.productId === productId)
      const updated = exists
        ? prev.map(sp => sp.productId === productId ? { ...sp, qty: sp.qty + 1 } : sp)
        : [...prev, { productId, qty: 1 }]
      setTimeout(() => {
        const total = updated.reduce((sum, sp) => {
          const prod = products.find(p => p.id === sp.productId)
          return sum + (prod ? prod.cost_price * sp.qty : 0)
        }, 0)
        setAmount(total > 0 ? String(total) : '')
        const names = updated.map(sp => {
          const prod = products.find(p => p.id === sp.productId)
          return prod ? `${prod.name} x${sp.qty}` : ''
        }).filter(Boolean).join(', ')
        if (names) setDescription('Inventory: ' + names)
        setCategory('Inventory')
      }, 0)
      return updated
    })
  }

  function removeProductFromExpense(productId: string) {
    setSelectedProducts(prev => {
      const updated = prev.filter(sp => sp.productId !== productId)
      setTimeout(() => {
        const total = updated.reduce((sum, sp) => {
          const prod = products.find(p => p.id === sp.productId)
          return sum + (prod ? prod.cost_price * sp.qty : 0)
        }, 0)
        setAmount(total > 0 ? String(total) : '')
        if (updated.length === 0) { setDescription(''); setCategory('') }
        else {
          const names = updated.map(sp => {
            const prod = products.find(p => p.id === sp.productId)
            return prod ? `${prod.name} x${sp.qty}` : ''
          }).filter(Boolean).join(', ')
          setDescription('Inventory: ' + names)
        }
      }, 0)
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let imageUrl = existingImage
    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (url) imageUrl = url
    }

    if (editingExpense) {
      const { error } = await supabase.from('expenses').update({
        description, amount: parseFloat(amount), category: category || null,
        payment_mode: paymentMode, created_at: new Date(expenseDate).toISOString(),
        image_url: imageUrl,
      }).eq('id', editingExpense.id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase.from('expenses').insert([{
        description, amount: parseFloat(amount), category: category || null,
        payment_mode: paymentMode, created_at: new Date(expenseDate).toISOString(),
        image_url: imageUrl,
      }])
      if (error) { alert(error.message); return }
    }
    resetForm()
    fetchExpenses()
  }

  function startEdit(expense: Expense) {
    setEditingExpense(expense)
    setDescription(expense.description)
    setAmount(String(expense.amount))
    setCategory(expense.category || '')
    setPaymentMode(expense.payment_mode || 'Cash')
    setExpenseDate(new Date(expense.created_at).toISOString().split('T')[0])
    setExistingImage(expense.image_url)
    setImageFile(null)
    setImagePreview(null)
    setSelectedProducts([])
    setShowForm(true)
  }

  function resetForm() {
    setEditingExpense(null)
    setDescription(''); setAmount(''); setCategory('')
    setPaymentMode('Cash')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setImageFile(null); setImagePreview(null); setExistingImage(null)
    setSelectedProducts([])
    setShowForm(false)
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
            <h1 className="text-2xl font-bold">Expenses</h1>
          </div>
          <button
            onClick={() => { if (showForm) resetForm(); else setShowForm(true) }}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium active:scale-95"
          >
            {showForm ? 'Cancel' : '+ Add Expense'}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6 space-y-3">
            {editingExpense && (
              <p className="text-sm text-indigo-600 font-medium">Editing expense</p>
            )}

            {/* Inventory Picker */}
            <div>
              <button type="button" onClick={() => setShowProductPicker(!showProductPicker)}
                className="text-sm text-indigo-600 font-medium mb-2">
                {showProductPicker ? 'Hide Inventory ▲' : '📦 Add from Inventory'}
              </button>
              {showProductPicker && (
                <div className="border-2 border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                  {products.map(p => (
                    <button type="button" key={p.id} onClick={() => addProductToExpense(p.id)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-indigo-50 flex justify-between items-center text-sm">
                      <span>{p.name}</span>
                      <span className="text-gray-500">₹{p.cost_price}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedProducts.map(sp => {
                    const prod = products.find(p => p.id === sp.productId)
                    return prod ? (
                      <span key={sp.productId} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {prod.name} x{sp.qty} (₹{(prod.cost_price * sp.qty).toFixed(0)})
                        <button type="button" onClick={() => removeProductFromExpense(sp.productId)} className="text-red-500 ml-1">✕</button>
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>

            <input type="text" placeholder="Description *" required value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3" />
            <input type="number" placeholder="Amount *" required step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3" />
            <input type="text" placeholder="Category (optional)" value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3" />
            <input type="date" required value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3" />
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt / Bill Image</label>
              {existingImage && !imagePreview && (
                <div className="relative inline-block mb-2">
                  <img src={existingImage} className="h-20 w-20 object-cover rounded-lg border" />
                  <button type="button" onClick={() => setExistingImage(null)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                </div>
              )}
              {imagePreview && (
                <div className="relative inline-block mb-2">
                  <img src={imagePreview} className="h-20 w-20 object-cover rounded-lg border" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
              }} className="w-full border-2 border-gray-300 rounded-lg px-4 py-3" />
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium active:scale-95">
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </button>
          </form>
        )}

        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <p className="text-gray-600 text-sm">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600">₹{total.toFixed(2)}</p>
        </div>

        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
              <div className="flex gap-3 items-center">
                {expense.image_url && (
                  <img src={expense.image_url} className="w-12 h-12 object-cover rounded-lg border flex-shrink-0 cursor-pointer"
                    onClick={() => window.open(expense.image_url!, '_blank')} />
                )}
                <div>
                  <p className="font-bold text-gray-900">{expense.description}</p>
                  {expense.category && <p className="text-sm text-gray-500">{expense.category}</p>}
                  <p className="text-sm text-gray-500">{new Date(expense.created_at).toLocaleDateString()} · {expense.payment_mode || 'Cash'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-red-600">₹{expense.amount.toFixed(2)}</p>
                {isAdmin && <button onClick={() => startEdit(expense)} className="text-indigo-600 text-sm">Edit</button>}
                {isAdmin && <button
                  onClick={async () => {
                    if (!confirm('Delete this expense?')) return
                    await supabase.from('expenses').delete().eq('id', expense.id)
                    fetchExpenses()
                  }}
                  className="text-red-600 active:scale-95"
                >
                  ✕
                </button>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
