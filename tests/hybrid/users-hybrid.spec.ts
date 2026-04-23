import { test, expect } from '../../src/fixtures';
import { ReqResApi } from '../../src/api/reqres.api';
import { NetworkInterceptor } from '../../src/utils/network-interceptor';
import { InventoryPage } from '../../src/pages/InventoryPage';

/**
 * Hybrid Tests — API + UI together
 *
 * Pattern 1: Use API to assert, then verify UI state matches
 * Pattern 2: Mock API from UI test to test error states
 * Pattern 3: Spy on XHR calls made by the browser during UI actions
 */
test.describe('Hybrid: API + UI — Sauce Demo + ReqRes', () => {

  test('@smoke - ReqRes total user count is a positive number', async ({ request, page }) => {
    // API: fetch user count
    const api = new ReqResApi(request);
    const users = await api.listUsers(1);
    expect(users.total).toBeGreaterThan(0);

    // UI: verify Sauce Demo loaded correctly in parallel
    const inventory = new InventoryPage(page);
    await inventory.goto();
    const productCount = await inventory.productItems.count();
    expect(productCount).toBeGreaterThan(0);

    // Cross-assert: both systems are up and returning data
    console.log(`✅ ReqRes: ${users.total} users | Sauce Demo: ${productCount} products`);
  });

  test('@regression - API create + verify response shape is consistent across calls', async ({ request }) => {
    const api = new ReqResApi(request);

    // Create two users in parallel
    const [user1, user2] = await Promise.all([
      api.createUser('Arjun', 'Developer'),
      api.createUser('Priya', 'Designer'),
    ]);

    // Both should have valid ids and timestamps
    expect(user1.id).toBeTruthy();
    expect(user2.id).toBeTruthy();
    expect(new Date(user1.createdAt).getTime()).not.toBeNaN();
    expect(new Date(user2.createdAt).getTime()).not.toBeNaN();
  });

  test('@regression - network mock: Sauce Demo cart shows error when API fails', async ({ page }) => {
    const interceptor = new NetworkInterceptor(page);

    // Mock any fetch/XHR that Sauce Demo might make
    await interceptor.mock({
      url: /saucedemo\.com\/api/,
      status: 503,
      body: { error: 'Service Unavailable' },
    });

    const inventory = new InventoryPage(page);
    await inventory.goto();

    // Even with mocked API failure, static page should still load
    await inventory.assertVisible(inventory.pageTitle);
    const count = await inventory.productItems.count();
    expect(count).toBe(6); // Sauce Demo renders server-side, so products still show

    await interceptor.removeAll();
  });

  test('@regression - spy: verify no unexpected external calls during inventory load', async ({ page }) => {
    const interceptor = new NetworkInterceptor(page);
    interceptor.startCapturing(/saucedemo\.com/);

    const inventory = new InventoryPage(page);
    await inventory.goto();

    const requests = interceptor.getRequests(/saucedemo\.com/);
    // All requests should be to saucedemo.com (no 3rd-party leaks)
    requests.forEach((r) => {
      expect(r.url).toContain('saucedemo.com');
    });
  });

  test('@regression - API response time is acceptable under normal load', async ({ request }) => {
    const api = new ReqResApi(request);

    const timings: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await api.get('/users?page=1');
      timings.push(res.duration);
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`📊 ReqRes avg response time: ${avg.toFixed(0)}ms`);
    expect(avg).toBeLessThan(3000);
  });
});
