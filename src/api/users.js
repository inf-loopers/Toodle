/**
 * @file users.js
 * @description API service module for user profile and Auth0 post-login synchronization endpoints.
 *
 * Endpoints Managed:
 * - `GET    /auth/me`        - Retrieve the authenticated user's profile and database role.
 * - `POST   /auth/callback`  - Sync newly authenticated Auth0 user profile into the PostgreSQL database.
 * - `DELETE /auth/me`        - Delete own user account.
 * - `GET    /users`          - List users (Organiser only).
 * - `GET    /users/:id`      - Retrieve specific user details.
 * - `PATCH  /users/:id`      - Update user capacity or details.
 */

import apiClient from './client';

export const usersApi = {
  // GET /auth/me
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // POST /auth/callback (sync user with DB after Auth0 login)
  syncUser: async (userData) => {
    const response = await apiClient.post('/auth/callback', userData);
    return response.data;
  },

  // DELETE /auth/me (delete own account)
  deleteCurrentUser: async () => {
    const response = await apiClient.delete('/auth/me');
    return response.data;
  },

  // GET /users
  getUsers: async (params) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  // GET /users/:id
  getUser: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  // PATCH /users/:id
  updateUser: async (id, userData) => {
    const response = await apiClient.patch(`/users/${id}`, userData);
    return response.data;
  },
};

export default usersApi;
