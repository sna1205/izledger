import { expect, test } from '@playwright/test'
import { installMockApp } from './support/mockApp'

test.describe('Missed trade creation', () => {
  test('requires at least one behavioral reason tag', async ({ page }) => {
    await installMockApp(page)

    await page.goto('/missed-trades/new?quick=1&pair=EURUSD&model=Liquidity%20Sweep')
    await expect(page.getByRole('heading', { name: 'New Missed Trade' })).toBeVisible()

    await page.getByRole('button', { name: 'Save Trade' }).click()

    await expect(page.locator('#missed-setup-form').getByText('At least one reason tag is required.')).toBeVisible()
  })

  test('creates a missed trade with normalized tags', async ({ page }) => {
    const mock = await installMockApp(page)

    await page.goto('/missed-trades/new?quick=1&pair=EURUSD&model=Liquidity%20Sweep')
    await expect(page.getByRole('heading', { name: 'New Missed Trade' })).toBeVisible()

    await page.getByPlaceholder('custom tag').fill('Late Entry')
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByLabel('Notes').fill('Missed the entry while hesitating at London open.')
    await page.getByRole('button', { name: 'Save Trade' }).click()

    await expect.poll(() => mock.requestLog.missedTradeCreates.length).toBe(1)
    await expect(page).toHaveURL(/\/missed-trades$/)

    expect(mock.requestLog.missedTradeCreates[0]?.reason).toBe('late-entry')
  })
})
