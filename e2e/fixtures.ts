import { test as base, expect, type Page } from '@playwright/test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { API_BASE_URL } from '../playwright.config'

const FROZEN_TIME = new Date('2025-01-15T10:00:00Z')

const FEATURE_FLAGS = [
  'appraisals_enabled', 'attendance_enabled', 'compliance_enabled', 'daily_summary_enabled',
  'employees_enabled', 'expenses_enabled', 'fleet_enabled', 'holidays_enabled', 'leaves_enabled',
  'payroll_enabled', 'recruitment_enabled', 'reports_enabled', 'settlements_enabled',
  'shifts_enabled', 'skills_enabled', 'staffing_enabled', 'tax_benefits_enabled',
  'training_enabled', 'travel_enabled',
]

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

/** Unsigned JWT: AuthProvider only decodes the payload and checks exp. */
function fakeJwt(): { token: string; exp: number } {
  const exp = Math.floor(FROZEN_TIME.getTime() / 1000) + 12 * 3600
  const payload = {
    sub: 'user-1',
    user_id: 'user-1',
    email: 'admin@example.com',
    first_name: 'Ada',
    last_name: 'Admin',
    role: 'org_admin',
    org_id: 'org-1',
    schema_name: 'org_1',
    permissions: [],
    feature_flags: Object.fromEntries(FEATURE_FLAGS.map((f) => [f, true])),
    exp,
  }
  return { token: `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.sig`, exp }
}

/** Every permission-code-looking string literal in src/, so the mocked user is granted all of them. */
function collectPermissionCodes(): string[] {
  const codes = new Set<string>()
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(name)) {
        for (const m of readFileSync(p, 'utf8').matchAll(/['"]([a-z][a-z_]*\.[a-z_]+)['"]/g)) codes.add(m[1])
      }
    }
  }
  walk(join(process.cwd(), 'src'))
  return [...codes]
}

const PERMISSIONS = collectPermissionCodes()
const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] }

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
    })
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

    const { token, exp } = fakeJwt()
    await page.addInitScript(
      ([t, e]) => {
        localStorage.setItem('platform_auth_access_token', t as string)
        localStorage.setItem('platform_auth_refresh_token', t as string)
        localStorage.setItem('platform_auth_token_expiry', String(e))
      },
      [token, exp],
    )

    await page.clock.setFixedTime(FROZEN_TIME)

    await page.route(`${API_BASE_URL}/**`, async (route) => {
      const url = new URL(route.request().url())
      const method = route.request().method()
      const cors = {
        'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      }
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      const json = (body: unknown) =>
        route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
      if (url.pathname.endsWith('/me/permissions/')) {
        return json({ role_name: 'Admin', permissions: PERMISSIONS, permission_scopes: {} })
      }
      if (url.pathname.endsWith('/onboarding/self/status/')) {
        return json({ onboarding_status: 'completed', onboarding_completed_at: null })
      }
      if (method !== 'GET') return json({})
      return json(EMPTY_PAGE)
    })

    await use(page)

    expect(errors, 'console errors / page errors').toEqual([])
  },
})

export async function freezeAnimations(page: Page) {
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
  })
}

export { expect }
