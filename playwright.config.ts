import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, `.env.${process.env.ENV || 'dev'}`) });

export default defineConfig({
  // ── Test Discovery ──────────────────────────────────────────────
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // ── Resilience: Retries & Timeouts ──────────────────────────────
  retries: process.env.CI ? 2 : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // ── Parallelism ─────────────────────────────────────────────────
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,

  // ── Reporting ───────────────────────────────────────────────────
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github'] as ['github']] : []),
  ],

  // ── Global Setup / Teardown ─────────────────────────────────────
  // Global setup runs before all projects and caches Sauce Demo auth
  globalSetup: './src/config/global-setup.ts',
  // globalTeardown: './src/config/global-teardown.ts',

  // ── Shared Settings ─────────────────────────────────────────────
  use: {
    baseURL: process.env.BASE_URL || 'https://www.saucedemo.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // ── Projects ────────────────────────────────────────────────────
  projects: [
    // Auth setup — caches Sauce Demo session
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // UI — Chromium with saved auth
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: ['**/api/**', '**/hybrid/**'],
    },

    // API — ReqRes (no browser UI needed)
    // Hybrid tests need auth for UI interactions with Sauce Demo
    {
      name: 'api',
      use: {
        browserName: 'chromium',
      },
      testMatch: ['**/api/**/*.spec.ts', '**/hybrid/**/*.spec.ts'],
    },
  ],

  outputDir: 'test-results',
});
