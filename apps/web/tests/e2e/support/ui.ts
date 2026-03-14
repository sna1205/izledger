import { expect, type Page } from '@playwright/test'

export async function selectCustomOption(page: Page, label: string, optionText: string | RegExp) {
  const field = page
    .locator('.form-field-shell')
    .filter({ has: page.locator('.form-field-label', { hasText: label }) })
    .first()
  await expect(field).toBeVisible()
  await field.getByRole('button').first().click()
  const searchInput = page.locator('.select-search-input:visible, .instrument-search-input:visible').first()
  await searchInput.waitFor({ state: 'visible', timeout: 1000 }).catch(() => undefined)
  if (typeof optionText === 'string' && await searchInput.count() > 0) {
    await searchInput.fill(optionText)
  }
  const option = page.locator('button:visible').filter({ hasText: optionText }).first()
  await expect(option).toBeVisible()
  await option.click()
}

export async function waitForProtectedApp(page: Page, heading?: string | RegExp) {
  if (heading) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
  await page.waitForLoadState('networkidle')
}

export async function activeTheme(page: Page) {
  return page.evaluate(() => document.documentElement.dataset.theme ?? '')
}
