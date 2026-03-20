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
  created_at: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { fetchExpenses() }, [])

  async function fetchExpenses() {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingExpense) {
      const { error } = await supabase.from('expenses').update({
        description, amount: parseFloat(amount), category: category || null,
        payment_mode: paymentMode, created_at: new Date(expenseDate).toISOString(),
      }).eq('id', editingExpense.id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase.from('expenses').insert([{
        description, amount: parseFloat(amount), category: category || null,
        payment_mode: paymentMode, created_at: new Date(expenseDate).toISOString(),
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
    setShowForm(true)
  }

  function resetForm() {
    setEditingExpense(null)
    setDescription(''); setAmount(''); setCategory('')
    setPaymentMode('Cash')
    setExpenseDate(new Date().toISOString().split('T')[0])
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
            <input
              type="text"
              placeholder="Description *"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
            />
            <input
              type="number"
              placeholder="Amount *"
              required
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
            />
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
            />
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
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
              <div>
                <p className="font-bold text-gray-900">{expense.description}</p>
                {expense.category && <p className="text-sm text-gray-500">{expense.category}</p>}
                <p className="text-sm text-gray-500">{new Date(expense.created_at).toLocaleDateString()} · {expense.payment_mode || 'Cash'}</p>
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
