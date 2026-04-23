import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { InventoryPage } from '../../src/pages/InventoryPage';

/**
 * UI Tests: Login — Sauce Demo
 * https://www.saucedemo.com
 */
test.describe('Login — Sauce Demo', () => {

  // ── Happy Path ───────────────────────────────────────────────────

  test('@smoke - standard_user lands on inventory after login', async ({ page }) => {
    const inventory = new InventoryPage(page);
    await inventory.goto(); // auth state pre-loaded by setup project
    await inventory.assertVisible(inventory.pageTitle);
    await inventory.assertURL(/inventory\.html/);
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('login-success', { body: screenshotBuffer, contentType: 'image/png' });
  });

  // ── Negative Cases ───────────────────────────────────────────────

  test('@regression - locked_out_user sees error', async ({ page }) => {
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    const error = await loginPage.loginAndExpectError('locked_out_user', 'secret_sauce');
    expect(error).toContain('locked out');
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('locked-out-error', { body: screenshotBuffer, contentType: 'image/png' });
  });

  test('@regression - wrong password shows mismatch error', async ({ page }) => {
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    const error = await loginPage.loginAndExpectError('standard_user', 'wrong_password');
    expect(error).toContain('Username and password do not match');
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('wrong-password-error', { body: screenshotBuffer, contentType: 'image/png' });
  });

  test('@regression - empty username shows required error', async ({ page }) => {
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.click(loginPage.loginButton);
    await loginPage.assertVisible(loginPage.errorMessage);
    const error = await loginPage.getTextContent(loginPage.errorMessage);
    expect(error).toContain('Username is required');
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('empty-username-error', { body: screenshotBuffer, contentType: 'image/png' });
  });

  test('@regression - error banner can be dismissed', async ({ page }) => {
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndExpectError('bad_user', 'bad_pass');
    await loginPage.dismissError();
    await loginPage.waitForHidden(loginPage.errorMessage);
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('error-dismissed', { body: screenshotBuffer, contentType: 'image/png' });
  });

  // ── Logout ───────────────────────────────────────────────────────

  test('@regression - logged-in user can log out', async ({ page }) => {
    const inventory = new InventoryPage(page);
    await inventory.goto();
    await inventory.logout();
    await inventory.assertURL(/saucedemo\.com\/?$/);
  });
});
