import apiClient from './client';

export const swapsApi = {
  // GET /swaps — tutors see swaps they're involved in, organisers see all
  getSwaps: async (params) => {
    const response = await apiClient.get('/swaps', { params });
    return response.data;
  },

  // POST /swaps — request a trade between two allocations
  requestSwap: async (data) => {
    const response = await apiClient.post('/swaps', data);
    return response.data;
  },

  // POST /swaps/:id/approve
  approveSwap: async (id) => {
    const response = await apiClient.post(`/swaps/${id}/approve`);
    return response.data;
  },

  // POST /swaps/:id/reject
  rejectSwap: async (id) => {
    const response = await apiClient.post(`/swaps/${id}/reject`);
    return response.data;
  },

  // POST /swaps/:id/cancel — requester withdraws their own request
  cancelSwap: async (id) => {
    const response = await apiClient.post(`/swaps/${id}/cancel`);
    return response.data;
  },
};

export default swapsApi;
