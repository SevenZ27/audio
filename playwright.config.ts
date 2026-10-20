import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  reporter: [['list']],
  workers: 2,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:4171',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
      // optional: point to an already installed Chromium instead of downloading one
      executablePath: process.env.PW_CHROMIUM || undefined,
    },
  },
  projects: [
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1',
    url: 'http://127.0.0.1:4171',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
