import apiClient from './client';

export const timesheetsApi = {
  // GET /timesheets — organisers see all (optionally filtered), tutors see their own
  getTimesheets: async (params) => {
    const response = await apiClient.get('/timesheets', { params });
    return response.data;
  },

  getTimesheet: async (id) => {
    const response = await apiClient.get(`/timesheets/${id}`);
    return response.data;
  },

  // POST /timesheets — creates/opens a DRAFT timesheet for a course + week
  createTimesheet: async (data) => {
    const response = await apiClient.post('/timesheets', data);
    return response.data;
  },

  // POST /timesheets/:id/entries — log an hours entry against a timesheet
  addEntry: async (timesheetId, entryData) => {
    const response = await apiClient.post(`/timesheets/${timesheetId}/entries`, entryData);
    return response.data;
  },

  deleteEntry: async (timesheetId, entryId) => {
    const response = await apiClient.delete(`/timesheets/${timesheetId}/entries/${entryId}`);
    return response.data;
  },

  // POST /timesheets/:id/submit — DRAFT -> SUBMITTED
  submitTimesheet: async (id) => {
    const response = await apiClient.post(`/timesheets/${id}/submit`);
    return response.data;
  },

  // POST /timesheets/:id/approve — SUBMITTED -> APPROVED (organiser only)
  approveTimesheet: async (id) => {
    const response = await apiClient.post(`/timesheets/${id}/approve`);
    return response.data;
  },

  // POST /timesheets/:id/dispute — SUBMITTED -> DISPUTED, with a note
  disputeTimesheet: async (id, disputeNote) => {
    const response = await apiClient.post(`/timesheets/${id}/dispute`, { disputeNote });
    return response.data;
  },
};

export default timesheetsApi;
