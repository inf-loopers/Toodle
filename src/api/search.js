/**
 * @file search.js
 * @description API service module for the global permission-aware search endpoint.
 *
 * Endpoints Managed:
 * - `GET /search` - Search courses, people (tutors) and timesheets in one call.
 *   The backend scopes every result group by the caller's role and lecturer
 *   course ownership, so the response only contains entities the user may see.
 *
 * Response shape: `{ success, data: { query, courses[], people[], timesheets[] } }`.
 */

import apiClient from './client';

export const searchApi = {
  // GET /search?q=<term>&limit=<n>
  search: async (q, limit) =>
    (await apiClient.get('/search', { params: { q, ...(limit ? { limit } : {}) } })).data,
};

export default searchApi;
