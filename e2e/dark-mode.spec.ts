import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, freezeAnimations } from './fixtures'
const SHOT_DIR =
  process.env.SHOT_DIR ??
  '/Users/admin/Documents/GitHub/Leadspoint CRM/hrms-frontend/.agents/tasks/hrms-minimal-restyle/screens'
const SHOT_NAME = process.env.SHOT_NAME ?? 'baseline'
const KEY_ROUTES: Array<[slug: string, path: string]> = [
  ['dashboard', '/dashboard'],
  ['employees', '/employees'],
  ['org-chart', '/org-chart'],
  ['departments', '/departments'],
  ['attendance-hour-account', '/attendance/hour-account'],
  ['payroll', '/payroll'],
  ['recruitment-pipeline', '/recruitment/pipeline'],
  ['settings-general', '/settings/general-settings'],
]
test('header toggle switches mode and persists it', async ({ app: page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await page.evaluate(() => localStorage.getItem('theme-mode'))).toBe('dark')
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})
for (const [slug, path] of KEY_ROUTES) {
  test(`dark route ${path}`, async ({ app: page }) => {
    await page.addInitScript(() => localStorage.setItem('theme-mode', 'dark'))
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByText('Something went wrong')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    await freezeAnimations(page)
    await expect(page.locator('html')).toHaveClass(/dark/)
    const dir = join(SHOT_DIR, `${SHOT_NAME}-dark`)
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: join(dir, `${slug}.png`), animations: 'disabled' })
  })
}
