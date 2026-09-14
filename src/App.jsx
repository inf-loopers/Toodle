import React from 'react';
import { registerTokenGetter } from './api/client';
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
  const { getToken } = useAuth();

  React.useEffect(() => {
    registerTokenGetter(getToken);
  }, [getToken]);

  return null;
}
