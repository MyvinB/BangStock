import { test, expect } from '@playwright/test'

test.describe('Public Pages', () => {
  test('homepage loads with shop and admin links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('BangStock')).toBeVisible()
    await expect(page.getByText('Shop')).toBeVisible()
    await expect(page.getByText('Admin')).toBeVisible()
  })

  test('homepage → shop navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Shop').click()
    await page.waitForURL('/shop')
    await expect(page.getByText('Live Inventory')).toBeVisible({ timeout: 10000 })
  })

  test('shop page loads products or empty state', async ({ page }) => {
    await page.goto('/shop')
    // Wait for loading to finish
    await page.waitForFunction(() => !document.body.textContent?.includes('Loading...'), { timeout: 10000 })
    const products = page.locator('.grid > div')
    const empty = page.getByText('No products available')
    await expect(products.first().or(empty)).toBeVisible()
  })

  test('shop → deadstock navigation', async ({ page }) => {
    await page.goto('/shop')
    await page.getByText('Deals →').click()
    await page.waitForURL('/deadstock')
    await expect(page.getByText('Deals')).toBeVisible()
    await expect(page.getByText('Clearance Sale')).toBeVisible()
  })

  test('deadstock → shop navigation', async ({ page }) => {
    await page.goto('/deadstock')
    await page.getByText('View Regular →').click()
    await page.waitForURL('/shop')
  })

  test('shop product modal opens and closes', async ({ page }) => {
    await page.goto('/shop')
    const product = page.locator('.grid > div').first()
    if (await product.isVisible()) {
      await product.click()
      await expect(page.getByText('Inquire on WhatsApp')).toBeVisible()
      await page.locator('button:has-text("✕")').click()
      await expect(page.getByText('Inquire on WhatsApp')).not.toBeVisible()
    }
  })

  test('shop category filter works', async ({ page }) => {
    await page.goto('/shop')
    const filterButtons = page.locator('button.rounded-full')
    if (await filterButtons.count() > 1) {
      const secondFilter = filterButtons.nth(1)
      const filterText = await secondFilter.textContent()
      await secondFilter.click()
      await expect(secondFilter).toHaveClass(/bg-indigo-600/)
    }
  })
})
