import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, freezeAnimations } from './fixtures'

const SHOT_DIR =
  process.env.SHOT_DIR ??
  '/Users/admin/Documents/GitHub/Leadspoint CRM/hrms-frontend/.agents/tasks/hrms-minimal-restyle/screens'
const SHOT_NAME = process.env.SHOT_NAME ?? 'baseline'

const ROUTES: Array<[slug: string, path: string]> = [
  ['dashboard', '/dashboard'],
  ['profile', '/profile'],
  ['employees', '/employees'],
  ['employees-new', '/employees/new'],
  ['org-chart', '/org-chart'],
  ['departments', '/departments'],
  ['leaves', '/leaves'],
  ['my-leaves-apply', '/my-leaves/apply'],
  ['leaves-approvals', '/leaves/approvals'],
  ['attendance', '/attendance'],
  ['attendance-hour-account', '/attendance/hour-account'],
  ['payroll', '/payroll'],
  ['payroll-runs', '/payroll/runs'],
  ['recruitment-job-openings', '/recruitment/job-openings'],
  ['recruitment-pipeline', '/recruitment/pipeline'],
  ['appraisals', '/appraisals'],
  ['expenses', '/expenses'],
  ['settings-general', '/settings/general-settings'],
]

async function shot(page: import('@playwright/test').Page, slug: string) {
  const dir = join(SHOT_DIR, SHOT_NAME)
  mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: join(dir, `${slug}.png`), animations: 'disabled' })
}

async function assertHealthy(page: import('@playwright/test').Page) {
  await expect(page.locator('main')).toBeVisible()
  await expect(page.getByText('Something went wrong')).toHaveCount(0)
  await expect(page.getByText('Page not found')).toHaveCount(0)
  await page.waitForLoadState('networkidle')
  await freezeAnimations(page)
}

for (const [slug, path] of ROUTES) {
  test(`route ${path}`, async ({ app: page }) => {
    await page.goto(path)
    await assertHealthy(page)
    await shot(page, slug)
  })
}

test('departments create modal', async ({ app: page }) => {
  await page.goto('/departments')
  await assertHealthy(page)
  await page.getByRole('button', { name: 'Add Department' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await freezeAnimations(page)
  await shot(page, 'departments-create-modal')
})
