import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
const systemBrowser =
  process.env.CHROMIUM_PATH ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
const publicURL = process.env.MATHX_TEST_URL
if (!publicURL) {
  process.env.MATHX_CLASS_PASSWORD ||= randomBytes(18).toString('hex')
  process.env.MATHX_SESSION_SECRET ||= randomBytes(32).toString('hex')
}
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.browser.spec.ts',
  workers: 2,
  use: {
    baseURL: publicURL || 'http://127.0.0.1:4182',
    launchOptions: { executablePath: systemBrowser },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 960 } } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: publicURL
    ? undefined
    : {
        command: 'node tests/preview.mjs',
        url: 'http://127.0.0.1:4182',
        reuseExistingServer: false,
      },
})
