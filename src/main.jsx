import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import AuthProvider from './context/AuthProvider';
import App from './App.jsx';
import './styles/index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
const callbackUrl = import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin;

/**
 * Sits inside BrowserRouter so useNavigate works, and wraps the app
 * in Auth0Provider with a redirect callback that sends users back to
 * whichever page they were trying to reach before they signed in.
 */
function AuthShell() {
  const navigate = useNavigate();

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || '/dashboard', { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: callbackUrl,
        audience,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </Auth0Provider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthShell />
    </BrowserRouter>
  </StrictMode>,
);
