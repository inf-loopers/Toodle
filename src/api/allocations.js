/**
 * @file allocations.js
 * @description API service module for the Core Allocation Board and real-time constraint validation endpoints.
 *
 * Endpoints Managed:
 * - `GET    /allocations`           - List all course tutor allocations (filterable by course or tutor).
 * - `POST   /allocations`           - Create a course assignment (triggers server constraint validation).
 * - `PATCH  /allocations/:id`       - Update allocation hours or status.
 * - `DELETE /allocations/:id`       - Remove a tutor from a course.
 * - `GET    /allocations/validate`  - Dry-run validation check for a proposed assignment before saving.
 */

import apiClient from './client';

export const allocationsApi = {
  // GET /allocations
  getAllocations: async (params) => {
    const response = await apiClient.get('/allocations', { params });
    return response.data;
  },

  // POST /allocations (creates allocation and returns validation warnings if any)
  createAllocation: async (data) => {
    const response = await apiClient.post('/allocations', data);
    return response.data;
  },

  // PATCH /allocations/:id
  updateAllocation: async (id, data) => {
    const response = await apiClient.patch(`/allocations/${id}`, data);
    return response.data;
  },

  // DELETE /allocations/:id
  deleteAllocation: async (id) => {
    const response = await apiClient.delete(`/allocations/${id}`);
    return response.data;
  },

  // GET /allocations/validate (dry run constraint validation)
  validateAllocation: async (params) => {
    const response = await apiClient.get('/allocations/validate', { params });
    return response.data;
  },
};

export default allocationsApi;
