'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">BangStock</h1>
        <p className="text-gray-600 text-center mb-8">Admin Login</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-500"
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              placeholder="admin@bangstock.com"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-900 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-500"
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 active:scale-95"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-indigo-600 hover:underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
