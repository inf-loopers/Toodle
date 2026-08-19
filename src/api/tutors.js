/**
 * @file tutors.js
 * @description API service module for tutor directory, marks, and availability matrix endpoints.
 *
 * Endpoints Managed:
 * - `GET /tutors`                   - List all tutors with marks and current hours.
 * - `GET /tutors/:id`               - Retrieve detailed tutor profile.
 * - `POST /tutors/:id/marks`        - Add/update historical course marks (Organiser only).
 * - `PUT /tutors/:id/availability`  - Set weekly availability time slots (Tutor self-service).
 */

import apiClient from './client';

export const tutorsApi = {
  // GET /tutors
  getTutors: async (params) => {
    const response = await apiClient.get('/tutors', { params });
    return response.data;
  },

  // GET /tutors/:id
  getTutor: async (id) => {
    const response = await apiClient.get(`/tutors/${id}`);
    return response.data;
  },

  // POST /tutors/:id/marks
  addOrUpdateMark: async (tutorId, markData) => {
    const response = await apiClient.post(`/tutors/${tutorId}/marks`, markData);
    return response.data;
  },

  // PUT /tutors/:id/availability
  setAvailability: async (tutorId, availabilitySlots) => {
    const response = await apiClient.put(`/tutors/${tutorId}/availability`, {
      slots: availabilitySlots,
    });
    return response.data;
  },
};

export default tutorsApi;
