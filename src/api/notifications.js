/**
 * @file notifications.js
 * @description API service module for user notification endpoints.
 *
 * Endpoints Managed:
 * - `GET   /notifications`              - List notifications for the authenticated user.
 * - `GET   /notifications/unread-count` - Get the number of unread notifications.
 * - `PATCH /notifications/:id/read`     - Mark a single notification as read.
 * - `PATCH /notifications/read-all`     - Mark all notifications as read.
 */

import apiClient from './client';

export const notificationsApi = {
  // GET /notifications
  getNotifications: async (params) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  // GET /notifications/unread-count
  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  // PATCH /notifications/:id/read
  markAsRead: async (id) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // PATCH /notifications/read-all
  markAllAsRead: async () => {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },
};

export default notificationsApi;
