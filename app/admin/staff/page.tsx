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
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Staff Management</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-lg shadow-indigo-600/15"
            >
              {showForm ? 'Cancel' : '+ Add Staff'}
            </button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8 flex-1 max-w-3xl">
          {showForm && (
            <form onSubmit={handleAdd} className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xl mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">Password</label>
                  <input
                    type="password"
                    placeholder="Password *"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
                  />
                </div>
                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Access Role Privilege</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
                  >
                    <option value="staff">Staff Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-red-600 text-xs font-bold">⚠️ {error}</p>}
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/15">
                Create Account
              </button>
            </form>
          )}

          <div className="space-y-4">
            {staff.map((member) => (
              <div key={member.id} className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-300">
                <div className="p-5 flex justify-between items-center gap-4">
                  <button onClick={() => setExpandedId(expandedId === member.id ? null : member.id)} className="flex-1 text-left space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-base text-slate-900 tracking-tight leading-tight">{member.email}</p>
                      <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${member.role === 'admin' ? 'bg-indigo-50 border-indigo-150 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                      {member.months[0]?.label}: <span className="font-bold text-slate-700">{member.months[0]?.count} sales</span> · <span className="text-indigo-600 font-bold">₹{member.months[0]?.total.toFixed(0)}</span>
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-semibold text-sm bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}>
                      {expandedId === member.id ? 'Hide Performance ▲' : 'View Performance ▼'}
                    </span>
                    <button
                      onClick={() => handleDelete(member.id, member.email!)}
                      className="text-xs font-semibold text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {expandedId === member.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Performance Ledger (Last 12 Months)</h4>
                    <div className="divide-y divide-slate-100 bg-white border border-slate-200/50 rounded-xl overflow-hidden">
                      {member.months.map(m => (
                        <div key={m.label} className="flex justify-between py-3 px-4 hover:bg-slate-50/20 transition-colors">
                          <span className="text-xs text-slate-500 font-semibold">{m.label}</span>
                          <span className="text-xs text-slate-900 font-bold">
                            {m.count} sales · <span className="text-indigo-600">₹{m.total.toFixed(0)}</span>
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
