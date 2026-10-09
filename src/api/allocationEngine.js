/**
 * @file allocationEngine.js
 * @description API client for the Allocation Engine endpoints.
 *
 * Endpoints managed:
 *   POST   /allocations/generate              - Run Gale-Shapley engine (preview only).
 *   POST   /allocations/drafts               - Save a proposed plan as a draft.
 *   GET    /allocations/drafts               - List all drafts.
 *   GET    /allocations/drafts/:id           - Get a single draft with entries.
 *   POST   /allocations/drafts/:id/commit    - Commit selected entries to live allocations.
 *   DELETE /allocations/drafts/:id           - Delete a draft.
 */

import apiClient from './client';

export const allocationEngineApi = {
  // Run the Gale-Shapley engine and return a proposed plan.
  // Returns { proposed[], unmatched: { tutors[], courses[] } }
  generate: async () => {
    const response = await apiClient.post('/allocations/generate');
    return response.data;
  },

  // Save a proposed plan as a named AllocationDraft.
  saveDraft: async ({ name, description, proposed }) => {
    const response = await apiClient.post('/allocations/drafts', { name, description, proposed });
    return response.data;
  },

  // List all drafts.
  getDrafts: async () => {
    const response = await apiClient.get('/allocations/drafts');
    return response.data;
  },

  // Get a single draft with its entries.
  getDraft: async (id) => {
    const response = await apiClient.get(`/allocations/drafts/${id}`);
    return response.data;
  },

  // Commit selected draft entries to live allocations.
  commitDraft: async (id, entryIds) => {
    const response = await apiClient.post(`/allocations/drafts/${id}/commit`, { entryIds });
    return response.data;
  },

  // Delete a draft.
  deleteDraft: async (id) => {
    const response = await apiClient.delete(`/allocations/drafts/${id}`);
    return response.data;
  },
};

export default allocationEngineApi;
