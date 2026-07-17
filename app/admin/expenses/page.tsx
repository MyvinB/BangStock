'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Expense, Product } from '@/types'

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
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Expenses Log</h1>
          </div>
          <button
            onClick={() => { if (showForm) resetForm(); else setShowForm(true) }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-lg shadow-indigo-600/15"
          >
            {showForm ? 'Cancel' : '+ Add Expense'}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 flex-1 max-w-3xl">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xl mb-6 space-y-4">
            {editingExpense && (
              <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg w-fit">
                Editing expense logs
              </p>
            )}

            {/* Inventory Picker */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <button type="button" onClick={() => setShowProductPicker(!showProductPicker)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                {showProductPicker ? 'Hide inventory list ▲' : '📦 Add costs from inventory list'}
              </button>
              {showProductPicker && (
                <div className="border border-slate-200 rounded-xl p-2.5 max-h-48 overflow-y-auto space-y-1 bg-slate-50/50">
                  {products.map(p => (
                    <button type="button" key={p.id} onClick={() => addProductToExpense(p.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 flex justify-between items-center text-xs text-slate-700 font-medium">
                      <span>{p.name}</span>
                      <span className="text-slate-500 font-semibold">₹{p.cost_price}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedProducts.map(sp => {
                    const prod = products.find(p => p.id === sp.productId)
                    return prod ? (
                      <span key={sp.productId} className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-semibold">
                        {prod.name} x{sp.qty} (₹{(prod.cost_price * sp.qty).toFixed(0)})
                        <button type="button" onClick={() => removeProductFromExpense(sp.productId)} className="text-red-500 hover:text-red-600 ml-1">✕</button>
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Description</label>
                <input type="text" placeholder="Description *" required value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Amount (₹)</label>
                <input type="number" placeholder="Amount *" required step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Category (optional)</label>
                <input type="text" placeholder="Category (optional)" value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Expense Date</label>
                <input type="date" required value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Payment Mode</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900">
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 ml-1">Receipt / Bill Image</label>
              {existingImage && !imagePreview && (
                <div className="relative inline-block mb-2 rounded-xl overflow-hidden border border-slate-200">
                  <img src={existingImage} className="h-20 w-20 object-cover" />
                  <button type="button" onClick={() => setExistingImage(null)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                </div>
              )}
              {imagePreview && (
                <div className="relative inline-block mb-2 rounded-xl overflow-hidden border border-slate-200">
                  <img src={imagePreview} className="h-20 w-20 object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
              }} className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none file:bg-slate-100 file:border-0 file:text-slate-800 file:px-3 file:py-1 file:rounded-lg file:mr-4 file:text-xs file:font-semibold" />
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/15">
              {editingExpense ? 'Save Expense Details' : 'Register New Expense'}
            </button>
          </form>
        )}

        {/* Total stats panel */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between mb-6">
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Business Expenses</p>
            <p className="text-3xl font-black text-rose-600">₹{total.toFixed(2)}</p>
          </div>
          <span className="text-3xl">💸</span>
        </div>

        {/* List items block */}
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-300 p-5 flex justify-between items-center gap-4">
              <div className="flex gap-4 items-center">
                {expense.image_url ? (
                  <img src={expense.image_url} className="w-14 h-14 object-cover rounded-xl border border-slate-100 flex-shrink-0 cursor-pointer hover:opacity-80"
                    onClick={() => window.open(expense.image_url!, '_blank')} />
                ) : (
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">📄</div>
                )}
                <div className="space-y-1">
                  <p className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">{expense.description}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {expense.category && <span className="text-slate-500 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-full mr-2">{expense.category}</span>}
                    {expense.payment_mode || 'Cash'} · {new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-base font-black text-rose-600">₹{expense.amount.toFixed(2)}</p>
                <div className="flex items-center gap-2">
                  {isAdmin && <button onClick={() => startEdit(expense)} className="text-xs font-semibold text-indigo-600 hover:underline">Edit</button>}
                  {isAdmin && <button
                    onClick={async () => {
                      if (!confirm('Delete this expense?')) return
                      await supabase.from('expenses').delete().eq('id', expense.id)
                      fetchExpenses()
                    }}
                    className="text-slate-400 hover:text-red-500 font-bold p-1 transition-colors text-sm"
                  >
                    ✕
                  </button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
