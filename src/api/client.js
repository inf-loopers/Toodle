/**
 * client.js
 *
 * Axios instance that automatically attaches the Auth0 access token
 * to every outgoing request. Since getAccessTokenSilently() is a
 * React hook function, we can't call it here directly — instead we
 * expose a setter that App.jsx (or a top-level auth effect) calls
 * once auth0 is ready, and every subsequent request uses it.
 *
 * Usage in a component:
 *   import { useAuth } from '../hooks/useAuth';
 *   import { registerTokenGetter } from '../api/client';
 *
 *   const { getToken } = useAuth();
 *   useEffect(() => { registerTokenGetter(getToken); }, [getToken]);
 */

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

let tokenGetter = null;

export function registerTokenGetter(fn) {
  tokenGetter = fn;
}

apiClient.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      // getAccessTokenSilently throws if the session has expired;
      // let the request go through unauthenticated and let the
      // backend return 401 rather than blocking the app here.
      console.warn('Could not attach auth token:', err.message);
    }
  }
  return config;
});

export default apiClient;
