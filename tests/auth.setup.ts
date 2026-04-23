import { test as setup } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/user.json');

/**
 * Auth Setup — logs into Sauce Demo once, caches session for all UI tests.
 * Sauce Demo credentials: standard_user / secret_sauce
 */
setup('authenticate: Sauce Demo', async ({ page }) => {
  await page.goto('https://www.saucedemo.com');
  await page.locator('#user-name').fill(process.env.AUTH_USERNAME || 'standard_user');
  await page.locator('#password').fill(process.env.AUTH_PASSWORD || 'secret_sauce');
  await page.locator('#login-button').click();
  await page.waitForURL('**/inventory.html');
  await page.context().storageState({ path: AUTH_FILE });
});
