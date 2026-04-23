import { Page, Locator, expect } from '@playwright/test';
import { logger } from '../utils/logger';
import { retry } from '../utils/retry';

/**
 * BasePage — The heart of the resilient UI automation agent.
 *
 * Features:
 *  ✅ Self-healing locator strategy (fallback chain)
 *  ✅ Smart waits (network idle, visibility, stability)
 *  ✅ Auto-retry on flaky interactions
 *  ✅ Rich logging for every action
 *  ✅ Screenshot on failure helpers
 */
export class BasePage {
  readonly page: Page;
  readonly defaultTimeout: number;

  constructor(page: Page, timeout = 15_000) {
    this.page = page;
    this.defaultTimeout = timeout;
  }

  // ── Navigation ─────────────────────────────────────────────────

  async navigate(path: string): Promise<void> {
    logger.info(`🌐 Navigating to: ${path}`);
    await this.page.goto(path, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    await this.waitForPageStable();
  }

  async waitForPageStable(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for no pending network requests
    await this.page.waitForLoadState('networkidle').catch(() => {
      // networkidle can timeout on heavy apps — not fatal
      logger.warn('⚠️  Network did not idle — proceeding anyway');
    });
  }

  // ── Self-Healing Locator Strategy ──────────────────────────────

  /**
   * Resolves a locator using a priority-ordered fallback chain.
   * Order: testId → aria-label → role → text → css
   */
  selfHeal(options: {
    testId?: string;
    label?: string;
    role?: Parameters<Page['getByRole']>[0];
    roleName?: string;
    text?: string;
    css?: string;
    placeholder?: string;
  }): Locator {
    const { testId, label, role, roleName, text, css, placeholder } = options;

    if (testId) return this.page.getByTestId(testId);
    if (label) return this.page.getByLabel(label);
    if (role && roleName) return this.page.getByRole(role, { name: roleName });
    if (placeholder) return this.page.getByPlaceholder(placeholder);
    if (text) return this.page.getByText(text, { exact: false });
    if (css) return this.page.locator(css);

    throw new Error('selfHeal: at least one locator strategy must be provided');
  }

  /**
   * Tries multiple locator strategies in order until one is visible.
   * True self-healing: survives locator changes between releases.
   */
  async resolveLocator(strategies: Locator[], timeout = 5_000): Promise<Locator> {
    for (const locator of strategies) {
      try {
        await locator.waitFor({ state: 'visible', timeout });
        logger.debug(`✅ Locator resolved: ${locator}`);
        return locator;
      } catch {
        // try next
      }
    }
    throw new Error(`All ${strategies.length} locator strategies failed`);
  }

  // ── Resilient Actions ──────────────────────────────────────────

  async click(locator: Locator, options?: { retries?: number; force?: boolean }): Promise<void> {
    const { retries = 3, force = false } = options || {};
    logger.info(`🖱️  Click: ${locator}`);
    await retry(
      async () => {
        await locator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
        await locator.scrollIntoViewIfNeeded();
        await locator.click({ force, timeout: this.defaultTimeout });
      },
      { retries, delay: 500, label: 'click' }
    );
  }

  async fill(locator: Locator, value: string, options?: { clear?: boolean }): Promise<void> {
    const { clear = true } = options || {};
    logger.info(`⌨️  Fill: "${value}"`);
    await retry(
      async () => {
        await locator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
        if (clear) await locator.clear();
        await locator.fill(value);
      },
      { retries: 3, delay: 300, label: 'fill' }
    );
  }

  async selectOption(locator: Locator, value: string): Promise<void> {
    logger.info(`📋 SelectOption: "${value}"`);
    // Wait for the element to be attached and visible
    await locator.waitFor({ state: 'attached', timeout: this.defaultTimeout });
    await locator.click(); // Click to open the dropdown first
    // Wait for options to be available
    await this.page.waitForTimeout(200);
    await locator.selectOption(value);
  }

  async hover(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
    await locator.hover();
  }

  async check(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
    await locator.check();
  }

  async uploadFile(locator: Locator, filePath: string): Promise<void> {
    logger.info(`📁 Upload: ${filePath}`);
    await locator.setInputFiles(filePath);
  }

  // ── Smart Waits ────────────────────────────────────────────────

  async waitForVisible(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: timeout || this.defaultTimeout });
  }

  async waitForHidden(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout: timeout || this.defaultTimeout });
  }

  async waitForText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toContainText(text, { timeout: this.defaultTimeout });
  }

  async waitForURL(pattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(pattern, { timeout: 30_000 });
  }

  /**
   * Waits for a loading spinner/skeleton to disappear before proceeding.
   */
  async waitForLoader(
    loaderSelector = '[data-testid="loader"], .spinner, .skeleton',
    timeout = 30_000
  ): Promise<void> {
    const loader = this.page.locator(loaderSelector);
    const count = await loader.count();
    if (count > 0) {
      await loader.first().waitFor({ state: 'hidden', timeout });
    }
  }

  // ── Assertions ─────────────────────────────────────────────────

  async assertVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
  }

  async assertText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toContainText(text, { timeout: this.defaultTimeout });
  }

  async assertURL(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expected, { timeout: this.defaultTimeout });
  }

  async assertTitle(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(expected, { timeout: this.defaultTimeout });
  }

  // ── Utilities ──────────────────────────────────────────────────

  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  async getTextContent(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async acceptDialog(): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept());
  }
}
