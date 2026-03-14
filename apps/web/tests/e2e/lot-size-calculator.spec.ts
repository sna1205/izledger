import { expect, test, type Page } from '@playwright/test'
import { installMockApp } from './support/mockApp'

async function openFilledCalculator(page: Page) {
  await page.goto('/tools/lots-calculate')
  await expect(page.getByRole('heading', { name: 'Lots Calculate' }).first()).toBeVisible()
}

test.describe('Lot size calculator FX coverage', () => {
  test('recalculates immediately for USD account with EURUSD', async ({ page }) => {
    await installMockApp(page)
    await openFilledCalculator(page)

    await page.getByLabel('Entry Price').fill('1.1000')
    await page.getByLabel('Stop Loss').fill('1.0990')
    await page.getByLabel('Take Profit (optional)').fill('1.1020')

    const positionSize = page.locator('.lot-calc-lot-block .value-display')
    await expect(positionSize).not.toHaveText('-')
    await expect(page.getByText('Risk currency').locator('..')).toContainText('USD')

    const initial = (await positionSize.textContent())?.trim()
    await page.getByLabel('Stop Loss').fill('1.0980')
    await expect(positionSize).not.toHaveText(initial ?? '')
  })

  test('uses JPY->USD conversion for USD account with EURJPY', async ({ page }) => {
    await installMockApp(page, {
      instruments: [
        {
          id: 2,
          symbol: 'EURJPY',
          asset_class: 'forex',
          base_currency: 'EUR',
          quote_currency: 'JPY',
          contract_size: '100000',
          tick_size: '0.001',
          tick_value: '100',
          pip_size: '0.01',
          min_lot: '0.01',
          lot_step: '0.01',
          is_active: true,
        },
        {
          id: 1,
          symbol: 'EURUSD',
          asset_class: 'forex',
          base_currency: 'EUR',
          quote_currency: 'USD',
          contract_size: '100000',
          tick_size: '0.00001',
          tick_value: '1',
          pip_size: '0.0001',
          min_lot: '0.01',
          lot_step: '0.01',
          is_active: true,
        },
      ],
    })
    await openFilledCalculator(page)

    await page.getByLabel('Entry Price').fill('161.200')
    await page.getByLabel('Stop Loss').fill('160.900')

    await expect(page.getByText('JPY->USD', { exact: false })).toBeVisible()
    await expect(page.getByText('Tick Value (USD, 1 lot)')).toBeVisible()
    await expect(page.locator('.lot-calc-lot-block .value-display')).not.toHaveText('-')
  })

  test('uses USD->EUR conversion for EUR account with GBPUSD', async ({ page }) => {
    await installMockApp(page, {
      accounts: [
        {
          id: 2,
          user_id: 99,
          name: 'EUR Prop',
          broker: 'FundingPips',
          account_type: 'funded',
          starting_balance: '25000.00',
          current_balance: '25200.00',
          currency: 'EUR',
          is_active: true,
          created_at: '2026-03-10T09:30:00.000Z',
          updated_at: '2026-03-10T09:30:00.000Z',
        },
        {
          id: 1,
          user_id: 99,
          name: 'USD Primary',
          broker: 'Apex',
          account_type: 'personal',
          starting_balance: '10000.00',
          current_balance: '10250.00',
          currency: 'USD',
          is_active: true,
          created_at: '2026-03-10T09:30:00.000Z',
          updated_at: '2026-03-10T09:30:00.000Z',
        },
      ],
      instruments: [
        {
          id: 3,
          symbol: 'GBPUSD',
          asset_class: 'forex',
          base_currency: 'GBP',
          quote_currency: 'USD',
          contract_size: '100000',
          tick_size: '0.00001',
          tick_value: '1',
          pip_size: '0.0001',
          min_lot: '0.01',
          lot_step: '0.01',
          is_active: true,
        },
        {
          id: 1,
          symbol: 'EURUSD',
          asset_class: 'forex',
          base_currency: 'EUR',
          quote_currency: 'USD',
          contract_size: '100000',
          tick_size: '0.00001',
          tick_value: '1',
          pip_size: '0.0001',
          min_lot: '0.01',
          lot_step: '0.01',
          is_active: true,
        },
      ],
    })
    await openFilledCalculator(page)

    await page.getByLabel('Entry Price').fill('1.2650')
    await page.getByLabel('Stop Loss').fill('1.2625')

    await expect(page.getByText('Risk currency').locator('..')).toContainText('EUR')
    await expect(page.getByText('USD -> EUR')).toBeVisible()
    await expect(page.getByText('Pip Value (USD, 1 lot)')).toBeVisible()
  })
})
