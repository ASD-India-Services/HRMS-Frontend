import { test, expect, freezeAnimations } from './fixtures'
import { API_BASE_URL } from '../playwright.config'

const DEPARTMENT = { id: 'd1', name: 'Engineering', description: 'Builds things', is_active: true }

test('departments: create modal and confirm dialog primitives', async ({ app: page }) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  }
  const posted: unknown[] = []
  const deleted: string[] = []
  await page.route(new RegExp(`^${API_BASE_URL}/api/v1/departments/`), async (route) => {
    const req = route.request()
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (req.method() === 'POST') {
      posted.push(req.postDataJSON())
      return json({ ...DEPARTMENT, id: 'd2' })
    }
    if (req.method() === 'DELETE') {
      deleted.push(req.url())
      return route.fulfill({ status: 204, headers: cors })
    }
    return json({ count: 1, next: null, previous: null, results: [DEPARTMENT] })
  })

  await page.goto('/departments')
  await expect(page.getByText('Engineering')).toBeVisible()
  await freezeAnimations(page)

  // CrudModal: Escape is ignored (as before the restyle), focus stays inside, submit sends the same payload
  const addButton = page.getByRole('button', { name: 'Add Department' })
  await addButton.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await dialog.getByLabel('Department Name').fill('Finance')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toHaveCount(0)
  expect(posted).toEqual([{ name: 'Finance', description: '', is_active: true }])

  // ConfirmDialog: Escape closes, focus stays inside, confirm still calls the API
  const deleteButton = page.getByRole('button', { name: 'Delete' }).first()
  await deleteButton.click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Delete Department')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  await deleteButton.click()
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(dialog).toHaveCount(0)
  expect(deleted).toHaveLength(1)
  expect(deleted[0]).toContain('/api/v1/departments/d1/')
})
