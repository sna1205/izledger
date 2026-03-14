import { expect, test } from '@playwright/test'
import { installMockApp } from './support/mockApp'
import { activeTheme, selectCustomOption } from './support/ui'

test.describe('Dashboard persistence and theme persistence', () => {
  test('keeps dashboard filters in sync across URL, refresh, and back navigation', async ({ page }) => {
    await installMockApp(page)

    await page.goto('/dashboard')
    const dashboard = page.locator('[data-testid="dashboard-page"]:visible').first()
    await expect(dashboard).toBeVisible()

    await dashboard.getByRole('button', { name: 'Prop Challenge' }).first().click()
    await dashboard.getByRole('button', { name: 'Calendar' }).first().click()
    await dashboard.getByTestId('dashboard-quality-toggle').first().click()

    await expect(page).toHaveURL(/mode=prop/)
    await expect(page).toHaveURL(/tab=calendar/)
    await expect(page).toHaveURL(/include_drafts_unverified=1/)

    await page.reload()

    await expect(page).toHaveURL(/mode=prop/)
    await expect(page).toHaveURL(/tab=calendar/)
    await expect(page).toHaveURL(/include_drafts_unverified=1/)

    await page.goBack()
    await expect(page).not.toHaveURL(/include_drafts_unverified=1/)
  })

  test('persists theme changes across nested routes and refreshes', async ({ page }) => {
    await installMockApp(page)

    await page.goto('/settings/hub')
    await expect(page.getByRole('heading', { name: 'Workspace Controls' })).toBeVisible()

    await selectCustomOption(page, 'Theme Mode', 'Forest')
    await page.getByRole('button', { name: 'Sync Theme Preference' }).click()
    await expect.poll(() => activeTheme(page)).toBe('forest')

    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-page').first()).toBeVisible()
    await expect.poll(() => activeTheme(page)).toBe('forest')

    await page.goto('/trades/new?quick=1&symbol=EURUSD&direction=buy')
    await expect(page.getByTestId('trade-form-page')).toBeVisible()
    await expect.poll(() => activeTheme(page)).toBe('forest')

    await page.reload()
    await expect.poll(() => activeTheme(page)).toBe('forest')
  })
})
