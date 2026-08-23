import apiClient from './client';

export const excusalsApi = {
  getExcusals: async (params) => {
    const response = await apiClient.get('/excusals', { params });
    return response.data;
  },

  // POST /excusals — tutor requests to be excused from a session
  requestExcusal: async (data) => {
    const response = await apiClient.post('/excusals', data);
    return response.data;
  },

  // POST /excusals/:id/approve
  approveExcusal: async (id) => {
    const response = await apiClient.post(`/excusals/${id}/approve`);
    return response.data;
  },

  // POST /excusals/:id/decline
  declineExcusal: async (id) => {
    const response = await apiClient.post(`/excusals/${id}/decline`);
    return response.data;
  },
};

export default excusalsApi;
