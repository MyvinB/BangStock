export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 text-slate-900 relative overflow-hidden flex flex-col justify-between">
      {/* Decorative Radial Glowing Backdrops */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header / Grid Lines overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-6 py-20 relative z-10 my-auto">
        <div className="text-center mb-16 max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm">
            ✨ Next-Gen Retail Control
          </div>
          <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent pb-1">
            BangStock
          </h1>
          <p className="text-lg text-slate-600">
            An ultra-fast POS, live inventory tracker, and customer storefront crafted for premium retail operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Shop Card */}
          <a
            href="/shop"
            className="group relative bg-white/70 backdrop-blur-xl border border-slate-200/60 p-8 rounded-2xl shadow-xl hover:border-indigo-500/30 hover:bg-white hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-64"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-950 group-hover:text-indigo-600 transition-colors">Client Storefront</h2>
                <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                  Browse catalog listings, review color/size dimensions, and check live stock levels in real time.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mt-4 group-hover:translate-x-1.5 transition-transform duration-300">
              Open Shop <span>→</span>
            </div>
          </a>

          {/* Admin Card */}
          <a
            href="/admin"
            className="group relative bg-white/70 backdrop-blur-xl border border-slate-200/60 p-8 rounded-2xl shadow-xl hover:border-indigo-500/30 hover:bg-white hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-64"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-950 group-hover:text-indigo-600 transition-colors">Operations Console</h2>
                <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                  Launch the POS interface, manage product sizes, track daily store expenses, and reconcile transactions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mt-4 group-hover:translate-x-1.5 transition-transform duration-300">
              Access Admin <span>→</span>
            </div>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 bg-white/40 backdrop-blur-md">
        <p>Next.js + Supabase • Built for Retail Operations</p>
      </footer>
    </div>
  )
}
