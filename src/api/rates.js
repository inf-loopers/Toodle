/**
 * @file rates.js
 * @description API service module for tutor pay-rate history and management endpoints.
 *
 * Endpoints Managed:
 * - `GET   /users/:id/rates`            - Full rate history for a tutor (self, admin, or coordinating lecturer).
 * - `GET   /users/:id/rates/current`    - The rate effective today for a tutor.
 * - `POST  /users/:id/rates`            - Add a new forward-dated rate change (Admin / coordinating Lecturer).
 * - `PATCH /users/:id/rates/:rateId`    - Correct a mistaken rate value in place (Admin / coordinating Lecturer).
 */

import apiClient from './client';

export const ratesApi = {
  // GET /users/:id/rates
  getRateHistory: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/rates`);
    return response.data;
  },

  // GET /users/:id/rates/current
  getCurrentRate: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/rates/current`);
    return response.data;
  },

  // POST /users/:id/rates
  createRate: async (userId, data) => {
    const response = await apiClient.post(`/users/${userId}/rates`, data);
    return response.data;
  },

  // PATCH /users/:id/rates/:rateId
  correctRate: async (userId, rateId, data) => {
    const response = await apiClient.patch(`/users/${userId}/rates/${rateId}`, data);
    return response.data;
  },
};

export default ratesApi;
