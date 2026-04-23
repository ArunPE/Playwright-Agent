import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { logger } from '../utils/logger';
import { retry } from '../utils/retry';

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  rating: number;
}

export interface ShopUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  token?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product?: ShopProduct;
  subtotal?: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
  ok: boolean;
  duration: number;
}

/**
 * ShopApiClient — Client for the retail shop backend API.
 */
export class ShopApiClient {
  protected request: APIRequestContext;
  protected baseURL: string;
  protected token: string | null = null;

  constructor(request: APIRequestContext, baseURL = 'http://localhost:3000') {
    this.request = request;
    this.baseURL = baseURL;
  }

  // ── Auth ────────────────────────────────────────────────────────

  setToken(token: string): void {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ── Core HTTP Methods ───────────────────────────────────────────

  private async _send<T>(
    method: string,
    path: string,
    body?: unknown,
    options: { retries?: number } = {}
  ): Promise<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    const headers = this.getHeaders();

    logger.info(`📡 ${method} ${url}`);

    const start = Date.now();

    const response = await retry<APIResponse>(
      async () => {
        const res = await this.request.fetch(url, {
          method,
          headers,
          data: body ? JSON.stringify(body) : undefined,
          timeout: 30_000,
        });

        if (res.status() >= 500) {
          throw new Error(`Server error ${res.status()} — will retry`);
        }
        return res;
      },
      { retries: options.retries || 2, delay: 500, label: `${method} ${path}` }
    );

    const duration = Date.now() - start;
    const status = response.status();
    const responseHeaders = response.headers();
    let responseBody: T;

    try {
      const text = await response.text();
      responseBody = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      responseBody = {} as T;
    }

    logger.info(`   ← ${status} (${duration}ms)`);

    return {
      status,
      headers: responseHeaders as Record<string, string>,
      body: responseBody,
      ok: status >= 200 && status < 300,
      duration,
    };
  }

  // ── Products API ────────────────────────────────────────────────

  async listProducts(filters?: { category?: string; search?: string }): Promise<ShopProduct[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const res = await this._send<ShopProduct[]>(
      'GET',
      `/api/products${query ? `?${query}` : ''}`
    );
    return res.body;
  }

  async getProduct(id: string): Promise<ShopProduct> {
    const res = await this._send<ShopProduct>('GET', `/api/products/${id}`);
    return res.body;
  }

  async createProduct(product: Partial<ShopProduct>): Promise<ShopProduct> {
    const res = await this._send<ShopProduct>('POST', '/api/products', product);
    return res.body;
  }

  async updateProduct(id: string, updates: Partial<ShopProduct>): Promise<ShopProduct> {
    const res = await this._send<ShopProduct>('PUT', `/api/products/${id}`, updates);
    return res.body;
  }

  async deleteProduct(id: string): Promise<void> {
    await this._send('DELETE', `/api/products/${id}`);
  }

  // ── Auth API ───────────────────────────────────────────────────

  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<ShopUser> {
    const res = await this._send<{ user: Omit<ShopUser, 'token'>; token: string }>('POST', '/api/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    this.token = res.body.token;
    return { ...res.body.user, token: res.body.token };
  }

  async login(email: string, password: string): Promise<ShopUser> {
    const res = await this._send<{ user: Omit<ShopUser, 'token'>; token: string }>('POST', '/api/auth/login', {
      email,
      password,
    });
    this.token = res.body.token;
    return { ...res.body.user, token: res.body.token };
  }

  async getMe(): Promise<Omit<ShopUser, 'token'>> {
    const res = await this._send<Omit<ShopUser, 'token'>>('GET', '/api/auth/me');
    return res.body;
  }

  // ── Cart API ──────────────────────────────────────────────────

  async getCart(): Promise<Cart> {
    const res = await this._send<Cart>('GET', '/api/cart');
    return res.body;
  }

  async addToCart(productId: string, quantity = 1): Promise<Cart> {
    const res = await this._send<Cart>('POST', '/api/cart/add', { productId, quantity });
    return res.body;
  }

  async updateCartItem(productId: string, quantity: number): Promise<Cart> {
    const res = await this._send<Cart>('PUT', '/api/cart/update', { productId, quantity });
    return res.body;
  }

  async removeFromCart(productId: string): Promise<Cart> {
    const res = await this._send<Cart>('DELETE', `/api/cart/remove/${productId}`);
    return res.body;
  }

  async clearCart(): Promise<Cart> {
    const res = await this._send<Cart>('DELETE', '/api/cart/clear');
    return res.body;
  }

  // ── Orders API ────────────────────────────────────────────────

  async createOrder(shippingAddress?: Record<string, string>): Promise<Order> {
    const res = await this._send<Order>('POST', '/api/orders', { shippingAddress: shippingAddress || {} });
    return res.body;
  }

  async listOrders(): Promise<Order[]> {
    const res = await this._send<Order[]>('GET', '/api/orders');
    return res.body;
  }

  async getOrder(id: string): Promise<Order> {
    const res = await this._send<Order>('GET', `/api/orders/${id}`);
    return res.body;
  }

  // ── Assertions ───────────────────────────────────────────────

  assertStatus(response: ApiResponse, expected: number): void {
    expect(response.status, `Expected ${expected}, got ${response.status}`).toBe(expected);
  }

  assertOk(response: ApiResponse): void {
    expect(response.ok, `Request failed with status ${response.status}`).toBe(true);
  }
}