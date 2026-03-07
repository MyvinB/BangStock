export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">BangStock</h1>
          <p className="text-xl text-gray-600">Retail Control System</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <a
            href="/shop"
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-3">🛍️ Shop</h2>
            <p className="text-gray-600">Browse our latest collection and check live inventory</p>
          </a>

          <a
            href="/admin"
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-3">🔐 Admin</h2>
            <p className="text-gray-600">POS, inventory management, and dashboard</p>
          </a>
        </div>

        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Next.js + Supabase • Deployed on Vercel</p>
        </div>
      </div>
    </div>
  )
}
