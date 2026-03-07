'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { signOut, role } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const isAdmin = role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">BangStock Admin</h1>
            <p className="text-sm opacity-75 capitalize">{role ?? '...'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/admin/pos" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow active:scale-95">
            <h2 className="text-xl font-bold text-gray-900 mb-2">💳 POS</h2>
            <p className="text-gray-600">Process sales and payments</p>
          </a>

          <a href="/admin/products" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow active:scale-95">
            <h2 className="text-xl font-bold text-gray-900 mb-2">📦 Products</h2>
            <p className="text-gray-600">Manage inventory and stock</p>
          </a>

          <a href="/admin/customers" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow active:scale-95">
            <h2 className="text-xl font-bold text-gray-900 mb-2">👥 Customers</h2>
            <p className="text-gray-600">View customer database</p>
          </a>

          {isAdmin && (
            <>
              <a href="/admin/expenses" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow active:scale-95">
                <h2 className="text-xl font-bold text-gray-900 mb-2">💰 Expenses</h2>
                <p className="text-gray-600">Track business expenses</p>
              </a>

              <a href="/admin/reconciliation" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow active:scale-95">
                <h2 className="text-xl font-bold text-gray-900 mb-2">🧾 Cash Reconciliation</h2>
                <p className="text-gray-600">Daily cash matching</p>
              </a>

              <a href="/admin/dashboard" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow active:scale-95">
                <h2 className="text-xl font-bold text-gray-900 mb-2">📊 Dashboard</h2>
                <p className="text-gray-600">Sales reports and analytics</p>
              </a>

              <a href="/admin/staff" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow active:scale-95">
                <h2 className="text-xl font-bold text-gray-900 mb-2">🔑 Staff</h2>
                <p className="text-gray-600">Manage staff accounts</p>
              </a>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
