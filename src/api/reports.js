import apiClient from './client';

export const reportsApi = {
  // POST /problem-reports — submit a problem report from the in-app form
  submitProblemReport: async (data) => {
    const response = await apiClient.post('/problem-reports', data);
    return response.data;
  },
};

export default reportsApi;
