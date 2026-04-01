'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import { printLabel, connectPrinter, isWebUSBSupported } from '@/lib/thermal-print'
import type { Product, Variant, ProductImage } from '@/types'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Grey', 'Brown', 'Navy', 'Orange', 'Purple']

function generateVariantSku(base: string, color: string, size: string) {
  return `${base}-${color.substring(0, 3).toUpperCase()}-${size}`.replace(/\s/g, '')
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [printVariant, setPrintVariant] = useState<{ sku: string; name: string } | null>(null)
  const [bulkQR, setBulkQR] = useState<{ sku: string; name: string; qty: number }[]>([])
  const [editingStock, setEditingStock] = useState<{ id: string; value: string } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [customCategory, setCustomCategory] = useState(false)
  const [formData, setFormData] = useState({
    name: '', category: '', cost_price: '', selling_price: '', stock_type: 'regular',
  })

  async function generateSku(category: string) {
    const prefix = category ? category.substring(0, 3).toUpperCase().replace(/\s/g, '') : 'PRD'
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).ilike('sku', `${prefix}-%`)
    const next = String((count || 0) + 1).padStart(3, '0')
    const sku = `${prefix}-${next}`
    const { data: existing } = await supabase.from('products').select('id').eq('sku', sku).maybeSingle()
    return existing ? `${prefix}-${Date.now().toString().slice(-4)}` : sku
  }
  const [variants, setVariants] = useState<Variant[]>([{ size: 'M', color: 'Black', stock_quantity: 0, sku: '' }])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, product_variants(*), product_images(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) {
      setProducts(data as any)
      const cats = [...new Set((data as any[]).map(p => p.category).filter(Boolean))] as string[]
      setCategories(cats.sort())
    }
  }

  function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files])
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { alert('Upload failed: ' + error.message); return null }
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
  }

  function updateVariant(index: number, field: keyof Variant, value: string | number) {
    setVariants(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'size' || field === 'color') {
        updated[index].sku = generateVariantSku(formData.name || 'PRD', updated[index].color, updated[index].size)
      }
      return updated
    })
  }

  function addVariant() {
    setVariants(prev => [...prev, { size: 'M', color: 'Black', stock_quantity: 0, sku: '' }])
  }

  function removeVariant(index: number) {
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)

    // Upload images
    const uploadedUrls: string[] = []
    for (const file of imageFiles) {
      const url = await uploadImage(file)
      if (url) uploadedUrls.push(url)
    }

    // Insert product
    const sku = await generateSku(formData.category)
    const { data: product, error } = await supabase.from('products').insert([{
      sku,
      name: formData.name,
      category: formData.category || null,
      cost_price: parseFloat(formData.cost_price),
      selling_price: parseFloat(formData.selling_price),
      stock_quantity: variants.reduce((s, v) => s + v.stock_quantity, 0),
      image_url: uploadedUrls[0] || null,
      stock_type: formData.stock_type,
    }]).select('id').single()

    if (error) { alert(error.message); setUploading(false); return }

    // Insert variants
    if (variants.length > 0) {
      const variantRows = variants.map(v => ({
        product_id: product.id,
        sku: generateVariantSku(sku, v.color, v.size),
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity,
      }))
      await supabase.from('product_variants').insert(variantRows)
    }

    // Insert images
    if (uploadedUrls.length > 0) {
      await supabase.from('product_images').insert(uploadedUrls.map(url => ({ product_id: product.id, url })))
    }

    setUploading(false)
    resetForm()
    fetchProducts()
  }

  function startEdit(product: Product) {
    setEditingProduct(product)
    setCustomCategory(product.category ? !categories.includes(product.category) : false)
    setFormData({
      name: product.name,
      category: product.category || '',
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      stock_type: product.stock_type || 'regular',
    })
    setVariants(product.product_variants?.length > 0
      ? product.product_variants.map(({ id, ...v }) => ({ ...v }))
      : [{ size: 'M', color: 'Black', stock_quantity: 0, sku: '' }])
    setImageFiles([])
    setImagePreviews([])
    setExistingImages(product.product_images || [])
    setShowForm(true)
  }

  function resetForm() {
    setEditingProduct(null)
    setCustomCategory(false)
    setFormData({ name: '', category: '', cost_price: '', selling_price: '', stock_type: 'regular' })
    setVariants([{ size: 'M', color: 'Black', stock_quantity: 0, sku: '' }])
    setImageFiles([])
    setImagePreviews([])
    setExistingImages([])
    setShowForm(false)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProduct) return
    setUploading(true)

    // Upload new images
    const uploadedUrls: string[] = []
    for (const file of imageFiles) {
      const url = await uploadImage(file)
      if (url) uploadedUrls.push(url)
    }

    // Update product
    const { error } = await supabase.from('products').update({
      name: formData.name,
      category: formData.category || null,
      cost_price: parseFloat(formData.cost_price),
      selling_price: parseFloat(formData.selling_price),
      stock_quantity: variants.reduce((s, v) => s + v.stock_quantity, 0),
      stock_type: formData.stock_type,
      ...(uploadedUrls[0] ? { image_url: uploadedUrls[0] } : {}),
    }).eq('id', editingProduct.id)

    if (error) { alert(error.message); setUploading(false); return }

    // Delete old variants and re-insert
    await supabase.from('product_variants').delete().eq('product_id', editingProduct.id)
    if (variants.length > 0) {
      const { error: vErr } = await supabase.from('product_variants').insert(variants.map(v => ({
        product_id: editingProduct.id,
        sku: generateVariantSku(editingProduct.sku, v.color, v.size),
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity,
      })))
      if (vErr) { alert('Variants failed: ' + vErr.message) }
    }

    // Insert new images
    if (uploadedUrls.length > 0) {
      await supabase.from('product_images').insert(uploadedUrls.map(url => ({ product_id: editingProduct.id, url })))
    }

    setUploading(false)
    resetForm()
    fetchProducts()
  }

  async function duplicateProduct(product: Product) {
    const sku = await generateSku(product.category || '')
    const { data: newProd, error } = await supabase.from('products').insert([{
      sku,
      name: product.name + ' (Copy)',
      category: product.category,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      image_url: product.image_url,
      stock_type: product.stock_type || 'regular',
    }]).select('id').single()
    if (error || !newProd) { alert(error?.message || 'Failed'); return }
    if (product.product_variants?.length > 0) {
      const { error: vErr } = await supabase.from('product_variants').insert(product.product_variants.map(v => ({
        product_id: newProd.id,
        sku: generateVariantSku(sku, v.color, v.size),
        size: v.size, color: v.color, stock_quantity: v.stock_quantity,
      })))
      if (vErr) { alert('Variants failed: ' + vErr.message) }
    }
    if (product.product_images?.length > 0) {
      await supabase.from('product_images').insert(product.product_images.map(img => ({ product_id: newProd.id, url: img.url })))
    }
    fetchProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error?.code === '23503') await supabase.from('products').update({ is_active: false }).eq('id', id)
    fetchProducts()
  }

  async function saveVariantStock(variantId: string, value: string) {
    const qty = parseInt(value)
    if (isNaN(qty) || qty < 0) return
    await supabase.from('product_variants').update({ stock_quantity: qty }).eq('id', variantId)
    setEditingStock(null)
    fetchProducts()
  }

  function printQR() {
    if (!printVariant) return
    if (isWebUSBSupported()) {
      printLabel(printVariant.name, printVariant.sku).then(() => {
        setPrintVariant(null)
      }).catch(err => {
        alert('Print failed: ' + err.message + '. Falling back to browser print.')
        fallbackPrintQR()
      })
    } else {
      fallbackPrintQR()
    }
  }

  function fallbackPrintQR() {
    const canvas = printRef.current?.querySelector('canvas')
    if (!canvas) return
    const imgData = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    win?.document.write(`
      <html><head><title>Print QR</title>
      <style>
        @page { size: 45mm 25mm; margin: 0; }
        body { margin:0; padding:0; font-family:sans-serif; }
        .label { width:45mm; height:25mm; display:flex; align-items:center; padding:1.5mm 2mm; box-sizing:border-box; gap:2mm; }
        .label img { width:20mm; height:20mm; flex-shrink:0; }
        .label .info { flex:1; overflow:hidden; }
        .label .info p { margin:0; line-height:1.2; }
        .label .info .name { font-size:7pt; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .label .info .sku { font-size:6pt; color:#444; }
      </style></head>
      <body>
        <div class="label">
          <img src="${imgData}" />
          <div class="info">
            <p class="name">${printVariant?.name}</p>
            <p class="sku">${printVariant?.sku}</p>
          </div>
        </div>
        <script>window.onload=()=>window.print()<\/script>
      </body></html>
    `)
    win?.document.close()
  }

  function toggleBulkQR(sku: string, name: string, qty: number) {
    setBulkQR(prev => qty <= 0 ? prev.filter(q => q.sku !== sku) : prev.some(q => q.sku === sku) ? prev.map(q => q.sku === sku ? { ...q, qty } : q) : [...prev, { sku, name, qty }])
  }

  function printBulkQR() {
    if (isWebUSBSupported()) {
      (async () => {
        try {
          for (const item of bulkQR) {
            await printLabel(item.name, item.sku, item.qty)
          }
          setBulkQR([])
        } catch (err: any) {
          alert('Bulk print failed: ' + err.message + '. Falling back to browser print.')
          fallbackBulkPrintQR()
        }
      })()
    } else {
      fallbackBulkPrintQR()
    }
  }

  function fallbackBulkPrintQR() {
    const container = document.getElementById('bulk-qr-hidden')
    if (!container) return
    const canvases = container.querySelectorAll('canvas')
    const labels: string[] = []
    bulkQR.forEach((item, i) => {
      const imgData = canvases[i]?.toDataURL('image/png')
      for (let n = 0; n < item.qty; n++) {
        labels.push(`<div class="label"><img src="${imgData}"/><div class="info"><p class="name">${item.name}</p><p class="sku">${item.sku}</p></div></div>`)
      }
    })
    const win = window.open('', '_blank')
    win?.document.write(`<html><head><title>Bulk QR Print</title><style>
      @page { size: 45mm 25mm; margin: 0; }
      body{margin:0;padding:0;font-family:sans-serif}
      .label{width:45mm;height:25mm;display:flex;align-items:center;padding:1.5mm 2mm;box-sizing:border-box;gap:2mm;page-break-after:always}
      .label img{width:20mm;height:20mm;flex-shrink:0}
      .label .info{flex:1;overflow:hidden}
      .label .info p{margin:0;line-height:1.2}
      .label .info .name{font-size:7pt;font-weight:bold}
      .label .info .sku{font-size:6pt;color:#444}
    </style></head><body>${labels.join('')}<script>window.onload=()=>window.print()<\/script></body></html>`)
    win?.document.close()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <a href="/admin" className="text-sm opacity-75 hover:opacity-100">← Back</a>
            <h1 className="text-2xl font-bold">Products</h1>
          </div>
          <div className="flex gap-2">
            {isWebUSBSupported() && (
              <button onClick={() => connectPrinter().then(d => alert(d ? 'Printer connected!' : 'No printer selected'))}
                className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium active:scale-95">
                🔌 Printer
              </button>
            )}
            {bulkQR.length > 0 && (
              <button onClick={printBulkQR}
                className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium active:scale-95">
                🖨 Print {bulkQR.reduce((s, q) => s + q.qty, 0)} QR
              </button>
            )}
            <button onClick={() => { if (showForm) resetForm(); else { setEditingProduct(null); setShowForm(true) } }}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium active:scale-95">
              {showForm ? 'Cancel' : '+ Add Product'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">

        {/* Add Product Form */}
        {showForm && (
          <form onSubmit={editingProduct ? handleUpdate : handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6 space-y-4">
            {editingProduct && (
              <p className="text-sm text-indigo-600 font-medium">Editing: {editingProduct.name} ({editingProduct.sku})</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name *" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-2 border-gray-300 rounded-lg px-4 py-3" />
              <div className="flex flex-col gap-2">
                <select
                  value={customCategory ? '__custom__' : formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') { setCustomCategory(true); setFormData({ ...formData, category: '' }) }
                    else { setCustomCategory(false); setFormData({ ...formData, category: e.target.value }) }
                  }}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 w-full">
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom__">+ New Category</option>
                </select>
                {customCategory && (
                  <input type="text" placeholder="Enter new category" autoFocus value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="border-2 border-gray-300 rounded-lg px-4 py-3" />
                )}
              </div>
              <input type="number" placeholder="Cost Price *" required step="0.01" value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="border-2 border-gray-300 rounded-lg px-4 py-3" />
              <input type="number" placeholder="Selling Price *" required step="0.01" value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="border-2 border-gray-300 rounded-lg px-4 py-3" />
              <select value={formData.stock_type}
                onChange={(e) => setFormData({ ...formData, stock_type: e.target.value })}
                className="border-2 border-gray-300 rounded-lg px-4 py-3">
                <option value="regular">Regular Stock</option>
                <option value="deadstock">Dead Stock</option>
              </select>
            </div>

            {/* Images */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">Photos</label>
              {existingImages.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative">
                      <img src={img.url} className="h-20 w-20 object-cover rounded-lg border" />
                      <button type="button" onClick={async () => {
                        if (img.id) await supabase.from('product_images').delete().eq('id', img.id)
                        setExistingImages(p => p.filter(i => i.id !== img.id))
                        if (existingImages.length === 1 && editingProduct) {
                          await supabase.from('products').update({ image_url: null }).eq('id', editingProduct.id)
                        }
                      }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handleImageFiles}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3" />
              {imagePreviews.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} className="h-20 w-20 object-cover rounded-lg border" />
                      <button type="button" onClick={() => {
                        setImagePreviews(p => p.filter((_, j) => j !== i))
                        setImageFiles(p => p.filter((_, j) => j !== i))
                      }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variants */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-base font-semibold text-gray-900">Size & Color Variants</label>
                <button type="button" onClick={addVariant}
                  className="text-sm text-indigo-600 font-medium">+ Add Variant</button>
              </div>
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-center">
                    <select value={v.size} onChange={(e) => updateVariant(i, 'size', e.target.value)}
                      className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select value={v.color} onChange={(e) => updateVariant(i, 'color', e.target.value)}
                      className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {COLORS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="Stock" min="0" value={v.stock_quantity === 0 ? '' : v.stock_quantity}
                      onChange={(e) => updateVariant(i, 'stock_quantity', e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <button type="button" onClick={() => removeVariant(i)}
                      className="text-red-500 text-sm">Remove</button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={uploading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium active:scale-95 disabled:opacity-50">
              {uploading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </form>
        )}

        {/* Product List */}
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Product Row */}
              <div className="p-4 flex gap-4 items-center">
                {/* Image */}
                <label className="cursor-pointer flex-shrink-0 relative group">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">📦</div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium">Upload</div>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    const url = await uploadImage(file); if (!url) return
                    await supabase.from('products').update({ image_url: url }).eq('id', product.id)
                    fetchProducts()
                  }} />
                </label>

                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {product.sku} {product.category && `| ${product.category}`}</p>
                  <p className="text-sm text-gray-500">Cost: ₹{product.cost_price} | Sell: ₹{product.selling_price}
                    {product.stock_type === 'deadstock' && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Dead Stock</span>}
                  </p>
                  {product.product_variants?.length > 0 && (
                    <p className="text-xs text-indigo-600 mt-1">{product.product_variants.length} variants</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <button onClick={() => startEdit(product)} className="text-indigo-600 text-sm">Edit</button>
                  <button onClick={() => duplicateProduct(product)} className="text-green-600 text-sm">Duplicate</button>
                  <button onClick={() => deleteProduct(product.id)} className="text-red-500 text-sm">Delete</button>
                  <button onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                    className="text-indigo-600 text-sm">
                    {expandedId === product.id ? 'Hide ▲' : 'Variants ▼'}
                  </button>
                </div>
              </div>

              {/* Variants Panel */}
              {expandedId === product.id && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  {/* Extra images */}
                  {product.product_images?.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {product.product_images.map(img => (
                        <img key={img.id} src={img.url} className="h-14 w-14 object-cover rounded-lg border" />
                      ))}
                      <label className="h-14 w-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer text-gray-400 text-xl hover:border-indigo-400">
                        +
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return
                          const url = await uploadImage(file); if (!url) return
                          await supabase.from('product_images').insert([{ product_id: product.id, url }])
                          fetchProducts()
                        }} />
                      </label>
                    </div>
                  )}

                  {/* Variants table */}
                  {product.product_variants?.length > 0 ? (
                    <div className="space-y-2">
                      {product.product_variants.map((v) => (
                        <div key={v.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900">{v.color} / {v.size}</span>
                            <span className="text-xs text-gray-400">{v.sku}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {editingStock?.id === v.id ? (
                              <input type="number" autoFocus value={editingStock!.value}
                                onChange={(e) => setEditingStock({ id: v.id!, value: e.target.value })}
                                onBlur={() => saveVariantStock(v.id!, editingStock!.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveVariantStock(v.id!, editingStock!.value)}
                                className="w-16 border-2 border-indigo-400 rounded px-2 py-0.5 text-sm" />
                            ) : (
                              <button onClick={() => setEditingStock({ id: v.id!, value: String(v.stock_quantity) })}
                                className="text-sm font-medium text-indigo-600 underline underline-offset-2">
                                {v.stock_quantity} in stock
                              </button>
                            )}
                            <button onClick={() => setPrintVariant({ sku: v.sku, name: `${product.name} ${v.color} ${v.size}` })}
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded active:scale-95">
                              🖨 Print QR
                            </button>
                            <input type="number" min="0" placeholder="Qty"
                              value={bulkQR.find(q => q.sku === v.sku)?.qty || ''}
                              onChange={(e) => toggleBulkQR(v.sku, `${product.name} ${v.color} ${v.size}`, parseInt(e.target.value) || 0)}
                              className="w-14 border-2 border-gray-300 rounded px-1 py-0.5 text-xs text-center" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No variants added</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Print QR Modal */}
      {printVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 text-center space-y-4 w-72">
            <h3 className="font-bold text-gray-900">{printVariant.name}</h3>
            <div ref={printRef} className="label flex flex-col items-center gap-2">
              <QRCodeCanvas value={printVariant.sku} size={160} />
              <p style={{margin:'4px 0', fontSize:'12px', fontWeight:'bold'}}>{printVariant.name}</p>
              <p style={{margin:'4px 0', fontSize:'11px', color:'#666'}}>{printVariant.sku}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={printQR}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium active:scale-95">
                Print
              </button>
              <button onClick={() => setPrintVariant(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium active:scale-95">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden bulk QR canvases for printing */}
      <div id="bulk-qr-hidden" style={{ position: 'absolute', left: '-9999px' }}>
        {bulkQR.map(q => <QRCodeCanvas key={q.sku} value={q.sku} size={120} />)}
      </div>
    </div>
  )
}
