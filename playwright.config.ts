import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  reporter: [['list']],
  workers: 2,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:4171',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
      // optional: point to an already installed Chromium instead of downloading one
      executablePath: process.env.PW_CHROMIUM || undefined,
    },
  },
  projects: [
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4171',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
