import { expect, test } from '@playwright/test'
import { installMockApp } from './support/mockApp'

test.describe('Rules CRUD and trade integration', () => {
  test('supports rule-set create, update, rule edit/delete, and archive flows', async ({ page }) => {
    await installMockApp(page)

    await page.goto('/settings/rules')
    await expect(page.getByRole('heading', { name: 'Trading Rules' })).toBeVisible()

    await page.getByRole('button', { name: 'New Rule Set' }).click()
    await page.getByLabel('Rule Set Name').fill('London Guardrails')
    await page.getByRole('button', { name: 'Strict', exact: true }).click()
    await page.getByRole('button', { name: 'Create' }).click()

    const ruleSetNameInput = page.locator('input.rules-board-name')
    await expect(ruleSetNameInput).toHaveValue('London Guardrails')

    await ruleSetNameInput.fill('London Guardrails v2')
    await ruleSetNameInput.blur()
    await expect(ruleSetNameInput).toHaveValue('London Guardrails v2')

    await page.getByRole('button', { name: 'Add' }).first().click()
    await page.locator('#new-rule-title').fill('Confirm A+ setup before entry')
    await page.getByRole('button', { name: 'Save Rule' }).click()
    await expect(page.getByText('Confirm A+ setup before entry')).toBeVisible()

    await page.getByRole('button', { name: 'Edit rule' }).first().click()
    await page.locator('#edit-rule-title').fill('Confirm A+ setup and session alignment')
    await page.getByRole('button', { name: 'Save Rule' }).click()
    await expect(page.getByText('Confirm A+ setup and session alignment')).toBeVisible()

    await page.getByRole('button', { name: 'Delete rule' }).first().click()
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click()
    await expect(page.getByText('Confirm A+ setup and session alignment')).toHaveCount(0)

    await page.getByRole('button', { name: 'Archive', exact: true }).first().click()
    await page.getByRole('button', { name: 'Archive', exact: true }).last().click()
    await expect(page.getByText('London Guardrails v2')).toHaveCount(0)
  })

  test('renders the active ruleset in the trade workflow and persists structured responses', async ({ page }) => {
    const mock = await installMockApp(page, {
      checklists: [
        {
          id: 1,
          user_id: 99,
          account_id: null,
          strategy_model_id: null,
          name: 'Execution Checklist',
          revision: 1,
          scope: 'global',
          enforcement_mode: 'strict',
          is_active: true,
          created_at: '2026-03-10T09:30:00.000Z',
          updated_at: '2026-03-10T09:30:00.000Z',
          active_items_count: 1,
        },
      ],
      checklistItemsByChecklistId: {
        1: [
          {
            id: 11,
            checklist_id: 1,
            order_index: 0,
            title: 'Confirm A+ setup',
            type: 'checkbox',
            required: true,
            category: 'Risk & Compliance',
            help_text: 'Make the entry checklist explicit before execution.',
            config: { lane: 'before' },
            is_active: true,
            created_at: '2026-03-10T09:30:00.000Z',
            updated_at: '2026-03-10T09:30:00.000Z',
          },
        ],
      },
    })

    await page.goto('/trades/201/edit')
    await expect(page.getByTestId('trade-form-page')).toBeVisible()
    const desktopRulesPanel = page.locator('.trade-checklist-panel-desktop:visible').first()
    await expect(desktopRulesPanel.getByRole('button', { name: 'Mark Followed' })).toBeVisible()
    await expect(desktopRulesPanel.getByText('Rules status:')).toBeVisible()

    await desktopRulesPanel.getByRole('button', { name: 'Mark Followed' }).click()
    await page.getByLabel('Execution Notes').fill('Edited with checklist response recorded.')
    await page.getByRole('button', { name: 'Update Execute' }).click()

    await expect.poll(() => mock.requestLog.tradeUpdates.length).toBe(1)
    expect(Array.isArray(mock.requestLog.tradeUpdates[0]?.checklist_responses)).toBe(true)
    expect(mock.requestLog.tradeUpdates[0]?.followed_rules).toBe(true)
  })
})
