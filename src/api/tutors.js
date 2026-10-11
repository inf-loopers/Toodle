/**
 * @file tutors.js
 * @description API service module for tutor directory, marks, and availability matrix endpoints.
 *
 * Endpoints Managed:
 * - `GET /tutors`                   - List all tutors with marks and current hours.
 * - `GET /tutors/:id`               - Retrieve detailed tutor profile.
 * - `POST /tutors/:id/marks`        - Add/update historical course marks (Staff only).
 * - `PUT /tutors/:id/availability`  - Set weekly availability time slots (Tutor self-service).
 * - `POST /tutors/marks/import/preview` - Preview a CSV class-list mark import (Staff only).
 * - `POST /tutors/marks/import/commit`  - Apply a previewed CSV mark import (Staff only).
 * - `POST /tutors/:id/timetable/import/preview` - Preview a timetable CSV as availability (no writes).
 * - `POST /tutors/:id/timetable/import/commit`  - Replace availability from a timetable CSV.
 */

import apiClient from './client';

export const tutorsApi = {
  submitMark: async (data) => (await apiClient.post('/tutors/me/marks', data)).data,
  reviewMark: async (id, data) => (await apiClient.patch(`/tutors/marks/${id}`, data)).data,
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

  // POST /tutors/marks/import/preview - multipart CSV upload, no writes
  previewMarkImport: async (courseId, file) => {
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('file', file);
    const response = await apiClient.post('/tutors/marks/import/preview', formData);
    return response.data;
  },

  // POST /tutors/marks/import/commit - re-uploads the CSV and applies the selected rows
  commitMarkImport: async (courseId, file, excludedRows = []) => {
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('file', file);
    formData.append('excludedRows', JSON.stringify(excludedRows));
    const response = await apiClient.post('/tutors/marks/import/commit', formData);
    return response.data;
  },

  // POST /tutors/:id/timetable/import/preview - multipart CSV upload, no writes
  previewTimetableImport: async (tutorId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/tutors/${tutorId}/timetable/import/preview`, formData);
    return response.data;
  },

  // POST /tutors/:id/timetable/import/commit - re-uploads the CSV; the server re-validates it
  commitTimetableImport: async (tutorId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/tutors/${tutorId}/timetable/import/commit`, formData);
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
