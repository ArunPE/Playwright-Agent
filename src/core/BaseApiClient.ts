import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';
import { retry } from '../utils/retry';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  failOnStatusCode?: boolean;
}

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
  ok: boolean;
  duration: number;
}

/**
 * BaseApiClient — Resilient API automation client.
 *
 * Features:
 *  ✅ Automatic retry with exponential backoff
 *  ✅ Zod schema validation on responses
 *  ✅ Request/response logging
 *  ✅ Auth token injection
 *  ✅ Fluent assertion helpers
 */
export class BaseApiClient {
  protected request: APIRequestContext;
  protected baseURL: string;
  protected defaultHeaders: Record<string, string>;

  constructor(request: APIRequestContext, baseURL?: string) {
    this.request = request;
    this.baseURL = baseURL || process.env.API_BASE_URL || 'http://localhost:3001/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (process.env.API_KEY) {
      this.defaultHeaders['x-api-key'] = process.env.API_KEY;
    }
  }

  // ── Auth ────────────────────────────────────────────────────────

  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  setApiKey(key: string): void {
    this.defaultHeaders['x-api-key'] = key;
  }

  // ── Core HTTP Methods ───────────────────────────────────────────

  async get<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this._send('GET', path, undefined, options);
  }

  async post<T = unknown>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this._send('POST', path, body, options);
  }

  async put<T = unknown>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this._send('PUT', path, body, options);
  }

  async patch<T = unknown>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this._send('PATCH', path, body, options);
  }

  async delete<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this._send('DELETE', path, undefined, options);
  }

  // ── Internal Send with Retry ────────────────────────────────────

  private async _send<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { headers = {}, params, timeout = 30_000, retries = 2, failOnStatusCode = false } =
      options;

    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    const mergedHeaders = { ...this.defaultHeaders, ...headers };

    logger.info(`📡 ${method} ${url}`);
    if (body) logger.debug(`   Body: ${JSON.stringify(body)}`);

    const start = Date.now();

    const response = await retry<APIResponse>(
      async () => {
        const res = await this.request.fetch(url, {
          method,
          headers: mergedHeaders,
          data: body ? JSON.stringify(body) : undefined,
          params: params as Record<string, string>,
          timeout,
        });

        // Retry on 5xx (server errors) but not 4xx (client errors)
        if (res.status() >= 500) {
          throw new Error(`Server error ${res.status()} — will retry`);
        }

        return res;
      },
      { retries, delay: 1000, exponential: true, label: `${method} ${path}` }
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

    if (failOnStatusCode) {
      expect(status, `Expected success status, got ${status}`).toBeLessThan(400);
    }

    return {
      status,
      headers: responseHeaders as Record<string, string>,
      body: responseBody,
      ok: status >= 200 && status < 300,
      duration,
    };
  }

  // ── Schema Validation ───────────────────────────────────────────

  /**
   * Validates API response body against a Zod schema.
   * Throws descriptive error on mismatch.
   */
  validateSchema<T>(response: ApiResponse<unknown>, schema: ZodSchema<T>): T {
    const result = schema.safeParse(response.body);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  • [${i.path.join('.')}] ${i.message}`)
        .join('\n');
      throw new Error(`Schema validation failed:\n${issues}`);
    }
    logger.info('✅ Schema validation passed');
    return result.data;
  }

  // ── Assertion Helpers ───────────────────────────────────────────

  assertStatus(response: ApiResponse, expected: number): void {
    expect(response.status, `Expected status ${expected}, got ${response.status}`).toBe(expected);
  }

  assertOk(response: ApiResponse): void {
    expect(response.ok, `Request failed with status ${response.status}`).toBe(true);
  }

  assertResponseTime(response: ApiResponse, maxMs: number): void {
    expect(
      response.duration,
      `Response time ${response.duration}ms exceeded ${maxMs}ms`
    ).toBeLessThanOrEqual(maxMs);
  }

  assertHeader(response: ApiResponse, header: string, value: string): void {
    expect(response.headers[header.toLowerCase()]).toContain(value);
  }

  // ── GraphQL Support ─────────────────────────────────────────────

  async graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    options: RequestOptions = {}
  ): Promise<ApiResponse<{ data: T; errors?: unknown[] }>> {
    return this.post('/graphql', { query, variables }, options);
  }
}
