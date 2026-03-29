import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const hasCreds = Boolean(email && password)

test.describe('authenticated smoke', () => {
  test.skip(!hasCreds, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated e2e tests')

  test('login and load dashboard', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-form')).toBeVisible()
    await page.getByTestId('login-email').fill(email!)
    await page.getByTestId('login-password').fill(password!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('patient-name')).toBeVisible()
  })

  test('log top turn flow', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(email!)
    await page.getByTestId('login-password').fill(password!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })

    const logTop = page.getByTestId('log-top')
    if (await logTop.isEnabled()) {
      await logTop.click()
      await page.getByTestId('turn-note-input').fill('e2e top')
      await page.getByRole('button', { name: 'Log turn' }).click()
      await expect(page.getByTestId('dashboard')).toBeVisible()
    }
  })

  test('notes CRUD surface', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(email!)
    await page.getByTestId('login-password').fill(password!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('nav-notes').click()
    await expect(page.getByTestId('notes-page')).toBeVisible()
    await page.getByTestId('note-create-open').click()
    await page.getByTestId('note-body-input').fill('E2E note ' + Date.now())
    await page.getByTestId('note-create-submit').click()
    await expect(page.getByTestId('notes-page')).toBeVisible()
  })

  test('settings save', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(email!)
    await page.getByTestId('login-password').fill(password!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('nav-settings').click()
    await expect(page.getByTestId('settings-page')).toBeVisible()
    await page.getByTestId('settings-patient-name').fill('E2E Child')
    await page.getByTestId('settings-save').click()
    await expect(page.getByText('Saved.')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('public', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-form')).toBeVisible()
  })
})
