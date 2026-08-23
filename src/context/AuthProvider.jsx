/**
 * @file AuthProvider.jsx
 * @description Application-wide authentication provider that bridges Auth0 and the Toodle backend.
 *
 * After Auth0 authenticates the user, it automatically calls `POST /auth/callback` to upsert
 * the user into Supabase (with default STUDENT role), then `GET /auth/me` to retrieve the
 * canonical profile including the database role that drives all RBAC decisions.
 *
 * Exposes `dbUser` and `isSyncing` via `AuthContext` so that the `useAuth()` hook
 * can return the authoritative database role instead of relying on JWT claims alone.
 */

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AuthContext } from './AuthContext';
import { usersApi } from '../api/users';

export default function AuthProvider({ children }) {
  const { isAuthenticated, isLoading: auth0Loading, getAccessTokenSilently, user: auth0User, error: auth0Error } = useAuth0();
  const [dbUser, setDbUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Log Auth0 state changes for debugging
  useEffect(() => {
    console.log('[Auth] Auth0 state:', {
      isLoading: auth0Loading,
      isAuthenticated,
      hasUser: !!auth0User,
      auth0Error: auth0Error?.message || null,
      currentUrl: window.location.href,
    });
  }, [auth0Loading, isAuthenticated, auth0User, auth0Error]);

  useEffect(() => {
    if (auth0Loading || !isAuthenticated) return;

    let cancelled = false;

    const sync = async () => {
      console.log('[Auth] Starting backend sync…');
      setIsSyncing(true);
      setSyncError(null);
      try {
        const token = await getAccessTokenSilently();
        if (cancelled || !token) {
          console.log('[Auth] Token retrieval cancelled or empty');
          return;
        }
        console.log('[Auth] Got token, calling POST /auth/callback');

        await usersApi.syncUser({});
        if (cancelled) return;
        console.log('[Auth] User synced, fetching profile…');

        const me = await usersApi.getCurrentUser();
        if (cancelled) return;

        const profile = me.data ?? me;
        console.log('[Auth] Profile loaded:', { id: profile.id, role: profile.role, email: profile.email });
        setDbUser({ ...profile, role: (profile.role ?? 'student').toLowerCase() });
      } catch (err) {
        console.error('[Auth] Backend sync failed:', {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message,
        });
        if (!cancelled) {
          setSyncError(
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Could not reach the server'
          );
        }
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    sync();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, auth0Loading, getAccessTokenSilently]);

  return (
    <AuthContext.Provider value={{ dbUser, isSyncing, syncError }}>
      {children}
    </AuthContext.Provider>
  );
}
