import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { Auth0Provider } from '@auth0/auth0-react';
import { registerTokenGetter } from './api/client';
import { usersApi } from './api/users';
import { useAuth } from './hooks/useAuth';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

export default function App() {
  const navigate = useNavigate();

  // After Auth0 redirects back from login, send the user to wherever
  // they were headed (appState.returnTo) instead of always landing on "/".
  // This relies on App already being inside <BrowserRouter> (in main.jsx),
  // which is why useNavigate works here.
  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || '/', { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin, // no dedicated /callback route needed
        audience,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <AuthBootstrap />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Protected routes go here, e.g.: */}
        {/* <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} /> */}
      </Routes>
    </Auth0Provider>
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
