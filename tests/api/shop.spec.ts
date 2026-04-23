import { test, expect } from '@playwright/test';
import { ShopApiClient } from '../../src/api/shop-api';

test.describe('Shop API', () => {
  let api: ShopApiClient;
  let testUser: { email: string; password: string };

  test.beforeEach(async ({ request }) => {
    api = new ShopApiClient(request);
    testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'Test123!',
    };
  });

  // ── Health Check ──────────────────────────────────────────────
  test('@smoke - GET /api/health returns ok', async () => {
    const res = await api.listProducts();
    // If we get here without error, API is running
    expect(Array.isArray(res)).toBe(true);
  });

  // ── Products ─────────────────────────────────────────────────
  test('@smoke - GET /api/products returns product list', async () => {
    const products = await api.listProducts();

    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('id');
    expect(products[0]).toHaveProperty('name');
    expect(products[0]).toHaveProperty('price');
  });

  test('@regression - products can be filtered by category', async () => {
    const electronics = await api.listProducts({ category: 'Electronics' });

    expect(electronics.length).toBeGreaterThan(0);
    for (const product of electronics) {
      expect(product.category).toBe('Electronics');
    }
  });

  test('@smoke - GET /api/products/:id returns single product', async () => {
    const products = await api.listProducts();
    const product = await api.getProduct(products[0].id);

    expect(product.id).toBe(products[0].id);
    expect(product.name).toBe(products[0].name);
  });

  test('@regression - get non-existent product returns 404', async ({ request }) => {
    const client = new ShopApiClient(request);
    const res = await client._send('GET', '/api/products/99999');
    expect(res.status).toBe(404);
  });

  // ── Authentication ───────────────────────────────────────────
  test('@smoke - POST /api/auth/register creates new user', async () => {
    const user = await api.register(testUser.email, testUser.password, 'Test', 'User');

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testUser.email);
    expect(user.token).toBeDefined();
  });

  test('@smoke - POST /api/auth/login returns token', async () => {
    await api.register(testUser.email, testUser.password);
    const user = await api.login(testUser.email, testUser.password);

    expect(user.token).toBeDefined();
    expect(user.email).toBe(testUser.email);
  });

  test('@regression - login with wrong password fails', async () => {
    await api.register(testUser.email, testUser.password);

    const client = new ShopApiClient(api.request);
    const res = await client._send('POST', '/api/auth/login', {
      email: testUser.email,
      password: 'WrongPassword',
    });

    expect(res.status).toBe(401);
  });

  test('@regression - duplicate email registration fails', async () => {
    await api.register(testUser.email, testUser.password);

    const client = new ShopApiClient(api.request);
    const res = await client._send('POST', '/api/auth/register', {
      email: testUser.email,
      password: 'AnotherPass123!',
    });

    expect(res.status).toBe(400);
  });

  test('@smoke - GET /api/auth/me returns current user', async () => {
    await api.register(testUser.email, testUser.password);
    const me = await api.getMe();

    expect(me.email).toBe(testUser.email);
  });

  // ── Cart ─────────────────────────────────────────────────────
  test('@smoke - add item to cart', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    const cart = await api.addToCart(products[0].id, 2);

    expect(cart.items.length).toBe(1);
    expect(cart.items[0].productId).toBe(products[0].id);
    expect(cart.items[0].quantity).toBe(2);
  });

  test('@smoke - cart total calculates correctly', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    await api.addToCart(products[1].id, 1);

    const cart = await api.getCart();
    const expectedTotal = products[0].price + products[1].price;

    expect(cart.total).toBeCloseTo(expectedTotal, 2);
  });

  test('@regression - update cart item quantity', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    const cart = await api.updateCartItem(products[0].id, 5);

    expect(cart.items[0].quantity).toBe(5);
  });

  test('@regression - remove item from cart', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    const cart = await api.removeFromCart(products[0].id);

    expect(cart.items.length).toBe(0);
  });

  test('@smoke - clear cart', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    const cart = await api.clearCart();

    expect(cart.items.length).toBe(0);
    expect(cart.total).toBe(0);
  });

  // ── Orders ───────────────────────────────────────────────────
  test('@smoke - create order from cart', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    await api.addToCart(products[1].id, 2);

    const order = await api.createOrder();

    expect(order.id).toBeDefined();
    expect(order.items.length).toBe(2);
    expect(order.status).toBe('pending');
    expect(order.total).toBeGreaterThan(0);
  });

  test('@regression - order clears cart', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    await api.createOrder();

    const cart = await api.getCart();
    expect(cart.items.length).toBe(0);
  });

  test('@smoke - list user orders', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    await api.createOrder();

    const orders = await api.listOrders();

    expect(orders.length).toBeGreaterThan(0);
  });

  test('@smoke - get order details', async () => {
    await api.register(testUser.email, testUser.password);
    const products = await api.listProducts();

    await api.addToCart(products[0].id, 1);
    const created = await api.createOrder();

    const order = await api.getOrder(created.id);

    expect(order.id).toBe(created.id);
    expect(order.items.length).toBe(1);
  });

  test('@regression - empty cart cannot create order', async () => {
    await api.register(testUser.email, testUser.password);

    const client = new ShopApiClient(api.request);
    client.setToken(api.token!);

    const res = await client._send('POST', '/api/orders', {});
    expect(res.status).toBe(400);
  });
});