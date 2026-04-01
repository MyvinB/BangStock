'use client'

import { useEffect, useState } from 'react'
import { fetchActiveProductsInStock } from '@/lib/api'
import type { Product } from '@/types'

type Props = {
  stockType: 'regular' | 'deadstock'
  title: string
  subtitle: string
  accentColor: string // tailwind color like 'indigo' or 'orange'
  linkHref: string
  linkText: string
  whatsappSuffix?: string
}

export default function ProductGrid({ stockType, title, subtitle, accentColor, linkHref, linkText, whatsappSuffix = '' }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveProductsInStock(stockType)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [stockType])

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))]
  const filtered = category === 'All' ? products : products.filter(p => p.category === category)

  const availableSizes = (p: Product) => [...new Set(p.product_variants.filter(v => v.stock_quantity > 0).map(v => v.size))]
  const availableColors = (p: Product) => [...new Set(p.product_variants.filter(v => v.stock_quantity > 0).map(v => v.color))]

  const accent = accentColor
  const isDeal = stockType === 'deadstock'

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: title }} />
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <a href={linkHref} className={`text-sm text-${accent}-600 font-medium`}>{linkText}</a>
        </div>
        {categories.length > 1 && (
          <div className="container mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${category === c ? `bg-${accent}-600 text-white` : 'bg-gray-100 text-gray-600'}`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">{isDeal ? 'No clearance items right now' : 'No products available'}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <div key={product.id} onClick={() => { setSelectedProduct(product); setSelectedImage(product.image_url) }}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-95 relative">
                {isDeal && <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-[1]">DEAL</div>}
                <div className="aspect-square bg-gray-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
                  {product.category && <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>}
                  <p className={`text-base font-bold text-${accent}-600 mt-1`}>₹{product.selling_price}</p>
                  {availableSizes(product).length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {availableSizes(product).map(s => (
                        <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="aspect-square bg-gray-100 relative">
              <img src={selectedImage || selectedProduct.image_url || ''} alt={selectedProduct.name}
                className="w-full h-full object-cover" />
              <button onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-600">✕</button>
            </div>

            {selectedProduct.product_images?.length > 1 && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto">
                {selectedProduct.product_images.map((img, i) => (
                  <img key={i} src={img.url} onClick={() => setSelectedImage(img.url)}
                    className={`h-14 w-14 object-cover rounded-lg cursor-pointer flex-shrink-0 border-2 ${selectedImage === img.url ? `border-${accent}-500` : 'border-transparent'}`} />
                ))}
              </div>
            )}

            <div className="p-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
              {selectedProduct.category && <p className="text-sm text-gray-500">{selectedProduct.category}</p>}
              <p className={`text-2xl font-bold text-${accent}-600 mt-2`}>₹{selectedProduct.selling_price}</p>

              {availableColors(selectedProduct).length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Colors</p>
                  <div className="flex gap-2 flex-wrap">
                    {availableColors(selectedProduct).map(c => (
                      <span key={c} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {availableSizes(selectedProduct).length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Available Sizes</p>
                  <div className="flex gap-2 flex-wrap">
                    {availableSizes(selectedProduct).map(s => (
                      <span key={s} className="px-3 py-1 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <a href={`https://wa.me/918971170118?text=Hi! I'm interested in ${encodeURIComponent(selectedProduct.name)}${whatsappSuffix}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-4 w-full bg-green-500 text-white py-3 rounded-xl font-medium text-center block active:scale-95">
                💬 Inquire on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
