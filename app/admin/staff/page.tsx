'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminOnly from '@/components/AdminOnly'

type StaffMember = { id: string; email: string; role: string }

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
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
    setStaff(data)
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
              <div key={member.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{member.email}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {member.role}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(member.id, member.email!)}
                  className="text-red-600 px-4 py-2 active:scale-95"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </AdminOnly>
  )
}
