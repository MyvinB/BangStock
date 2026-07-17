import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Admin Login')).toBeVisible()
    await expect(page.getByPlaceholder('admin@bangstock.com')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('admin@bangstock.com').fill('wrong@test.com')
    await page.getByPlaceholder('Enter your password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 })
  })

  test('shows loading state while signing in', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('admin@bangstock.com').fill('test@test.com')
    await page.getByPlaceholder('Enter your password').fill('password')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Signing in...')).toBeVisible()
  })

  test('back to home link works', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('← Back to Home').click()
    await page.waitForURL('/')
  })

  test('unauthenticated user redirected from admin', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('/login', { timeout: 10000 })
  })
})
