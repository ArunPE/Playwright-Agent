import { Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { logger } from '../utils/logger';

/**
 * LoginPage — Sauce Demo (https://www.saucedemo.com)
 *
 * Available test users:
 *   standard_user           / secret_sauce  → works normally
 *   locked_out_user         / secret_sauce  → gets blocked
 *   problem_user            / secret_sauce  → broken images
 *   performance_glitch_user / secret_sauce  → slow load
 */
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Locators — Self-Healing Priority Chain ────────────────────

  get usernameInput() {
    return this.selfHeal({
      css: '#user-name',
      placeholder: 'Username',
    });
  }

  get passwordInput() {
    return this.selfHeal({
      css: '#password',
      placeholder: 'Password',
    });
  }

  get loginButton() {
    return this.selfHeal({
      css: '#login-button',
      role: 'button',
      roleName: 'Login',
    });
  }

  get errorMessage() {
    return this.selfHeal({
      css: '[data-test="error"]',
      text: 'Epic sadface',
    });
  }

  get errorCloseButton() {
    return this.page.locator('.error-button');
  }

  // ── Actions ───────────────────────────────────────────────────

  async goto() {
    await this.navigate('/');
  }

  async login(username: string, password: string) {
    logger.info(`🔐 Logging in as: ${username}`);
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
  }

  async loginAndExpectSuccess(username = 'standard_user', password = 'secret_sauce') {
    await this.login(username, password);
    await this.waitForURL('**/inventory.html');
    logger.info('✅ Login successful');
  }

  async loginAndExpectError(username: string, password: string): Promise<string> {
    await this.login(username, password);
    await this.assertVisible(this.errorMessage);
    return this.getTextContent(this.errorMessage);
  }

  async dismissError() {
    await this.click(this.errorCloseButton);
  }
}
