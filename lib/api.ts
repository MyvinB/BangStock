import { supabase } from './supabase'
import type { Product, Expense, Customer } from '@/types'

// Products
export async function fetchProducts(filters?: { isActive?: boolean; stockType?: string }) {
  let query = supabase.from('products').select('*, product_variants(*), product_images(*)')
  if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive)
  if (filters?.stockType === 'regular') query = query.or('stock_type.eq.regular,stock_type.is.null')
  if (filters?.stockType === 'deadstock') query = query.eq('stock_type', 'deadstock')
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function fetchActiveProductsInStock(stockType?: string) {
  let query = supabase.from('products').select('*, product_variants(*), product_images(*)')
    .eq('is_active', true).gt('stock_quantity', 0)
  if (stockType === 'regular') query = query.or('stock_type.eq.regular,stock_type.is.null')
  if (stockType === 'deadstock') query = query.eq('stock_type', 'deadstock')
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Product[]
}

// Expenses
export async function fetchExpenses() {
  const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Expense[]
}

export async function createExpense(expense: Omit<Expense, 'id'>) {
  const { error } = await supabase.from('expenses').insert([expense])
  if (error) throw error
}

export async function updateExpense(id: string, expense: Partial<Expense>) {
  const { error } = await supabase.from('expenses').update(expense).eq('id', id)
  if (error) throw error
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// Customers
export async function fetchCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Customer[]
}

export async function findCustomerByPhone(phone: string) {
  const { data } = await supabase.from('customers').select('id, name').eq('phone', phone).maybeSingle()
  return data
}

export async function createCustomer(name: string, phone: string) {
  const { data, error } = await supabase.from('customers').insert([{ name, phone }]).select('id').single()
  if (error) throw error
  return data
}

// Sales
export async function createSale(sale: { customer_id: string; total_amount: number; discount_percent: number; payment_mode: string; staff_id: string }) {
  const { data, error } = await supabase.from('sales').insert([sale]).select('id').single()
  if (error) throw error
  return data
}

export async function createSaleItems(items: { sale_id: string; product_id: string; variant_id: string | null; quantity: number; unit_price: number }[]) {
  const { error } = await supabase.from('sale_items').insert(items)
  if (error) throw error
}

// Images
export async function uploadImage(file: File, folder = '') {
  const ext = file.name.split('.').pop()
  const path = `${folder}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(path, file)
  if (error) throw error
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}
