import { APIRequestContext } from '@playwright/test';
import { z } from 'zod';
import { BaseApiClient } from '../core/BaseApiClient';

// ── Zod Schemas matching ReqRes response shape ───────────────────

export const ReqResUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  avatar: z.string().url(),
});

export const ReqResListSchema = z.object({
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
  total_pages: z.number(),
  data: z.array(ReqResUserSchema),
});

export const ReqResSingleSchema = z.object({
  data: ReqResUserSchema,
});

export const ReqResCreatedSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  name: z.string().optional(),
  job: z.string().optional(),
});

export const ReqResUpdatedSchema = z.object({
  updatedAt: z.string(),
  name: z.string().optional(),
  job: z.string().optional(),
});

export const ReqResTokenSchema = z.object({
  token: z.string(),
});

export type ReqResUser = z.infer<typeof ReqResUserSchema>;
export type ReqResList = z.infer<typeof ReqResListSchema>;

// ── ReqRes API Client ────────────────────────────────────────────

export class ReqResApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request, 'https://reqres.in/api');
  }

  // ── Users ────────────────────────────────────────────────────

  async listUsers(page = 1) {
    const res = await this.get<ReqResList>(`/users?page=${page}`);
    this.assertStatus(res, 200);
    return this.validateSchema(res, ReqResListSchema);
  }

  async getUser(id: number) {
    const res = await this.get(`/users/${id}`);
    this.assertStatus(res, 200);
    return this.validateSchema(res, ReqResSingleSchema);
  }

  async getUserNotFound(id: number) {
    return this.get(`/users/${id}`);
  }

  async createUser(name: string, job: string) {
    const res = await this.post('/users', { name, job });
    this.assertStatus(res, 201);
    return this.validateSchema(res, ReqResCreatedSchema);
  }

  async updateUser(id: number, name: string, job: string) {
    const res = await this.put(`/users/${id}`, { name, job });
    this.assertStatus(res, 200);
    return this.validateSchema(res, ReqResUpdatedSchema);
  }

  async patchUser(id: number, data: Record<string, string>) {
    const res = await this.patch(`/users/${id}`, data);
    this.assertStatus(res, 200);
    return this.validateSchema(res, ReqResUpdatedSchema);
  }

  async deleteUser(id: number) {
    const res = await this.delete(`/users/${id}`);
    this.assertStatus(res, 204);
    return res;
  }

  // ── Auth ─────────────────────────────────────────────────────

  async register(email: string, password: string) {
    return this.post('/register', { email, password });
  }

  async login(email: string, password: string) {
    return this.post('/login', { email, password });
  }

  // ── Other ────────────────────────────────────────────────────

  async listResources() {
    const res = await this.get('/unknown');
    this.assertStatus(res, 200);
    return res;
  }

  async getDelayed(seconds: number) {
    return this.get(`/users?delay=${seconds}`, { timeout: 15_000 });
  }
}
