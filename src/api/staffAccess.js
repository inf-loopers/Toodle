import apiClient from './client';

const data = (response) => response.data;
export const staffAccessApi = {
  list: () => apiClient.get('/staff-access').then(data),
  request: (body) => apiClient.post('/staff-access/requests', body).then(data),
  cancel: () => apiClient.delete('/staff-access/requests/me').then(data),
  review: (id, body) => apiClient.patch(`/staff-access/requests/${id}`, body).then(data),
  invite: (body) => apiClient.post('/staff-access/invitations', body).then(data),
  revoke: (id) => apiClient.delete(`/staff-access/invitations/${id}`).then(data),
  complete: (body) => apiClient.post('/staff-access/onboarding/complete', body).then(data),
};
