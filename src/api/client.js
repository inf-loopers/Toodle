/**
 * @file client.js
 * @description Central Axios HTTP client instance for communicating with the Toodle Express backend REST API.
 *
 * Responsibilities:
 * - Base URL configuration reading `VITE_API_URL` (default: http://localhost:3000/api/v1).
 * - Request Interceptor: Automatically acquires Auth0 JWT tokens via `getAccessTokenSilently` and injects `Authorization: Bearer <token>`.
 * - Response Interceptor: Catches HTTP 401 (Unauthorized) and 403 (Forbidden) response codes.
 * - Standardized JSON content headers and request timeouts.
 */

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let getAccessTokenSilentlyFn = null;

/**
 * Configure the Auth0 token provider callback for Axios requests
 * @param {Function} getTokenSilently - Auth0 SDK getAccessTokenSilently function
 */
export const setupAuthInterceptor = (getTokenSilently) => {
  getAccessTokenSilentlyFn = getTokenSilently;
};

// Request interceptor: inject Auth0 JWT token
apiClient.interceptors.request.use(
  async (config) => {
    if (getAccessTokenSilentlyFn) {
      try {
        const token = await getAccessTokenSilentlyFn();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // Token retrieval failure (e.g. user not logged in)
        console.debug('No access token available for request:', error.message);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle common HTTP error statuses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request - session may have expired.');
    } else if (error.response?.status === 403) {
      console.warn('Forbidden request - insufficient role permissions.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
