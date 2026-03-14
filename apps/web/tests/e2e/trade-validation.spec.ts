import { expect, test } from '@playwright/test'
import { installMockApp } from './support/mockApp'

test.describe('Trade create/edit validation', () => {
  test('blocks impossible long-trade combinations on create', async ({ page }) => {
    await installMockApp(page)

    await page.goto('/trades/new?quick=1&symbol=EURUSD&direction=buy')
    await expect(page.getByTestId('trade-form-page')).toBeVisible()

    await page.getByLabel('Position Size (Units)').fill('0')
    await page.getByLabel('Entry Price').fill('1.1000')
    await page.getByLabel('Stop Loss').fill('1.1010')
    await page.getByLabel('Take Profit').fill('1.1100')
    await page.getByRole('button', { name: 'Save Execute' }).click()

    await expect(page.getByText('Position size must be greater than 0.')).toBeVisible()
    await expect(page.getByText('For buy trades, stop loss must be below entry.')).toBeVisible()
  })

  test('blocks impossible short-trade combinations on edit', async ({ page }) => {
    const mock = await installMockApp(page, {
      trades: [
        {
          id: 250,
          revision: 4,
          account_id: 1,
          instrument_id: 3,
          strategy_model_id: 2,
          setup_id: 2,
          killzone_id: 2,
          session_enum: 'new_york',
          pair: 'GBPUSD',
          direction: 'sell',
          entry_price: '1.2600',
          stop_loss: '1.2620',
          take_profit: '1.2550',
          actual_exit_price: '1.2570',
          lot_size: '0.10',
          risk_per_unit: '0.0020',
          reward_per_unit: '0.0050',
          monetary_risk: '20.00',
          monetary_reward: '50.00',
          commission: '0',
          swap: '0',
          spread_cost: '0',
          slippage_cost: '0',
          fx_rate_quote_to_usd: '1',
          fx_symbol_used: 'GBPUSD',
          fx_rate_timestamp: '2026-03-10T09:30:00.000Z',
          profit_loss: '30.00',
          rr: '2.5',
          r_multiple: '1.50',
          risk_percent: '0.10',
          account_balance_before_trade: '10000.00',
          account_balance_after_trade: '10030.00',
          followed_rules: true,
          checklist_incomplete: false,
          executed_checklist_id: null,
          executed_checklist_version: null,
          executed_enforcement_mode: null,
          failed_rule_ids: [],
          failed_rule_titles: [],
          check_evaluated_at: '2026-03-10T09:30:00.000Z',
          emotion: 'calm',
          session: 'New York',
          model: 'Liquidity Sweep',
          date: '2026-03-09T13:00:00.000Z',
          notes: 'Edit validation seed.',
          tag_ids: [],
          images: [],
          images_count: 0,
          created_at: '2026-03-09T13:05:00.000Z',
          updated_at: '2026-03-09T13:05:00.000Z',
          deleted_at: null,
          local_sync_status: 'synced',
          risk_validation_status: 'verified',
        },
      ],
    })

    await page.goto('/trades/250/edit')
    await expect(page.getByTestId('trade-form-page')).toBeVisible()

    await page.getByLabel('Stop Loss').fill('1.2590')
    await page.getByRole('button', { name: 'Update Execute' }).click()

    await expect(page.getByText('For sell trades, stop loss must be above entry.')).toBeVisible()
    await expect.poll(() => mock.requestLog.tradeUpdates.length).toBe(0)
  })
})
