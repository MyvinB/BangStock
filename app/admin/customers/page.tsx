'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Customer = {
  id: string
  name: string
  phone: string
  created_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCustomers(data)
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
          <h1 className="text-2xl font-bold">Customers</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-4 py-3 mb-4 text-lg"
        />

        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold text-lg">{customer.name}</h3>
              <p className="text-gray-600">{customer.phone}</p>
              <p className="text-sm text-gray-500">
                Joined: {new Date(customer.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
