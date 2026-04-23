import { test, expect } from '@playwright/test';
import { InventoryPage } from '../../src/pages/InventoryPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { CartPage } from '../../src/pages/CartPage';
import { CheckoutPage } from '../../src/pages/CheckoutPage';

/**
 * UI Tests: Shopping flow — Sauce Demo
 * Covers: product listing, sorting, cart, checkout
 */
test.describe('Inventory & Shopping — Sauce Demo', () => {

  let inventory: InventoryPage;
  let login: LoginPage;

  test.beforeEach(async ({ page }) => {
    inventory = new InventoryPage(page);
    login = new LoginPage(page);

    // Navigate to base URL and check if logged in
    await page.goto('/');
    const url = page.url();

    // If redirected to login, authenticate
    if (url.includes('saucedemo.com') && !url.includes('inventory')) {
      await login.loginAndExpectSuccess();
    }

    // Now go to inventory page
    await inventory.goto();
  });

  // ── Product Listing ──────────────────────────────────────────────

  test('@smoke - inventory page loads with 6 products', async ({ page }) => {
    await inventory.assertVisible(inventory.pageTitle);
    const count = await inventory.productItems.count();
    expect(count).toBe(6);
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('inventory-loaded', { body: screenshotBuffer, contentType: 'image/png' });
  });

  test('@regression - all product names are visible', async () => {
    const names = await inventory.getAllProductNames();
    expect(names.length).toBe(6);
    names.forEach((name) => expect(name.trim().length).toBeGreaterThan(0));
  });

  test('@regression - all product prices are positive numbers', async () => {
    const prices = await inventory.getAllProductPrices();
    prices.forEach((price) => expect(price).toBeGreaterThan(0));
  });

  // ── Sorting ──────────────────────────────────────────────────────

  test('@regression - sort A→Z orders products alphabetically', async () => {
    await inventory.sortBy('az');
    const names = await inventory.getAllProductNames();
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  test('@regression - sort Z→A reverses alphabetical order', async () => {
    await inventory.sortBy('za');
    const names = await inventory.getAllProductNames();
    const sorted = [...names].sort().reverse();
    expect(names).toEqual(sorted);
  });

  test('@regression - sort low→high orders prices ascending', async () => {
    await inventory.sortBy('lohi');
    const prices = await inventory.getAllProductPrices();
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  test('@regression - sort high→low orders prices descending', async () => {
    await inventory.sortBy('hilo');
    const prices = await inventory.getAllProductPrices();
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  // ── Cart ─────────────────────────────────────────────────────────

  test('@smoke - adding a product increments cart badge', async ({ page }) => {
    expect(await inventory.getCartCount()).toBe(0);
    await inventory.addToCart('Sauce Labs Backpack');
    expect(await inventory.getCartCount()).toBe(1);
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('product-added-to-cart', { body: screenshotBuffer, contentType: 'image/png' });
  });

  test('@regression - adding multiple products updates badge count', async () => {
    await inventory.addToCart('Sauce Labs Backpack');
    await inventory.addToCart('Sauce Labs Bike Light');
    await inventory.addToCart('Sauce Labs Bolt T-Shirt');
    expect(await inventory.getCartCount()).toBe(3);
  });

  test('@regression - added product appears in cart', async ({ page }) => {
    await inventory.addToCart('Sauce Labs Fleece Jacket');
    await inventory.goToCart();

    const cart = new CartPage(page);
    const count = await cart.getItemCount();
    expect(count).toBe(1);

    const item = cart.cartItemByName('Sauce Labs Fleece Jacket');
    await expect(item).toBeVisible();
  });

  test('@regression - item can be removed from cart', async ({ page }) => {
    await inventory.addToCart('Sauce Labs Onesie');
    await inventory.goToCart();

    const cart = new CartPage(page);
    await cart.removeItem('Sauce Labs Onesie');
    expect(await cart.getItemCount()).toBe(0);
  });

  // ── End-to-End Checkout ──────────────────────────────────────────

  test('@smoke - complete purchase end-to-end', async ({ page }) => {
    // Add items
    await inventory.addToCart('Sauce Labs Backpack');
    await inventory.addToCart('Sauce Labs Bike Light');
    await inventory.goToCart();

    // Checkout step 1
    const cart = new CartPage(page);
    await cart.proceedToCheckout();

    // Checkout step 2
    const checkout = new CheckoutPage(page);
    await checkout.fillShippingInfo('Arun', 'QA', '560001');

    const total = await checkout.getTotalAmount();
    expect(total).toBeGreaterThan(0);

    // Finish
    await checkout.finish();
    expect(await checkout.isOrderComplete()).toBe(true);

    const header = await checkout.getTextContent(checkout.confirmationHeader);
    expect(header).toContain('Thank you');
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await test.info().attach('checkout-complete', { body: screenshotBuffer, contentType: 'image/png' });
  });
});
