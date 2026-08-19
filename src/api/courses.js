/**
 * @file courses.js
 * @description API service module for course management and session schedule endpoints.
 *
 * Endpoints Managed:
 * - `GET    /courses`               - List all registered courses with staffing metadata.
 * - `GET    /courses/:id`           - Retrieve single course details, allocations, and sessions.
 * - `POST   /courses`               - Create a new course offering (Organiser only).
 * - `PATCH  /courses/:id`           - Update course quotas or prerequisite thresholds.
 * - `DELETE /courses/:id`           - Delete a course offering (Organiser only).
 * - `GET    /courses/:id/sessions`  - List tutorial & lab contact slots for a course.
 * - `POST   /courses/:id/sessions`  - Create a new contact session slot.
 * - `PATCH  /sessions/:id`          - Update session timing or venue.
 * - `DELETE /sessions/:id`          - Delete a session slot.
 */

import apiClient from './client';

export const coursesApi = {
  // GET /courses
  getCourses: async (params) => {
    const response = await apiClient.get('/courses', { params });
    return response.data;
  },

  // GET /courses/:id
  getCourse: async (id) => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data;
  },

  // POST /courses
  createCourse: async (courseData) => {
    const response = await apiClient.post('/courses', courseData);
    return response.data;
  },

  // PATCH /courses/:id
  updateCourse: async (id, courseData) => {
    const response = await apiClient.patch(`/courses/${id}`, courseData);
    return response.data;
  },

  // DELETE /courses/:id
  deleteCourse: async (id) => {
    const response = await apiClient.delete(`/courses/${id}`);
    return response.data;
  },

  // GET /courses/:id/sessions
  getCourseSessions: async (courseId) => {
    const response = await apiClient.get(`/courses/${courseId}/sessions`);
    return response.data;
  },

  // POST /courses/:id/sessions
  createCourseSession: async (courseId, sessionData) => {
    const response = await apiClient.post(`/courses/${courseId}/sessions`, sessionData);
    return response.data;
  },

  // PATCH /sessions/:id
  updateSession: async (sessionId, sessionData) => {
    const response = await apiClient.patch(`/sessions/${sessionId}`, sessionData);
    return response.data;
  },

  // DELETE /sessions/:id
  deleteSession: async (sessionId) => {
    const response = await apiClient.delete(`/sessions/${sessionId}`);
    return response.data;
  },
};

export default coursesApi;
