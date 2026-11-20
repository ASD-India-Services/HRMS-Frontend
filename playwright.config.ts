import { defineConfig } from '@playwright/test'

const PORT = 5199
export const BASE_URL = `http://127.0.0.1:${PORT}`
export const API_BASE_URL = 'http://127.0.0.1:59002'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort --host 127.0.0.1 --no-open`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL: API_BASE_URL,
      VITE_IDENTITY_CENTER_URL: 'http://127.0.0.1:59001',
      VITE_AUTH_CLIENT_ID: 'hrms-frontend',
      VITE_AUTH_REDIRECT_URI: `${BASE_URL}/auth/callback`,
    },
  },
})
