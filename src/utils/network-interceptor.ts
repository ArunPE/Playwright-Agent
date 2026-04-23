import { Page, Route, Request, Response } from '@playwright/test';
import { logger } from './logger';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL';

export interface MockOptions {
  url: string | RegExp;
  method?: HttpMethod;
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  delay?: number;
}

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
}

export interface CapturedResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

/**
 * NetworkInterceptor — Mock, spy, and assert on network traffic from UI tests.
 *
 * Features:
 *  ✅ Mock API responses (return static JSON without hitting server)
 *  ✅ Block specific requests (simulate offline/errors)
 *  ✅ Capture request/response pairs for assertion
 *  ✅ Simulate latency (slow network testing)
 *  ✅ Wait for specific network calls
 */
export class NetworkInterceptor {
  private page: Page;
  private capturedRequests: CapturedRequest[] = [];
  private capturedResponses: CapturedResponse[] = [];
  private mocks: MockOptions[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  // ── Mocking ─────────────────────────────────────────────────────

  /**
   * Mock a network request with a static response.
   * Call before navigation / action that triggers the request.
   */
  async mock(options: MockOptions): Promise<void> {
    const { url, method = 'ALL', status = 200, body = {}, headers = {}, delay = 0 } = options;
    this.mocks.push(options);

    await this.page.route(url, async (route: Route) => {
      const req = route.request();
      if (method !== 'ALL' && req.method() !== method) {
        await route.continue();
        return;
      }

      if (delay > 0) await this._sleep(delay);

      logger.info(`🎭 Mock: ${req.method()} ${req.url()} → ${status}`);
      await route.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    });
  }

  /**
   * Mock with an error response (e.g., 500, 404, 503).
   */
  async mockError(url: string | RegExp, status = 500, message = 'Internal Server Error') {
    await this.mock({ url, status, body: { error: message } });
  }

  /**
   * Block requests (simulate network failure).
   */
  async block(url: string | RegExp): Promise<void> {
    await this.page.route(url, (route) => {
      logger.info(`🚫 Blocked: ${route.request().url()}`);
      route.abort('failed');
    });
  }

  // ── Capturing / Spying ──────────────────────────────────────────

  /**
   * Start capturing all requests matching a URL pattern.
   */
  startCapturing(urlPattern?: string | RegExp): void {
    const pattern = urlPattern || '**';

    this.page.on('request', (request: Request) => {
      if (!this._matches(request.url(), pattern)) return;
      this.capturedRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers() as Record<string, string>,
        body: this._parseBody(request.postData()),
        timestamp: Date.now(),
      });
    });

    this.page.on('response', async (response: Response) => {
      if (!this._matches(response.url(), pattern)) return;
      let body: unknown = {};
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => '');
      }
      this.capturedResponses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers() as Record<string, string>,
        body,
        duration: 0,
      });
    });
  }

  /**
   * Wait for a specific request to be made.
   */
  async waitForRequest(
    urlPattern: string | RegExp,
    method?: HttpMethod,
    timeout = 15_000
  ): Promise<CapturedRequest> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout waiting for request: ${urlPattern}`)),
        timeout
      );

      this.page.on('request', (request: Request) => {
        const matches = this._matches(request.url(), urlPattern);
        const methodOk = !method || method === 'ALL' || request.method() === method;
        if (matches && methodOk) {
          clearTimeout(timer);
          resolve({
            url: request.url(),
            method: request.method(),
            headers: request.headers() as Record<string, string>,
            body: this._parseBody(request.postData()),
            timestamp: Date.now(),
          });
        }
      });
    });
  }

  /**
   * Wait for a specific response.
   */
  async waitForResponse(urlPattern: string | RegExp, timeout = 15_000): Promise<CapturedResponse> {
    const response = await this.page.waitForResponse(urlPattern, { timeout });
    let body: unknown = {};
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => '');
    }
    return {
      url: response.url(),
      status: response.status(),
      headers: response.headers() as Record<string, string>,
      body,
      duration: 0,
    };
  }

  // ── Getters ─────────────────────────────────────────────────────

  getRequests(urlPattern?: string | RegExp): CapturedRequest[] {
    if (!urlPattern) return this.capturedRequests;
    return this.capturedRequests.filter((r) => this._matches(r.url, urlPattern));
  }

  getResponses(urlPattern?: string | RegExp): CapturedResponse[] {
    if (!urlPattern) return this.capturedResponses;
    return this.capturedResponses.filter((r) => this._matches(r.url, urlPattern));
  }

  clearCaptures(): void {
    this.capturedRequests = [];
    this.capturedResponses = [];
  }

  // ── Remove Mocks ────────────────────────────────────────────────

  async removeAll(): Promise<void> {
    await this.page.unrouteAll();
    this.mocks = [];
    logger.info('🧹 All network mocks removed');
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private _matches(url: string, pattern: string | RegExp): boolean {
    if (pattern === '**') return true;
    if (typeof pattern === 'string') return url.includes(pattern);
    return pattern.test(url);
  }

  private _parseBody(postData: string | null): unknown {
    if (!postData) return null;
    try {
      return JSON.parse(postData);
    } catch {
      return postData;
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
