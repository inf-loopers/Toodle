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
  // Returns { proposed[], candidates[], unmatched: { tutors[], courses[] } }
  // `proposed[]` rows carry a 1-based `rank` and an `explanation` with a
  // human-readable `reasons[]`; `candidates[]` lists, per unfilled course, the
  // ranked eligible tutors and the excluded ones with their blocking reasons.
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
  // `hoursOverrides` maps a draft entry id to the weekly hours the reviewer
  // edited in the modal; without it those edits would be silently dropped
  // because the server commits the hours stored on the entry. The server
  // revalidates every entry and returns { committed[], skipped[] } rather than
  // failing the whole batch.
  commitDraft: async (id, entryIds, hoursOverrides) => {
    const body =
      hoursOverrides && Object.keys(hoursOverrides).length > 0
        ? { entryIds, hoursOverrides }
        : { entryIds };
    const response = await apiClient.post(`/allocations/drafts/${id}/commit`, body);
    return response.data;
  },

  // Delete a draft.
  deleteDraft: async (id) => {
    const response = await apiClient.delete(`/allocations/drafts/${id}`);
    return response.data;
  },
};

export default allocationEngineApi;
