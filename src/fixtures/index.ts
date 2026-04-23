import { test as base, expect } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { BaseApiClient } from '../core/BaseApiClient';
import { TestDataFactory } from '../utils/test-data-factory';
import { logger } from '../utils/logger';

// ── Fixture Type Declarations ────────────────────────────────────

type AgentFixtures = {
  basePage: BasePage;
  apiClient: BaseApiClient;
  factory: typeof TestDataFactory;
  authenticatedPage: BasePage;
};

// ── Extended Test with Custom Fixtures ──────────────────────────

export const test = base.extend<AgentFixtures>({
  /**
   * basePage — Fresh browser page wrapped in BasePage.
   */
  basePage: async ({ page }, use) => {
    const bp = new BasePage(page);
    await use(bp);
  },

  /**
   * apiClient — Pre-configured API client with env-based auth.
   */
  apiClient: async ({ request }, use) => {
    const client = new BaseApiClient(request);
    await use(client);
  },

  /**
   * factory — Test data factory (static class, no teardown needed).
   */
  factory: async (_fixture, use) => {
    await use(TestDataFactory);
  },

  /**
   * authenticatedPage — Page with pre-loaded auth state.
   * Uses stored state from global-setup to skip login on every test.
   */
  authenticatedPage: async ({ page }, use) => {
    // storageState is injected by Playwright via project config
    const bp = new BasePage(page);
    logger.info('🔐 Using pre-authenticated page');
    await use(bp);
  },
});

export { expect };
