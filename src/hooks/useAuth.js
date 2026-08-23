/**
 * useAuth.js
 *
 * Wraps @auth0/auth0-react's useAuth0 so the rest of the app never
 * needs to know about the Auth0 claim namespace or token shape.
 *
 * Usage:
 *   const { isAuthenticated, isLoading, role, login, logout } = useAuth();
 *   if (role === 'Organiser') { ... }
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

// Must match the namespace used in the Auth0 "Add Roles to Token" Action
const ROLES_CLAIM = 'https://toodle.app/roles';

export function useAuth() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [role, setRole] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const roles = user[ROLES_CLAIM] || [];
      setRole(roles[0] || null); // Toodle users have exactly one role
    } else {
      setRole(null);
    }
  }, [isAuthenticated, user]);

  const login = () => loginWithRedirect();

  const logout = () => auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  /** Get a bearer token to attach to API requests (see api/client.js) */
  const getToken = () => getAccessTokenSilently();

  return {
    isAuthenticated,
    isLoading,
    user,
    role,
    login,
    logout,
    getToken,
  };
}
