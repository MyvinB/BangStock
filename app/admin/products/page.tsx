'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import { printLabel, connectPrinter, isWebUSBSupported } from '@/lib/thermal-print'
import { SIZES, COLORS } from '@/lib/constants'
import type { Product, Variant, ProductImage } from '@/types'

type LocalVariant = Variant & { isCustomColor?: boolean }

function generateVariantSku(base: string, color: string, size: string) {
  return `${base}-${color.substring(0, 3).toUpperCase()}-${size}`.replace(/\s/g, '')
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [printVariant, setPrintVariant] = useState<{
    sku: string;
    productName: string;
    color?: string;
    size?: string;
    price?: number;
  } | null>(null)
  const [bulkQR, setBulkQR] = useState<{
    sku: string;
    productName: string;
    color?: string;
    size?: string;
    price?: number;
    qty: number;
  }[]>([])
  const [editingStock, setEditingStock] = useState<{ id: string; value: string } | null>(null)
  const [bulkPrintMode, setBulkPrintMode] = useState(false)
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
  const [variants, setVariants] = useState<LocalVariant[]>([{ size: 'M', color: 'Black', stock_quantity: 0, sku: '' }])
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

  function updateVariant(index: number, field: keyof LocalVariant, value: any) {
    setVariants(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'size' || field === 'color') {
        updated[index].sku = generateVariantSku(formData.name || 'PRD', updated[index].color || '', updated[index].size || '')
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

  function duplicateVariant(index: number) {
    setVariants(prev => {
      const updated = [...prev]
      const original = updated[index]
      const duplicated = { ...original, sku: '' }
      updated.splice(index + 1, 0, duplicated)
      return updated
    })
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
      ? product.product_variants.map(({ id, ...v }) => ({ ...v, isCustomColor: false }))
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
      printLabel(
        printVariant.productName,
        printVariant.sku,
        1,
        printVariant.color,
        printVariant.size,
        printVariant.price
      ).then(() => {
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
    const truncatedName = printVariant ? (printVariant.productName.length > 22 ? printVariant.productName.slice(0, 22) + '..' : printVariant.productName) : ''
    const variantText = printVariant ? [printVariant.color, printVariant.size].filter(Boolean).join(' / ') : ''
    win?.document.write(`
      <html><head><title>Print QR</title>
      <style>
        @page { size: 45mm 25mm; margin: 0; }
        body { margin:0; padding:0; font-family:sans-serif; }
        .label { width:45mm; height:25mm; display:flex; align-items:center; padding:1mm 1.5mm; box-sizing:border-box; gap:1.5mm; }
        .label img { width:20mm; height:20mm; flex-shrink:0; }
        .label .info { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
        .label .info p { margin:0; line-height:1.25; }
        .label .info .name { font-size:7pt; font-weight:bold; }
        .label .info .variant { font-size:5.5pt; color:#555; }
        .label .info .price { font-size:7.5pt; font-weight:bold; color:#000; margin: 0.5mm 0; }
        .label .info .sku { font-size:5.5pt; color:#444; }
      </style></head>
      <body>
        <div class="label">
          <img src="${imgData}" />
          <div class="info">
            <p class="name">${truncatedName}</p>
            ${variantText ? `<p class="variant">${variantText}</p>` : ''}
            ${printVariant?.price !== undefined ? `<p class="price">₹${printVariant.price}</p>` : ''}
            <p class="sku">${printVariant?.sku}</p>
          </div>
        </div>
        <script>window.onload=()=>window.print()<\/script>
      </body></html>
    `)
    win?.document.close()
  }

  function toggleBulkQR(
    sku: string,
    productName: string,
    qty: number,
    color?: string,
    size?: string,
    price?: number
  ) {
    setBulkQR(prev => {
      if (qty <= 0) return prev.filter(q => q.sku !== sku)
      const existing = prev.find(q => q.sku === sku)
      if (existing) {
        return prev.map(q => q.sku === sku ? { ...q, qty } : q)
      }
      return [...prev, { sku, productName, qty, color, size, price }]
    })
  }

  function printBulkQR() {
    if (isWebUSBSupported()) {
      (async () => {
        try {
          for (const item of bulkQR) {
            await printLabel(
              item.productName,
              item.sku,
              item.qty,
              item.color,
              item.size,
              item.price
            )
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
      const truncatedName = item.productName.length > 22 ? item.productName.slice(0, 22) + '..' : item.productName
      const variantText = [item.color, item.size].filter(Boolean).join(' / ')

      for (let n = 0; n < item.qty; n++) {
        labels.push(`
          <div class="label">
            <img src="${imgData}" />
            <div class="info">
              <p class="name">${truncatedName}</p>
              ${variantText ? `<p class="variant">${variantText}</p>` : ''}
              ${item.price !== undefined ? `<p class="price">₹${item.price}</p>` : ''}
              <p class="sku">${item.sku}</p>
            </div>
          </div>
        `)
      }
    })
    const win = window.open('', '_blank')
    win?.document.write(`<html><head><title>Bulk QR Print</title><style>
      @page { size: 45mm 25mm; margin: 0; }
      body{margin:0;padding:0;font-family:sans-serif}
      .label{width:45mm;height:25mm;display:flex;align-items:center;padding:1mm 1.5mm;box-sizing:border-box;gap:1.5mm;page-break-after:always}
      .label img{width:20mm;height:20mm;flex-shrink:0}
      .label .info{flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:center;}
      .label .info p{margin:0;line-height:1.25}
      .label .info .name{font-size:7pt;font-weight:bold}
      .label .info .variant{font-size:5.5pt;color:#555;}
      .label .info .price{font-size:7.5pt;font-weight:bold;color:#000;margin:0.5mm 0;}
      .label .info .sku{font-size:5.5pt;color:#444}
    </style></head><body>${labels.join('')}<script>window.onload=()=>window.print()<\/script></body></html>`)
    win?.document.close()
  }

  const dynamicColors = Array.from(new Set([
    ...COLORS,
    ...products.flatMap(p => p.product_variants || []).map(v => v.color).filter(Boolean)
  ])).sort()

  const customSizes = Array.from(new Set(
    products.flatMap(p => p.product_variants || []).map(v => v.size).filter(Boolean)
  )).filter(s => !SIZES.includes(s as any))
  
  const dynamicSizes = [...SIZES, ...customSizes]

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 relative overflow-hidden flex flex-col">
      {/* Decorative Radial Glowing Backdrops */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Sticky Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/80">
        <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <a href="/admin" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mb-0.5">
              <span>←</span> Back to Operations
            </a>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Products Management</h1>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {isWebUSBSupported() && (
              <button onClick={() => connectPrinter().then(d => alert(d ? 'Printer connected!' : 'No printer selected'))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95 border border-slate-200/50 transition-all">
                🔌 Printer
              </button>
            )}
            <button onClick={() => {
              setBulkPrintMode(!bulkPrintMode);
              if (bulkPrintMode) setBulkQR([]);
            }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all duration-200 ${bulkPrintMode ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/10' : 'bg-slate-100 text-slate-700 border border-slate-200/50 hover:bg-slate-200'}`}>
              {bulkPrintMode ? '✕ Exit Print Mode' : '🖨 Bulk Print Mode'}
            </button>
            {bulkQR.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => setBulkQR([])}
                  className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95 shadow-lg shadow-red-600/10">
                  ✕ Clear All
                </button>
                <button onClick={printBulkQR}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 shadow-lg shadow-green-600/10">
                  🖨 Print {bulkQR.reduce((s, q) => s + q.qty, 0)} QR
                </button>
              </div>
            )}
            <button onClick={() => { if (showForm) resetForm(); else { setEditingProduct(null); setShowForm(true) } }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-lg shadow-indigo-600/15">
              {showForm ? 'Cancel' : '+ Add Product'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 flex-1 max-w-5xl">
        {/* Add/Edit Product Form */}
        {showForm && (
          <form onSubmit={editingProduct ? handleUpdate : handleSubmit} className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xl mb-8 space-y-6">
            {editingProduct && (
              <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg w-fit">
                Editing Product: {editingProduct.name} ({editingProduct.sku})
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Product Name</label>
                <input type="text" placeholder="Product Name *" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>
              
              <div className="space-y-1 flex flex-col justify-end">
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1">Category</label>
                <select
                  value={customCategory ? '__custom__' : formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') { setCustomCategory(true); setFormData({ ...formData, category: '' }) }
                    else { setCustomCategory(false); setFormData({ ...formData, category: e.target.value }) }
                  }}
                  className="border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 w-full text-slate-900">
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom__">+ New Category</option>
                </select>
                {customCategory && (
                  <input type="text" placeholder="Enter new category name" autoFocus value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 mt-2 text-slate-900" />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Cost Price (₹)</label>
                <input type="number" placeholder="Cost Price *" required step="0.01" value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Selling Price (₹)</label>
                <input type="number" placeholder="Selling Price *" required step="0.01" value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>

              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Stock Classification</label>
                <select value={formData.stock_type}
                  onChange={(e) => setFormData({ ...formData, stock_type: e.target.value })}
                  className="border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:border-indigo-500 w-full text-slate-900">
                  <option value="regular">Regular Stock</option>
                  <option value="deadstock">Dead Stock (Clearance)</option>
                </select>
              </div>
            </div>

            {/* Images Drop/Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Product Photos</label>
              {existingImages.length > 0 && (
                <div className="flex gap-3 mb-3 flex-wrap">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                      <img src={img.url} className="h-20 w-20 object-cover" />
                      <button type="button" onClick={async () => {
                        if (img.id) await supabase.from('product_images').delete().eq('id', img.id)
                        setExistingImages(p => p.filter(i => i.id !== img.id))
                        if (existingImages.length === 1 && editingProduct) {
                          await supabase.from('products').update({ image_url: null }).eq('id', editingProduct.id)
                        }
                      }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center hover:bg-red-650 transition-colors">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handleImageFiles}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none file:bg-slate-100 file:border-0 file:text-slate-800 file:px-3 file:py-1 file:rounded-lg file:mr-4 file:text-xs file:font-semibold" />
              {imagePreviews.length > 0 && (
                <div className="flex gap-3 mt-3 flex-wrap">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200">
                      <img src={src} className="h-20 w-20 object-cover" />
                      <button type="button" onClick={() => {
                        setImagePreviews(p => p.filter((_, j) => j !== i))
                        setImageFiles(p => p.filter((_, j) => j !== i))
                      }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center hover:bg-red-650 transition-colors">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variants Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Sizes & Color Options</label>
                <button type="button" onClick={addVariant}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                  <span>+</span> Add Variant Dimension
                </button>
              </div>
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-4 gap-3 items-center bg-slate-50 border border-slate-150 p-4 rounded-xl">
                    <select value={v.size} onChange={(e) => updateVariant(i, 'size', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-900">
                      {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    {v.isCustomColor ? (
                      <div className="relative flex items-center">
                        <input type="text" placeholder="Color *" value={v.color}
                          onChange={(e) => updateVariant(i, 'color', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs bg-white text-slate-900 placeholder-slate-400" />
                        <button type="button" onClick={() => {
                          updateVariant(i, 'isCustomColor', false);
                          updateVariant(i, 'color', 'Black');
                        }}
                          className="absolute right-2 text-slate-400 hover:text-red-500 text-sm">✕</button>
                      </div>
                    ) : (
                      <select value={v.color}
                        onChange={(e) => {
                          if (e.target.value === 'ADD_CUSTOM') {
                            updateVariant(i, 'isCustomColor', true);
                            updateVariant(i, 'color', '');
                          } else {
                            updateVariant(i, 'color', e.target.value);
                          }
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-900">
                        {dynamicColors.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="ADD_CUSTOM" className="text-indigo-600 font-semibold">+ Custom Color...</option>
                      </select>
                    )}

                    <input type="number" placeholder="Quantity" min="0" value={v.stock_quantity === 0 ? '' : v.stock_quantity}
                      onChange={(e) => updateVariant(i, 'stock_quantity', e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-900" />
                    
                    <div className="flex gap-3 text-xs justify-end pr-1">
                      <button type="button" onClick={() => duplicateVariant(i)}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold">Clone</button>
                      <button type="button" onClick={() => removeVariant(i)}
                        className="text-red-500 hover:text-red-600 font-semibold">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={uploading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/15">
              {uploading ? 'Saving product details...' : editingProduct ? 'Save Product Details' : 'Register New Product'}
            </button>
          </form>
        )}

        {/* Product Modules List */}
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white border border-slate-200/65 rounded-2xl overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-300">
              {/* Product Header Row */}
              <div className="p-5 flex gap-5 items-center">
                {/* Print mode multi check */}
                {bulkPrintMode && product.product_variants?.length > 0 && (
                  <input type="checkbox"
                    checked={product.product_variants.every(v => bulkQR.some(q => q.sku === v.sku))}
                    onChange={(e) => {
                      const skus = product.product_variants.map(v => v.sku);
                      if (e.target.checked) {
                        setBulkQR(prev => {
                          const filtered = prev.filter(q => !skus.includes(q.sku));
                          const newItems = product.product_variants.map(v => ({
                            sku: v.sku,
                            productName: product.name,
                            qty: 1,
                            color: v.color,
                            size: v.size,
                            price: product.selling_price
                          }));
                          return [...filtered, ...newItems];
                        });
                      } else {
                        setBulkQR(prev => prev.filter(q => !skus.includes(q.sku)));
                      }
                    }}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0 bg-transparent" />
                )}
                
                {/* Photo Thumbnail */}
                <label className="cursor-pointer flex-shrink-0 relative group rounded-xl overflow-hidden border border-slate-200">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl">📦</div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">Swap</div>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    const url = await uploadImage(file); if (!url) return
                    await supabase.from('products').update({ image_url: url }).eq('id', product.id)
                    fetchProducts()
                  }} />
                </label>

                {/* Meta details */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base tracking-tight text-slate-900">{product.name}</h3>
                    {product.stock_type === 'deadstock' && (
                      <span className="text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full uppercase">
                        Clearance
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    SKU: <span className="font-mono text-slate-700">{product.sku}</span> 
                    {product.category && <span className="mx-2 text-slate-300">|</span>}
                    {product.category && <span className="font-semibold text-slate-700 uppercase">{product.category}</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cost: <span className="text-slate-600">₹{product.cost_price}</span> 
                    <span className="mx-2 text-slate-300">|</span>
                    Sell: <span className="text-indigo-600 font-bold">₹{product.selling_price}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  <button onClick={() => startEdit(product)} className="text-xs text-indigo-600 hover:underline font-semibold">Edit</button>
                  <button onClick={() => duplicateProduct(product)} className="text-xs text-emerald-600 hover:underline font-semibold">Duplicate</button>
                  <button onClick={() => deleteProduct(product.id)} className="text-xs text-rose-600 hover:underline font-semibold">Delete</button>
                  <button 
                    onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  >
                    {expandedId === product.id ? 'Hide variants ▲' : `Manage Variants (${product.product_variants?.length || 0}) ▼`}
                  </button>
                </div>
              </div>

              {/* Variants Panel Dropdown */}
              {expandedId === product.id && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-4">
                  {/* Photo logs */}
                  {product.product_images?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {product.product_images.map(img => (
                        <img key={img.id} src={img.url} className="h-12 w-12 object-cover rounded-lg border border-slate-200" />
                      ))}
                      <label className="h-12 w-12 border border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer text-slate-400 text-lg hover:border-indigo-500/50 hover:text-indigo-600 transition-colors">
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

                  {/* Dimension listings table */}
                  {product.product_variants?.length > 0 ? (
                    <div className="grid gap-2">
                      {product.product_variants.map((v) => (
                        <div key={v.id} className="flex items-center justify-between bg-white border border-slate-200/60 rounded-xl px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{v.color} / {v.size}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{v.sku}</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {editingStock?.id === v.id ? (
                              <input type="number" autoFocus value={editingStock!.value}
                                onChange={(e) => setEditingStock({ id: v.id!, value: e.target.value })}
                                onBlur={() => saveVariantStock(v.id!, editingStock!.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveVariantStock(v.id!, editingStock!.value)}
                                className="w-16 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs bg-white text-slate-900 text-center focus:ring-1 focus:ring-indigo-500" />
                            ) : (
                              <button onClick={() => setEditingStock({ id: v.id!, value: String(v.stock_quantity) })}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                                {v.stock_quantity} units in stock
                              </button>
                            )}
                            
                            <button onClick={() => setPrintVariant({
                              sku: v.sku,
                              productName: product.name,
                              color: v.color,
                              size: v.size,
                              price: product.selling_price
                            })}
                              className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm">
                              🖨 Print QR
                            </button>

                            {bulkPrintMode && (
                              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                                <input type="checkbox"
                                  id={`bulk-check-${v.sku}`}
                                  checked={bulkQR.some(q => q.sku === v.sku)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      toggleBulkQR(v.sku, product.name, 1, v.color, v.size, product.selling_price)
                                    } else {
                                      toggleBulkQR(v.sku, product.name, 0)
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-transparent" />
                                
                                {bulkQR.some(q => q.sku === v.sku) && (
                                  <input type="number" min="1" placeholder="Qty"
                                    value={bulkQR.find(q => q.sku === v.sku)?.qty || 1}
                                    onChange={(e) => toggleBulkQR(
                                      v.sku,
                                      product.name,
                                      parseInt(e.target.value) || 1,
                                      v.color,
                                      v.size,
                                      product.selling_price
                                    )}
                                    className="w-12 border border-slate-300 rounded-lg px-1.5 py-1 text-center text-xs bg-white text-slate-900" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-550">No variants added for this product dimension</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Print QR Modal dialog */}
      {printVariant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-5 w-80 relative shadow-2xl">
            <h3 className="font-extrabold text-slate-900 tracking-tight leading-tight">
              {printVariant.productName} {[printVariant.color, printVariant.size].filter(Boolean).join(' ')}
            </h3>
            
            {/* Visual Canvas Block */}
            <div className="bg-white p-3 rounded-xl inline-block border border-slate-200">
              <div ref={printRef} className="label flex flex-col items-center gap-1.5 text-black">
                <QRCodeCanvas value={printVariant.sku} size={140} />
                <p style={{ margin: '4px 0 0', fontSize: '11px', fontWeight: 'bold' }}>{printVariant.productName}</p>
                {printVariant.color || printVariant.size ? (
                  <p style={{ margin: '0', fontSize: '10px', color: '#555' }}>{printVariant.color} / {printVariant.size}</p>
                ) : null}
                {printVariant.price !== undefined ? (
                  <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>₹{printVariant.price}</p>
                ) : null}
                <p style={{ margin: '0 0 2px', fontSize: '9px', color: '#777' }}>{printVariant.sku}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={printQR}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all">
                Print Label
              </button>
              <button onClick={() => setPrintVariant(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all border border-slate-200">
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
