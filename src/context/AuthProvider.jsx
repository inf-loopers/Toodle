/**
 * @file AuthProvider.jsx
 * @description Application-wide authentication provider that bridges Auth0 and the Toodle backend.
 *
 * After Auth0 authenticates the user, it automatically calls `POST /auth/callback` to upsert
 * the user into Supabase (default STUDENT, or a verified staff invitation), then `GET /auth/me` to retrieve the
 * canonical profile including the database role that drives all RBAC decisions.
 *
 * Exposes `dbUser` and `isSyncing` via `AuthContext` so that the `useAuth()` hook
 * can return the authoritative database role instead of relying on JWT claims alone.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AuthContext } from './AuthContext';
import { usersApi } from '../api/users';

const devBypassEnabled = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
const RETURN_LOGIN_KEY = 'toodle:account-return-login';

export default function AuthProvider({ children }) {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
    user: auth0User,
    error: auth0Error,
  } = useAuth0();
  const [dbUser, setDbUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const returnLoginStarted = useRef(false);
  const subject = auth0User?.sub;
  const updateDbUser = useCallback((profile) => {
    setDbUser(profile);
    setSyncError(null);
  }, []);

  // Log Auth0 state changes for debugging
  useEffect(() => {
    console.log('[Auth] Auth0 state:', {
      isLoading: auth0Loading,
      isAuthenticated,
      hasUser: !!auth0User,
      auth0Error: auth0Error?.message || null,
      currentPath: window.location.pathname,
    });
  }, [auth0Loading, isAuthenticated, auth0User, auth0Error]);

  useEffect(() => {
    if (!devBypassEnabled && (auth0Loading || !isAuthenticated)) return;

    let cancelled = false;
    let redirecting = false;

    const sync = async () => {
      console.log(
        devBypassEnabled ? '[Auth] Loading local demo account…' : '[Auth] Starting backend sync…'
      );
      setIsSyncing(true);
      setSyncError(null);
      try {
        if (!devBypassEnabled) {
          const idClaims = await getIdTokenClaims?.();
          const token = await getAccessTokenSilently();
          if (cancelled || !token) {
            console.log('[Auth] Token retrieval cancelled or empty');
            return;
          }
          console.log('[Auth] Got token, calling POST /auth/callback');
          await usersApi.syncUser(idClaims?.__raw ? { idToken: idClaims.__raw } : {});
        }
        if (cancelled) return;
        const me = await usersApi.getCurrentUser();
        if (cancelled) return;

        const profile = me.data ?? me;
        setDbUser({ ...profile, role: (profile.role ?? 'student').toLowerCase() });
        returnLoginStarted.current = false;
        sessionStorage.removeItem(RETURN_LOGIN_KEY);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.data?.details?.code === 'FRESH_SIGN_IN_REQUIRED') {
          let previous;
          try {
            previous = JSON.parse(sessionStorage.getItem(RETURN_LOGIN_KEY));
          } catch {
            /* No stored attempt. */
          }
          const alreadyAttempted =
            returnLoginStarted.current ||
            (previous?.subject === subject && Date.now() - previous.at < 5 * 60 * 1000);
          if (!alreadyAttempted && loginWithRedirect) {
            returnLoginStarted.current = true;
            try {
              sessionStorage.setItem(RETURN_LOGIN_KEY, JSON.stringify({ subject, at: Date.now() }));
              setDbUser(null);
              redirecting = true;
              await loginWithRedirect({
                appState: { returnTo: '/dashboard' },
                authorizationParams: {
                  prompt: 'login',
                  max_age: 0,
                  ...(subject?.startsWith('google-oauth2|') ? { connection: 'google-oauth2' } : {}),
                },
              });
              return;
            } catch {
              redirecting = false;
            }
          }
          setDbUser(null);
          setSyncError('Could not confirm your new sign-in. Please sign out and sign in again.');
          return;
        }
        console.error('[Auth] Backend sync failed:', {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message,
        });
        if (!cancelled) {
          setDbUser(null);
          setSyncError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              'Could not reach the server'
          );
        }
      } finally {
        if (!cancelled && !redirecting) setIsSyncing(false);
      }
    };

    sync();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    auth0Loading,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
    subject,
  ]);

  return (
    <AuthContext.Provider
      value={{
        dbUser,
        isSyncing,
        syncError,
        updateDbUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
