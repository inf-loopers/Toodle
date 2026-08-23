import React from 'react';
import { registerTokenGetter } from './api/client';
import { usersApi } from './api/users';
import { useAuth } from './hooks/useAuth';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <>
      <AuthBootstrap />
      <AppRoutes />
    </>
  );
}

/**
 * AuthBootstrap
 * Registers the Auth0 token getter with the API client once, on mount.
 * Renders nothing — just wires getToken() from useAuth() into
 * api/client.js so every axios request carries a bearer token.
 */
function AuthBootstrap() {
  const { getToken, isAuthenticated, user } = useAuth();
  const syncedRef = React.useRef(false);

  React.useEffect(() => {
    registerTokenGetter(getToken);
  }, [getToken]);

  // Sync the Auth0 profile to the local DB once per session.
  React.useEffect(() => {
    if (!isAuthenticated || syncedRef.current) return;

    syncedRef.current = true;
    usersApi.syncUser(user).catch((err) => {
      syncedRef.current = false; // allow a retry on the next load

      // Log the actual backend error message for debugging.
      // A 500 here typically means the backend database is not migrated
      // or the `/auth/callback` handler is crashing on the server side.
      const serverError =
        err.response?.data?.message || err.response?.data?.error || err.response?.data;

      console.warn('User sync with backend failed:', serverError || err.message);
    });
  }, [isAuthenticated, user]);

  return null;
}
