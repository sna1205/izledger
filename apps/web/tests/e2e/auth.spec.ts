import { expect, test } from '@playwright/test'
import { installMockApp } from './support/mockApp'

test.describe('Auth redirects and refresh persistence', () => {
  test('redirects guests away from protected routes', async ({ page }) => {
    await installMockApp(page, {
      authenticated: false,
      authMeResponses: [{ status: 401, body: { message: 'Unauthenticated.' } }],
    })

    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
    await expect(page.getByTestId('dashboard-page')).toHaveCount(0)
  })

  test('restores a valid session after refresh on the dashboard', async ({ page }) => {
    await installMockApp(page, {
      authenticated: true,
      authMeResponses: [
        { status: 200, body: { id: 99, name: 'QA Trader', email: 'qa@example.com' } },
        { status: 200, body: { id: 99, name: 'QA Trader', email: 'qa@example.com' } },
      ],
    })

    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-page').first()).toBeVisible()

    await page.reload()

    await expect(page.getByTestId('dashboard-page').first()).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('sends expired sessions back to login on refresh', async ({ page }) => {
    await installMockApp(page, {
      authenticated: true,
      authMeResponses: [
        { status: 200, body: { id: 99, name: 'QA Trader', email: 'qa@example.com' } },
        { status: 401, body: { message: 'Unauthenticated.' } },
      ],
    })

    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-page').first()).toBeVisible()

    await page.reload()

    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
  })
})
