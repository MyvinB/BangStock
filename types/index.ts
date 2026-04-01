export type Role = 'admin' | 'staff'
export type PaymentMode = 'Cash' | 'UPI' | 'Card'

export type Product = {
  id: string
  sku: string
  name: string
  category: string | null
  cost_price: number
  selling_price: number
  stock_quantity: number
  image_url: string | null
  stock_type: string
  is_active: boolean
  product_variants: Variant[]
  product_images: ProductImage[]
}

export type Variant = {
  id?: string
  product_id?: string
  sku: string
  size: string
  color: string
  stock_quantity: number
}

export type ProductImage = {
  id?: string
  product_id?: string
  url: string
}

export type Customer = {
  id: string
  name: string
  phone: string
  created_at: string
}

export type Sale = {
  id: string
  customer_id: string | null
  staff_id: string | null
  total_amount: number
  payment_mode: PaymentMode
  discount: number
  created_at: string
}

export type SaleItem = {
  id: string
  sale_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
}

export type Expense = {
  id: string
  description: string
  amount: number
  category: string | null
  payment_mode: string
  image_url: string | null
  created_at: string
}

export type Refund = {
  id: string
  sale_id: string
  sale_item_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  refund_amount: number
  reason: string | null
  created_at: string
}

export type CashReconciliation = {
  id: string
  date: string
  expected_cash: number
  actual_cash: number
  mismatch: number
  notes: string | null
}

export type CartItem = {
  key: string
  product: Product
  variant: Variant | null
  quantity: number
}
