import { test, expect, type Page } from '@playwright/test'

const TEST_EMAIL = process.env.BANGSTOCK_TEST_EMAIL ?? ''
const TEST_PASSWORD = process.env.BANGSTOCK_TEST_PASSWORD ?? ''
const TEST_PRODUCT = `E2E-Test-${Date.now()}`

async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('admin@bangstock.com').fill(TEST_EMAIL)
  await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('/admin', { timeout: 15000 })
}

test.describe.serial('Product CRUD', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test('CREATE — add a new product with variant', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.getByText('+ Add Product').click()

    // Fill product details
    await page.getByPlaceholder('Product Name *').fill(TEST_PRODUCT)
    await page.getByPlaceholder('Cost Price *').fill('100')
    await page.getByPlaceholder('Selling Price *').fill('200')

    // Set variant stock
    await page.locator('input[placeholder="Stock"]').first().fill('10')

    // Submit
    await page.getByRole('button', { name: 'Add Product' }).click()
    await page.waitForTimeout(2000)

    // Verify product appears in list
    await expect(page.getByText(TEST_PRODUCT)).toBeVisible({ timeout: 10000 })
  })

  test('READ — product is visible in list with correct details', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')

    const productCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_PRODUCT }).first()
    await expect(productCard).toBeVisible({ timeout: 10000 })
    await expect(productCard.locator('text=Cost: ₹100')).toBeVisible()
    await expect(productCard.locator('text=Sell: ₹200')).toBeVisible()
  })

  test('READ — expand variants panel', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')

    // Find the specific product's Variants button using the product name as anchor
    const productCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_PRODUCT }).first()
    await productCard.getByRole('button', { name: 'Variants ▼' }).click()
    await expect(productCard.getByText('in stock')).toBeVisible()
  })

  test('UPDATE — edit product name and price', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')

    const productCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_PRODUCT }).first()
    await productCard.getByRole('button', { name: 'Edit' }).click()

    // Verify form is pre-filled
    await expect(page.getByPlaceholder('Product Name *')).toHaveValue(TEST_PRODUCT)

    // Update selling price
    const priceField = page.getByPlaceholder('Selling Price *')
    await priceField.clear()
    await priceField.fill('250')

    // Submit
    await page.getByRole('button', { name: 'Update Product' }).click()
    await page.waitForTimeout(2000)

    // Verify updated price
    const updatedCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_PRODUCT }).first()
    await expect(updatedCard.locator('text=Sell: ₹250')).toBeVisible({ timeout: 10000 })
  })

  test('UPDATE — inline edit variant stock', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')

    const productCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_PRODUCT }).first()
    await productCard.getByRole('button', { name: 'Variants ▼' }).click()

    // Click stock number to edit inline
    const stockBtn = page.getByText('10 in stock').first()
    if (await stockBtn.isVisible()) {
      await stockBtn.click()
      const stockInput = page.locator('input[type="number"].border-indigo-400')
      await stockInput.clear()
      await stockInput.fill('15')
      await stockInput.press('Enter')
      await page.waitForTimeout(1000)
      await expect(page.getByText('15 in stock').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('DUPLICATE — duplicate product', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')

    const productCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_PRODUCT }).first()
    await productCard.getByRole('button', { name: 'Duplicate' }).click()
    await page.waitForTimeout(2000)

    // Should see "(Copy)" version
    await expect(page.getByText(`${TEST_PRODUCT} (Copy)`)).toBeVisible({ timeout: 10000 })
  })

  test('DELETE — delete duplicated product', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')

    // Delete the copy
    page.on('dialog', dialog => dialog.accept())
    const copyCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: `${TEST_PRODUCT} (Copy)` }).first()
    await copyCard.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(2000)

    await expect(page.getByText(`${TEST_PRODUCT} (Copy)`)).not.toBeVisible({ timeout: 5000 })
  })

  test('DELETE — delete original test product', async ({ page }) => {
    await login(page)
    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')

    page.on('dialog', dialog => dialog.accept())
    const productCard = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_PRODUCT }).first()
    await productCard.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(2000)

    await expect(page.locator(`text=${TEST_PRODUCT}`)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe.serial('Expense CRUD', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')
  const TEST_EXPENSE = `E2E-Expense-${Date.now()}`

  test('CREATE — add expense', async ({ page }) => {
    await login(page)
    await page.goto('/admin/expenses')
    await page.getByText('+ Add Expense').click()

    await page.getByPlaceholder('Description *').fill(TEST_EXPENSE)
    await page.getByPlaceholder('Amount *').fill('500')
    await page.getByPlaceholder('Category (optional)').fill('Testing')

    await page.getByRole('button', { name: 'Add Expense' }).click()
    await page.waitForTimeout(2000)

    await expect(page.getByText(TEST_EXPENSE)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('₹500.00')).toBeVisible()
  })

  test('UPDATE — edit expense', async ({ page }) => {
    await login(page)
    await page.goto('/admin/expenses')
    await page.waitForLoadState('networkidle')

    const row = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_EXPENSE }).first()
    await row.getByRole('button', { name: 'Edit' }).click()

    const amountField = page.getByPlaceholder('Amount *')
    await amountField.clear()
    await amountField.fill('750')

    await page.getByRole('button', { name: 'Update Expense' }).click()
    await page.waitForTimeout(2000)

    await expect(page.getByText('₹750.00')).toBeVisible({ timeout: 10000 })
  })

  test('DELETE — delete expense', async ({ page }) => {
    await login(page)
    await page.goto('/admin/expenses')
    await page.waitForLoadState('networkidle')

    page.on('dialog', dialog => dialog.accept())
    const row = page.locator('.bg-white.rounded-lg.shadow', { hasText: TEST_EXPENSE }).first()
    await row.locator('button:has-text("✕")').click()
    await page.waitForTimeout(2000)

    await expect(page.getByText(TEST_EXPENSE)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe.serial('POS Sale Flow', () => {
  test.skip(!TEST_EMAIL, 'Set BANGSTOCK_TEST_EMAIL and BANGSTOCK_TEST_PASSWORD to run')

  test('complete a full sale', async ({ page }) => {
    await login(page)
    await page.goto('/admin/pos')
    await page.waitForLoadState('networkidle')

    // Add first product to cart
    const firstProduct = page.locator('button:has(h3)').first()
    if (!(await firstProduct.isVisible())) {
      test.skip(true, 'No products available to test POS')
      return
    }

    await firstProduct.click()

    // Handle variant picker if shown
    const variantPicker = page.getByText('Select Variant')
    if (await variantPicker.isVisible().catch(() => false)) {
      await page.locator('button:has-text("in stock")').first().click()
    }

    // Verify cart has item
    await expect(page.getByText('Cart is empty')).not.toBeVisible({ timeout: 3000 })

    // Fill customer details
    await page.getByPlaceholder('Customer Phone *').fill('9999999999')
    await page.getByPlaceholder('Customer Name (optional)').fill('E2E Test Customer')

    // Select UPI payment
    await page.getByRole('button', { name: 'UPI' }).click()

    // Verify total shows
    await expect(page.locator('.text-2xl.font-bold.text-center', { hasText: 'Total: ₹' })).toBeVisible()

    // Complete sale
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('Complete Sale').click()
    await page.waitForTimeout(3000)

    // Cart should be empty after sale
    await expect(page.getByText('Cart is empty')).toBeVisible({ timeout: 10000 })
  })
})
