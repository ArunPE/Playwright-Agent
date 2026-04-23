import { APIRequestContext } from '@playwright/test';
import { z } from 'zod';
import { BaseApiClient } from '../core/BaseApiClient';
import { UserData } from '../utils/test-data-factory';

// ── Zod Schemas ──────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.union([z.string(), z.number()]),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string().optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
});

export const UsersListSchema = z.object({
  data: z.array(UserSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type User = z.infer<typeof UserSchema>;
export type UsersList = z.infer<typeof UsersListSchema>;

// ── Users API Service ────────────────────────────────────────────

export class UsersApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async getUsers(params?: { page?: number; limit?: number }): Promise<UsersList> {
    const res = await this.get<UsersList>('/users', { params });
    this.assertOk(res);
    return this.validateSchema(res, UsersListSchema);
  }

  async getUserById(id: string | number): Promise<User> {
    const res = await this.get<User>(`/users/${id}`);
    this.assertStatus(res, 200);
    return this.validateSchema(res, UserSchema);
  }

  async createUser(data: Partial<UserData>): Promise<User> {
    const res = await this.post<User>('/users', data);
    this.assertStatus(res, 201);
    return this.validateSchema(res, UserSchema);
  }

  async updateUser(id: string | number, data: Partial<UserData>): Promise<User> {
    const res = await this.put<User>(`/users/${id}`, data);
    this.assertStatus(res, 200);
    return this.validateSchema(res, UserSchema);
  }

  async deleteUser(id: string | number): Promise<void> {
    const res = await this.delete(`/users/${id}`);
    this.assertStatus(res, 204);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const res = await this.get<UsersList>('/users', { params: { email } });
    this.assertOk(res);
    const list = this.validateSchema(res, UsersListSchema);
    return list.data[0] ?? null;
  }
}
