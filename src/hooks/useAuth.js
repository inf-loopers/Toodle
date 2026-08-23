/**
 * useAuth.js
 *
 * Wraps @auth0/auth0-react's useAuth0 and merges in the database-backed
 * profile from AuthContext so the rest of the app gets a single, unified
 * auth object.
 *
 * Usage:
 *   const { isAuthenticated, isLoading, role, login, logout } = useAuth();
 *   if (role === 'organiser') { ... }
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';

// Must match the namespace used in the Auth0 "Add Roles to Token" Action
const ROLES_CLAIM = 'https://toodle.app/roles';

export function useAuth() {
  const {
    isAuthenticated,
    isLoading,
    user,
    error: auth0Error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const ctx = useAuthContext();
  const dbUser = ctx?.dbUser ?? null;
  const isSyncing = ctx?.isSyncing ?? false;
  const syncError = ctx?.syncError ?? null;

  const [jwtRole, setJwtRole] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const roles = user[ROLES_CLAIM] || [];
      setJwtRole(roles[0] || null); // Toodle users have exactly one role
    } else {
      setJwtRole(null);
    }
  }, [isAuthenticated, user]);

  // Prefer the authoritative database role over the JWT claim
  const role = dbUser?.role || jwtRole;
  const error = syncError || auth0Error?.message || null;

  const login = () => loginWithRedirect();

  const logout = () => auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  /** Get a bearer token to attach to API requests (see api/client.js) */
  const getToken = () => getAccessTokenSilently();

  return {
    isAuthenticated,
    isLoading: isLoading || isSyncing,
    user,
    dbUser,
    role,
    error,
    login,
    logout,
    getToken,
  };
}
