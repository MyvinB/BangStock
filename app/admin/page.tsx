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

  const links = [
    {
      href: "/admin/pos",
      title: "POS Checkout",
      desc: "Process custom discount checkouts and cash/UPI sales",
      icon: (
        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      color: "from-indigo-500/10 to-blue-500/5",
      badge: "Staff"
    },
    {
      href: "/admin/products",
      title: "Products & Stock",
      desc: "Manage product sizes, custom colors, and QR code print sizes",
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "from-blue-500/10 to-indigo-500/5",
      badge: "Staff"
    },
    {
      href: "/admin/refunds",
      title: "Refund Entries",
      desc: "Process sales returns and adjust stock quantities",
      icon: (
        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-6a4 4 0 00-8 0v6M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: "from-amber-500/10 to-orange-500/5",
      badge: "Staff"
    },
    {
      href: "/admin/customers",
      title: "Customers Database",
      desc: "View store customers and contact histories",
      icon: (
        <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "from-sky-500/10 to-blue-500/5",
      badge: "Staff"
    }
  ]

  const adminLinks = [
    {
      href: "/admin/dashboard",
      title: "Business Dashboard",
      desc: "Review daily sales metrics, charts, and product velocities",
      icon: (
        <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "from-violet-500/10 to-indigo-500/5",
      badge: "Admin"
    },
    {
      href: "/admin/expenses",
      title: "Expense Log",
      desc: "Record overhead fees, bills, and local maintenance costs",
      icon: (
        <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8c1.657 0 3 .895 3 2s-1.343 2-3 2-3-.895-3-2 1.343-2 3-2" />
        </svg>
      ),
      color: "from-rose-500/10 to-orange-500/5",
      badge: "Admin"
    },
    {
      href: "/admin/reconciliation",
      title: "Cash Reconciliation",
      desc: "Perform end-of-day drawer balances and mismatch reports",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-emerald-500/10 to-teal-500/5",
      badge: "Admin"
    },
    {
      href: "/admin/staff",
      title: "Staff Accounts",
      desc: "Manage personnel logins and set administrative privileges",
      icon: (
        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m-5-2a2 2 0 012 2M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
      ),
      color: "from-purple-500/10 to-violet-500/5",
      badge: "Admin"
    }
  ]

  const activeLinks = [...links, ...(isAdmin ? adminLinks : [])]

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Premium Glassmorphic Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/80">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="space-y-0.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              BangStock Admin
            </h1>
            <p className="text-xs text-slate-500 font-medium capitalize flex items-center gap-1.5">
              <span>👤</span> {role ?? 'Staff Account'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all duration-200 shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid Options */}
      <main className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {activeLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative bg-white border border-slate-200/70 p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-300 flex items-start gap-5 cursor-pointer"
            >
              {/* Styled Icon Container */}
              <div className={`p-3 rounded-xl bg-gradient-to-br ${link.color} flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                {link.icon}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-950 group-hover:text-indigo-600 transition-colors">
                    {link.title}
                  </h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${link.badge === 'Admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                    {link.badge}
                  </span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed pr-2">
                  {link.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
