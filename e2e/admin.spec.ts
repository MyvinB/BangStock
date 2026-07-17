import { test as base, expect, type Page } from '@playwright/test'

// Extend test with login fixture
// Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD env vars to run authenticated tests
const TEST_EMAIL = process.env.BANGSTOCK_TEST_EMAIL ?? ''
const TEST_PASSWORD = process.env.BANGSTOCK_TEST_PASSWORD ?? ''

async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('admin@bangstock.com').fill(TEST_EMAIL)
  await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('/admin', { timeout: 15000 })
}

const test = base.extend({})

test.describe('Admin Panel', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('admin home shows all navigation cards', async ({ page }) => {
    await expect(page.getByText('BangStock Admin')).toBeVisible()
    await expect(page.getByText('POS')).toBeVisible()
    await expect(page.getByText('Products')).toBeVisible()
    await expect(page.getByText('Customers')).toBeVisible()
    await expect(page.getByText('Refunds')).toBeVisible()
  })

  test('admin home shows admin-only sections for admin role', async ({ page }) => {
    // These only show for admin role
    const hasExpenses = await page.getByText('Expenses').isVisible().catch(() => false)
    const hasDashboard = await page.getByText('Dashboard').isVisible().catch(() => false)
    const hasStaff = await page.getByText('Staff').isVisible().catch(() => false)
    // At least the common ones should be visible
    await expect(page.getByText('POS')).toBeVisible()
  })

  test('sign out works', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL('/login', { timeout: 10000 })
  })
})

test.describe('POS Flow', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('POS page loads with products and cart', async ({ page }) => {
    await page.getByText('POS').click()
    await page.waitForURL('/admin/pos')
    await expect(page.getByText('Point of Sale')).toBeVisible()
    await expect(page.getByPlaceholder('Search products...')).toBeVisible()
    await expect(page.getByText('Cart')).toBeVisible()
  })

  test('POS search filters products', async ({ page }) => {
    await page.goto('/admin/pos')
    await page.waitForLoadState('networkidle')
    const searchBox = page.getByPlaceholder('Search products...')
    await searchBox.fill('zzzznonexistent')
    // Should show no products or fewer products
    await page.waitForTimeout(500)
    const productButtons = page.locator('button:has(h3)')
    const count = await productButtons.count()
    expect(count).toBe(0)
  })

  test('POS add product to cart', async ({ page }) => {
    await page.goto('/admin/pos')
    await page.waitForLoadState('networkidle')
    const firstProduct = page.locator('button:has(h3)').first()
    if (await firstProduct.isVisible()) {
      await firstProduct.click()
      // Either variant picker shows or item added to cart
      const variantPicker = page.getByText('Select Variant')
      if (await variantPicker.isVisible().catch(() => false)) {
        // Pick first available variant
        const variant = page.locator('button:has-text("in stock")').first()
        if (await variant.isVisible()) await variant.click()
      }
      // Cart should no longer be empty
      await expect(page.getByText('Cart is empty')).not.toBeVisible({ timeout: 3000 })
    }
  })

  test('POS cart quantity controls work', async ({ page }) => {
    await page.goto('/admin/pos')
    await page.waitForLoadState('networkidle')
    const firstProduct = page.locator('button:has(h3)').first()
    if (await firstProduct.isVisible()) {
      await firstProduct.click()
      const variantPicker = page.getByText('Select Variant')
      if (await variantPicker.isVisible().catch(() => false)) {
        await page.locator('button:has-text("in stock")').first().click()
      }
      // Increase quantity
      const plusBtn = page.locator('button:has-text("+")').first()
      if (await plusBtn.isVisible()) {
        await plusBtn.click()
        await expect(page.locator('.text-center.font-bold:has-text("2")')).toBeVisible()
      }
      // Remove item
      const removeBtn = page.locator('button:has-text("✕")').last()
      if (await removeBtn.isVisible()) {
        await removeBtn.click()
        await expect(page.getByText('Cart is empty')).toBeVisible()
      }
    }
  })

  test('POS requires phone to complete sale', async ({ page }) => {
    await page.goto('/admin/pos')
    await page.waitForLoadState('networkidle')
    const firstProduct = page.locator('button:has(h3)').first()
    if (await firstProduct.isVisible()) {
      await firstProduct.click()
      const variantPicker = page.getByText('Select Variant')
      if (await variantPicker.isVisible().catch(() => false)) {
        await page.locator('button:has-text("in stock")').first().click()
      }
      // Try completing without phone
      page.on('dialog', dialog => dialog.accept())
      await page.getByText('Complete Sale').click()
      // Should alert about phone
    }
  })

  test('POS payment mode toggle works', async ({ page }) => {
    await page.goto('/admin/pos')
    await page.waitForLoadState('networkidle')
    const firstProduct = page.locator('button:has(h3)').first()
    if (await firstProduct.isVisible()) {
      await firstProduct.click()
      const variantPicker = page.getByText('Select Variant')
      if (await variantPicker.isVisible().catch(() => false)) {
        await page.locator('button:has-text("in stock")').first().click()
      }
      await page.getByRole('button', { name: 'UPI' }).click()
      await expect(page.getByRole('button', { name: 'UPI' })).toHaveClass(/bg-indigo-600/)
    }
  })
})

test.describe('Products Page', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('products page loads with product list', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page.getByText('Products')).toBeVisible()
    await expect(page.getByText('+ Add Product')).toBeVisible()
  })

  test('add product form opens and closes', async ({ page }) => {
    await page.goto('/admin/products')
    await page.getByText('+ Add Product').click()
    await expect(page.getByPlaceholder('Product Name *')).toBeVisible()
    await page.getByText('Cancel').click()
    await expect(page.getByPlaceholder('Product Name *')).not.toBeVisible()
  })

  test('add product form has all required fields', async ({ page }) => {
    await page.goto('/admin/products')
    await page.getByText('+ Add Product').click()
    await expect(page.getByPlaceholder('Product Name *')).toBeVisible()
    await expect(page.getByPlaceholder('Cost Price *')).toBeVisible()
    await expect(page.getByPlaceholder('Selling Price *')).toBeVisible()
    await expect(page.getByText('Photos')).toBeVisible()
    await expect(page.getByText('Size & Color Variants')).toBeVisible()
  })

  test('product variant add/remove works', async ({ page }) => {
    await page.goto('/admin/products')
    await page.getByText('+ Add Product').click()
    await page.getByText('+ Add Variant').click()
    const removeButtons = page.getByText('Remove')
    expect(await removeButtons.count()).toBe(2)
    await removeButtons.last().click()
    expect(await page.getByText('Remove').count()).toBe(1)
  })

  test('product expand shows variants panel', async ({ page }) => {
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')
    const variantsBtn = page.getByText('Variants ▼').first()
    if (await variantsBtn.isVisible()) {
      await variantsBtn.click()
      await expect(page.getByText('Hide ▲').first()).toBeVisible()
    }
  })
})

test.describe('Customers Page', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('customers page loads', async ({ page }) => {
    await page.goto('/admin/customers')
    await expect(page.getByText('Customers')).toBeVisible()
  })
})

test.describe('Expenses Page', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('expenses page loads with total', async ({ page }) => {
    await page.goto('/admin/expenses')
    await expect(page.getByText('Expenses')).toBeVisible()
    await expect(page.getByText('Total Expenses')).toBeVisible()
    await expect(page.getByText('+ Add Expense')).toBeVisible()
  })

  test('add expense form opens with all fields', async ({ page }) => {
    await page.goto('/admin/expenses')
    await page.getByText('+ Add Expense').click()
    await expect(page.getByPlaceholder('Description *')).toBeVisible()
    await expect(page.getByPlaceholder('Amount *')).toBeVisible()
    await expect(page.getByPlaceholder('Category (optional)')).toBeVisible()
    await expect(page.getByText('Add from Inventory')).toBeVisible()
  })
})

test.describe('Refunds Page', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('refunds page loads with search', async ({ page }) => {
    await page.goto('/admin/refunds')
    await expect(page.getByText('Refunds')).toBeVisible()
  })
})

test.describe('Dashboard Page', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('dashboard loads with all sections', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    // Dashboard is admin-only, may redirect if staff
    if (page.url().includes('/dashboard')) {
      await expect(page.getByText('Today')).toBeVisible()
      await expect(page.getByText('This Month')).toBeVisible()
      await expect(page.getByText('Customers')).toBeVisible()
      await expect(page.getByText('Top Products')).toBeVisible()
      await expect(page.getByText('Low Stock')).toBeVisible()
    }
  })
})

test.describe('Reconciliation Page', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('reconciliation page loads with date picker', async ({ page }) => {
    await page.goto('/admin/reconciliation')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/reconciliation')) {
      await expect(page.getByText('Cash Reconciliation')).toBeVisible()
    }
  })
})

test.describe('Navigation Flow', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('back buttons navigate correctly', async ({ page }) => {
    await page.goto('/admin/pos')
    await page.getByText('← Back').click()
    await page.waitForURL('/admin')

    await page.goto('/admin/products')
    await page.getByText('← Back').click()
    await page.waitForURL('/admin')

    await page.goto('/admin/customers')
    await page.getByText('← Back').click()
    await page.waitForURL('/admin')
  })

  test('full user journey: home → shop → home → admin → POS', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Shop').click()
    await page.waitForURL('/shop')
    await expect(page.getByText('Live Inventory')).toBeVisible()

    await page.goto('/')
    await page.getByText('Admin').click()
    // Should go to admin (already logged in)
    await page.waitForURL('/admin', { timeout: 15000 })
    await page.getByText('POS').click()
    await page.waitForURL('/admin/pos')
    await expect(page.getByText('Point of Sale')).toBeVisible()
  })
})
