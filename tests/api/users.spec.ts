import { test, expect } from '@playwright/test';
import { ReqResApi } from '../../src/api/reqres.api';

/**
 * API Tests: ReqRes.in — Users CRUD + Auth
 * https://reqres.in
 *
 * ReqRes is a hosted REST API that simulates real user data.
 * No auth token required for most endpoints.
 */
test.describe('ReqRes API — Users', () => {

  let api: ReqResApi;

  test.beforeEach(async ({ request }) => {
    // Use fresh request context to avoid any inherited state
    api = new ReqResApi(request);
  });

  // ── GET: List Users ──────────────────────────────────────────────

  test('@smoke - GET /users returns paginated list with schema', async () => {
    const result = await api.listUsers(1);

    expect(result.page).toBe(1);
    expect(result.per_page).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.data.length).toBeGreaterThan(0);
  });

  test('@regression - page 2 returns different users than page 1', async () => {
    const page1 = await api.listUsers(1);
    const page2 = await api.listUsers(2);

    const ids1 = page1.data.map((u) => u.id);
    const ids2 = page2.data.map((u) => u.id);

    // No overlap between pages
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap.length).toBe(0);
  });

  test('@regression - each user has valid email and avatar URL', async () => {
    const result = await api.listUsers(1);
    for (const user of result.data) {
      expect(user.email).toMatch(/@/);
      expect(user.avatar).toMatch(/^https?:\/\//);
    }
  });

  // ── GET: Single User ─────────────────────────────────────────────

  test('@smoke - GET /users/2 returns correct user', async () => {
    const result = await api.getUser(2);
    expect(result.data.id).toBe(2);
    expect(result.data.email).toBeTruthy();
  });

  test('@regression - GET /users/23 returns 404 for unknown user', async () => {
    const res = await api.getUserNotFound(23);
    api.assertStatus(res, 404);
  });

  // ── POST: Create User ────────────────────────────────────────────

  test('@smoke - POST /users creates user and returns id + timestamp', async () => {
    const created = await api.createUser('Arun', 'Automation Architect');

    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
    expect(created.name).toBe('Arun');
    expect(created.job).toBe('Automation Architect');
  });

  test('@regression - created user has ISO timestamp', async () => {
    const created = await api.createUser('TestBot', 'QA Engineer');
    const date = new Date(created.createdAt);
    expect(date.getTime()).not.toBeNaN();
  });

  // ── PUT: Update User ─────────────────────────────────────────────

  test('@regression - PUT /users/:id updates name and job', async () => {
    const updated = await api.updateUser(2, 'Arun Updated', 'Senior Architect');

    expect(updated.name).toBe('Arun Updated');
    expect(updated.job).toBe('Senior Architect');
    expect(updated.updatedAt).toBeTruthy();
  });

  // ── PATCH: Partial Update ────────────────────────────────────────

  test('@regression - PATCH /users/:id partially updates user', async () => {
    const patched = await api.patchUser(2, { name: 'Patched Name' });
    expect(patched.name).toBe('Patched Name');
    expect(patched.updatedAt).toBeTruthy();
  });

  // ── DELETE ───────────────────────────────────────────────────────

  test('@regression - DELETE /users/:id returns 204 No Content', async () => {
    const res = await api.deleteUser(2);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  // ── Performance ──────────────────────────────────────────────────

  test('@regression - GET /users responds within 3 seconds', async () => {
    const res = await api.get('/users');
    api.assertResponseTime(res, 3000);
  });

  test('@regression - delayed endpoint waits and still resolves', async () => {
    const start = Date.now();
    const res = await api.getDelayed(2);
    api.assertStatus(res, 200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(2000);
  });
});

test.describe('ReqRes API — Auth', () => {

  let api: ReqResApi;

  test.beforeEach(async ({ request }) => {
    api = new ReqResApi(request);
  });

  // ── Register ─────────────────────────────────────────────────────

  test('@smoke - POST /register with valid user returns token', async () => {
    const res = await api.register('eve.holt@reqres.in', 'pistol');
    api.assertStatus(res, 200);
    expect((res.body as any).token).toBeTruthy();
  });

  test('@regression - POST /register without password returns 400', async () => {
    const res = await api.register('eve.holt@reqres.in', '');
    api.assertStatus(res, 400);
    expect((res.body as any).error).toBeTruthy();
  });

  test('@regression - POST /register with unknown user returns 400', async () => {
    const res = await api.register('unknown@notreqres.in', 'password123');
    api.assertStatus(res, 400);
  });

  // ── Login ────────────────────────────────────────────────────────

  test('@smoke - POST /login with valid credentials returns token', async () => {
    const res = await api.login('eve.holt@reqres.in', 'cityslicka');
    api.assertStatus(res, 200);
    const token = (res.body as any).token;
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('@regression - POST /login without password returns 400', async () => {
    const res = await api.login('peter@klaven.com', '');
    api.assertStatus(res, 400);
    expect((res.body as any).error).toBe('Missing password');
  });
});
