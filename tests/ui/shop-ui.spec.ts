import { test, expect } from '@playwright/test';
import { ShopApiClient } from '../../src/api/shop-api';

test.describe('Shop UI', () => {
  let api: ShopApiClient;
  let testUser: { email: string; password: string };

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    api = new ShopApiClient(page.request);
    testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'Test123!',
    };
  });

  // ── Products Page ───────────────────────────────────────────
  test('@smoke - products page loads', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await expect(page.locator('[data-testid="shop-title"]')).toContainText('Shop');
    await expect(page.locator('[data-testid="product-list"]')).toBeVisible();
  });

  test('@smoke - products are displayed', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const products = page.locator('.product-card');
    await expect(products.first()).toBeVisible();
    expect(await products.count()).toBeGreaterThan(0);
  });

  test('@regression - product shows name and price', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const firstProduct = page.locator('.product-card').first();
    await expect(firstProduct.locator('[data-testid="product-name"]')).toBeVisible();
    await expect(firstProduct.locator('[data-testid="product-price"]')).toBeVisible();
  });

  // ── Authentication ───────────────────────────────────────────
  test('@smoke - login page loads', async ({ page }) => {
    await page.click('[data-testid="nav-auth"]');

    await expect(page.locator('[data-testid="auth-title"]')).toContainText('Login');
    await expect(page.locator('[data-testid="input-email"]')).toBeVisible();
  });

  test('@smoke - login with valid credentials', async ({ page }) => {
    // Register first
    await api.register(testUser.email, testUser.password, 'Test', 'User');

    // Now login via UI
    await page.click('[data-testid="nav-auth"]');
    await page.fill('[data-testid="input-email"]', testUser.email);
    await page.fill('[data-testid="input-password"]', testUser.password);
    await page.click('[data-testid="btn-login"]');

    await expect(page.locator('[data-testid="nav-products"]')).toBeVisible();
  });

  test('@regression - login with invalid credentials shows error', async ({ page }) => {
    await page.click('[data-testid="nav-auth"]');
    await page.fill('[data-testid="input-email"]', 'notfound@example.com');
    await page.fill('[data-testid="input-password"]', 'wrongpass');
    await page.click('[data-testid="btn-login"]');

    await expect(page.locator('.alert-error')).toBeVisible();
  });

  // ── Cart Flow ────────────────────────────────────────────────
  test('@smoke - add to cart redirects to login when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.click('[data-testid="btn-add-to-cart"]');

    await expect(page.locator('[data-testid="auth-title"]')).toBeVisible();
  });

  test('@smoke - add to cart when logged in', async ({ page }) => {
    // Create user first
    await api.register(testUser.email, testUser.password);

    // Set token in localStorage for UI
    await page.goto('http://localhost:3000');
    await page.evaluate((token) => localStorage.setItem('token', token), api.token);

    // Refresh and add to cart
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="btn-add-to-cart"]');

    // Should see confirmation
    await page.waitForTimeout(500);
  });

  test('@regression - cart shows items', async ({ page }) => {
    // Create user and add items
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();
    await api.addToCart(products[0].id, 2);

    // Set token and view cart
    await page.goto('http://localhost:3000');
    await page.evaluate((token) => localStorage.setItem('token', token), api.token);
    await page.click('[data-testid="nav-cart"]');

    await expect(page.locator('[data-testid="cart-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });

  test('@regression - cart total displays', async ({ page }) => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();
    await api.addToCart(products[0].id, 1);

    await page.goto('http://localhost:3000');
    await page.evaluate((token) => localStorage.setItem('token', token), api.token);
    await page.click('[data-testid="nav-cart"]');

    await expect(page.locator('[data-testid="cart-total"]')).toContainText('$');
  });

  // ── Checkout Flow ─────────────────────────────────────────────
  test('@smoke - checkout creates order', async ({ page }) => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();
    await api.addToCart(products[0].id, 1);

    await page.goto('http://localhost:3000');
    await page.evaluate((token) => localStorage.setItem('token', token), api.token);
    await page.click('[data-testid="nav-cart"]');
    await page.click('[data-testid="checkout-btn"]');

    await expect(page.locator('[data-testid="orders-title"]')).toBeVisible();
  });

  // ── Orders ───────────────────────────────────────────────────
  test('@regression - orders page shows orders', async ({ page }) => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();
    await api.addToCart(products[0].id, 1);
    await api.createOrder();

    await page.goto('http://localhost:3000');
    await page.evaluate((token) => localStorage.setItem('token', token), api.token);
    await page.click('[data-testid="nav-orders"]');

    await expect(page.locator('[data-testid="orders-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-item"]')).toBeVisible();
  });

  // ── Navigation ──────────────────────────────────────────────
  test('@smoke - navigation between pages', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.click('[data-testid="nav-cart"]');
    await expect(page.locator('[data-testid="cart-title"]')).toBeVisible();

    await page.click('[data-testid="nav-products"]');
    await expect(page.locator('[data-testid="product-list"]')).toBeVisible();

    await page.click('[data-testid="nav-orders"]');
    await expect(page.locator('[data-testid="orders-title"]')).toBeVisible();
  });
});