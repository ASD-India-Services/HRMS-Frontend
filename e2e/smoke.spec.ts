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
  ['leaves-dashboard', '/leaves/dashboard'],
  ['attendance', '/attendance'],
  ['attendance-hour-account', '/attendance/hour-account'],
  ['payroll', '/payroll'],
  ['payroll-runs', '/payroll/runs'],
  ['recruitment-job-openings', '/recruitment/job-openings'],
  ['recruitment-pipeline', '/recruitment/pipeline'],
  ['recruitment-stages', '/recruitment/stages'],
  ['document-requests', '/document-requests'],
  ['gratuity', '/gratuity'],
  ['compensatory-leave', '/compensatory-leave'],
  ['appraisals', '/appraisals'],
  ['expenses', '/expenses'],
  ['settings-general', '/settings/general-settings'],
  ['settings-leave-types', '/settings/leave-types'],
  ['meetings', '/meetings'],
  ['employee-bonus-points', '/employee-bonus-points'],
  ['work-records', '/work-records'],
  ['shift-requests', '/shift-requests'],
  ['company-leaves', '/company-leaves'],
  ['policies', '/policies'],
  ['helpdesk-faqs', '/helpdesk/faqs'],
  ['holiday-lists', '/holiday-lists'],
  ['designations', '/designations'],
  ['branches', '/branches'],
  ['attendance-dashboard', '/attendance/dashboard'],
  ['my-attendance', '/my-attendance'],
  ['shifts', '/shifts'],
  ['payroll-dashboard', '/payroll/dashboard'],
  ['salary-components', '/salary-components'],
  ['recruitment-dashboard', '/recruitment/dashboard'],
  ['recruitment-candidates', '/recruitment/candidates'],
  ['expenses-new', '/expenses/new'],
  ['expenses-approvals', '/expenses/approvals'],
  ['onboarding', '/onboarding'],
  ['onboarding-templates', '/onboarding-templates'],
  ['training', '/training'],
  ['grievances', '/grievances'],
  ['travel', '/travel'],
  ['overtime', '/overtime'],
  ['settlements', '/settlements'],
  ['tax-benefits', '/tax-benefits'],
  ['fleet', '/fleet'],
  ['reports', '/reports'],
  ['compliance', '/compliance'],
  ['staffing', '/staffing'],
  ['leave-policies', '/leave-policies'],
  ['loss-of-pay', '/loss-of-pay'],
  ['kras', '/kras'],
  ['goals', '/goals'],
  ['transfers', '/transfers'],
  ['promotions', '/promotions'],
  ['settings-mail-server', '/settings/mail-server'],
  ['helpdesk', '/helpdesk'],
  ['permissions-dashboard', '/permissions/dashboard'],
  ['admin-roles', '/admin/roles'],
  ['admin-roles-create', '/admin/roles/create'],
  ['audit-logs', '/audit-logs'],
  ['skills', '/skills'],
  ['health-insurance', '/health-insurance'],
  ['document-types', '/document-types'],
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

for (const [slug, path] of [
  ['login', '/login'],
  ['careers', '/careers'],
]) {
  test(`public ${path}`, async ({ app: page }) => {
    await page.goto(path)
    await expect(page.getByText('Something went wrong')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    await freezeAnimations(page)
    await shot(page, slug)
  })
}
