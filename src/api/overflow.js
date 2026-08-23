import apiClient from './client';

export const overflowApi = {
  // GET /overflow-posts
  getPosts: async (params) => {
    const response = await apiClient.get('/overflow-posts', { params });
    return response.data;
  },

  // POST /overflow-posts (organiser posts overflow work for a course)
  createPost: async (data) => {
    const response = await apiClient.post('/overflow-posts', data);
    return response.data;
  },

  // POST /overflow-posts/:id/claim (student/tutor volunteers)
  claimPost: async (postId) => {
    const response = await apiClient.post(`/overflow-posts/${postId}/claim`);
    return response.data;
  },

  // POST /overflow-claims/:id/approve (organiser approves a claim)
  approveClaim: async (claimId) => {
    const response = await apiClient.post(`/overflow-claims/${claimId}/approve`);
    return response.data;
  },

  cancelPost: async (postId) => {
    const response = await apiClient.delete(`/overflow-posts/${postId}`);
    return response.data;
  },
};

export default overflowApi;
