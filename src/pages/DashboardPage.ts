import { Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get welcomeMessage() {
    return this.selfHeal({ testId: 'welcome-message', css: 'h1, .welcome' });
  }

  get navMenu() {
    return this.selfHeal({ role: 'navigation', roleName: 'Main', css: 'nav' });
  }

  get userAvatar() {
    return this.selfHeal({ testId: 'user-avatar', css: '.avatar, [aria-label="User menu"]' });
  }

  get logoutButton() {
    return this.selfHeal({
      testId: 'logout-button',
      role: 'button',
      roleName: 'Logout',
      text: 'Logout',
    });
  }

  async goto() {
    await this.navigate('/dashboard');
  }

  async logout() {
    await this.click(this.userAvatar);
    await this.click(this.logoutButton);
    await this.waitForURL(/\/login/);
  }

  async isLoaded(): Promise<boolean> {
    return this.isVisible(this.welcomeMessage);
  }
}
