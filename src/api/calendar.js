/**
 * @file calendar.js
 * @description API service module for the calendar view and the .ics feed.
 *
 * Endpoints Managed:
 * - `GET    /calendar/me/events`      - Dated occurrences of the user's sessions.
 * - `GET    /calendar/me/feed-token`  - Whether a subscribable feed is connected.
 * - `POST   /calendar/me/feed-token`  - Connect or rotate the feed, returning the
 *                                       plaintext token exactly once.
 * - `DELETE /calendar/me/feed-token`  - Revoke the feed.
 *
 * The public `GET /calendar/feed/:token` is deliberately absent: it is fetched by
 * the calendar client (Google, Outlook, Apple), never by this app, and building
 * its URL is `buildFeedUrl` in `utils/calendar.js`.
 */

import apiClient from './client';

export const calendarApi = {
  // GET /calendar/me/events?start=YYYY-MM-DD&end=YYYY-MM-DD
  getMyEvents: async ({ start, end }) => {
    const response = await apiClient.get('/calendar/me/events', { params: { start, end } });
    return response.data;
  },

  // GET /calendar/me/feed-token
  getFeedToken: async () => {
    const response = await apiClient.get('/calendar/me/feed-token');
    return response.data;
  },

  // POST /calendar/me/feed-token
  createFeedToken: async () => {
    const response = await apiClient.post('/calendar/me/feed-token');
    return response.data;
  },

  // DELETE /calendar/me/feed-token
  revokeFeedToken: async () => {
    const response = await apiClient.delete('/calendar/me/feed-token');
    return response.data;
  },
};

export default calendarApi;
