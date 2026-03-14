'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminOnly from '@/components/AdminOnly'

type MonthStats = { label: string; count: number; total: number }
type StaffMember = { id: string; email: string; role: string; months: MonthStats[] }

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('staff')
  const [error, setError] = useState('')

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function fetchStaff() {
    const token = await getToken()
    const res = await fetch('/api/staff', { headers: { authorization: `Bearer ${token}` } })
    const data = await res.json()

    const yearAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString()
    const { data: sales } = await supabase.from('sales').select('staff_id, total_amount, created_at').gte('created_at', yearAgo)

    const statsMap: Record<string, Record<string, { count: number; total: number }>> = {}
    sales?.forEach(s => {
      if (!s.staff_id) return
      const d = new Date(s.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!statsMap[s.staff_id]) statsMap[s.staff_id] = {}
      if (!statsMap[s.staff_id][key]) statsMap[s.staff_id][key] = { count: 0, total: 0 }
      statsMap[s.staff_id][key].count++
      statsMap[s.staff_id][key].total += s.total_amount
    })

    // Build last 12 months labels
    const monthKeys: { key: string; label: string }[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
      monthKeys.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      })
    }

    setStaff(data.map((m: any) => ({
      ...m,
      months: monthKeys.map(mk => ({
        label: mk.label,
        count: statsMap[m.id]?.[mk.key]?.count || 0,
        total: statsMap[m.id]?.[mk.key]?.total || 0,
      })),
    })))
  }

  useEffect(() => { fetchStaff() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const token = await getToken()
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, password, role }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); return }
    setEmail(''); setPassword(''); setRole('staff'); setShowForm(false)
    fetchStaff()
  }

  async function handleDelete(id: string, memberEmail: string) {
    if (!confirm(`Remove ${memberEmail}?`)) return
    const token = await getToken()
    await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    fetchStaff()
  }

  return (
    <AdminOnly>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-indigo-600 text-white sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
              <h1 className="text-2xl font-bold">Staff Management</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium active:scale-95"
            >
              {showForm ? 'Cancel' : '+ Add Staff'}
            </button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          {showForm && (
            <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow-md mb-6 space-y-3">
              <input
                type="email"
                placeholder="Email *"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
              />
              <input
                type="password"
                placeholder="Password *"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium active:scale-95">
                Create Account
              </button>
            </form>
          )}

          <div className="space-y-3">
            {staff.map((member) => (
              <div key={member.id} className="bg-white rounded-lg shadow">
                <div className="p-4 flex justify-between items-center">
                  <button onClick={() => setExpandedId(expandedId === member.id ? null : member.id)} className="flex-1 text-left">
                    <p className="font-bold text-gray-900">{member.email}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                      {member.role}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {member.months[0]?.label}: {member.months[0]?.count} sales · ₹{member.months[0]?.total.toFixed(0)}
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{expandedId === member.id ? '▲' : '▼'}</span>
                    <button
                      onClick={() => handleDelete(member.id, member.email!)}
                      className="text-red-600 px-2 py-2 active:scale-95"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {expandedId === member.id && (
                  <div className="border-t px-4 pb-4">
                    <div className="divide-y">
                      {member.months.map(m => (
                        <div key={m.label} className="flex justify-between py-2">
                          <span className="text-sm text-gray-600">{m.label}</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {m.count} sales · ₹{m.total.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </AdminOnly>
  )
}
