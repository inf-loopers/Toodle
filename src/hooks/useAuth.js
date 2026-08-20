/**
 * @file useAuth.js
 * @description Central authentication and Role-Based Access Control (RBAC) custom hook.
 *
 * Responsibilities:
 * - Wraps `@auth0/auth0-react` SDK methods and state.
 * - Extracts and normalizes the user's role from custom Auth0 claims (`{VITE_AUTH0_AUDIENCE}/roles`).
 * - Provides role boolean flags: `isOrganiser`, `isTutor`, `isStudent`.
 * - Provides permission checker: `hasRole(['organiser', 'tutor'])`.
 * - Provides token retrieval helper: `getToken()` for manual Bearer token requests.
 * - Includes offline local development bypass support (`loginAsDevRole`) for rapid testing.
 *
 * Returns:
 * - `user`: Authenticated user profile object.
 * - `role`: Active user role string (organiser | tutor | student).
 * - `isAuthenticated`: Boolean authentication flag.
 * - `isLoading`: Boolean loading indicator.
 * - `error`: Any Auth0 initialization or authentication error.
 * - `login()`: Triggers Auth0 redirect.
 * - `logout()`: Clears session.
 * - `getToken()`: Asynchronously retrieves JWT access token.
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo, useState } from 'react';
import { AUTH0_NAMESPACE, ROLES } from '../utils/constants';

const DEV_USER_STORAGE_KEY = 'toodle_dev_user';

export function useAuth() {
  const auth0 = useAuth0();
  const {
    user: auth0User,
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0IsLoading,
    error: auth0Error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = auth0;

  // Local dev user state for quick-switch testing during development
  const [devUser, setDevUser] = useState(() => {
    try {
      const stored = localStorage.getItem(DEV_USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(auth0IsAuthenticated || devUser);
  const isLoading = auth0IsLoading && !devUser;
  const user = devUser || auth0User;

  // Extract role from Auth0 custom claim, metadata, or dev user
  const role = useMemo(() => {
    if (!user) return null;

    if (devUser?.role) {
      return devUser.role.toLowerCase();
    }

    // Auth0 custom namespace claims (e.g. https://api.toodle.com/roles)
    const namespaceRoles =
      user[`${AUTH0_NAMESPACE}`] ||
      user[`${AUTH0_NAMESPACE}/role`] ||
      user[`${AUTH0_NAMESPACE}/roles`];
    if (Array.isArray(namespaceRoles) && namespaceRoles.length > 0) {
      return namespaceRoles[0].toLowerCase();
    }
    if (typeof namespaceRoles === 'string') {
      return namespaceRoles.toLowerCase();
    }

    // Direct role claim fallback
    if (user.role) {
      return Array.isArray(user.role) ? user.role[0].toLowerCase() : user.role.toLowerCase();
    }

    // Default fallback
    return ROLES.ORGANISER;
  }, [user, devUser]);

  const hasRole = useCallback(
    (allowedRoles) => {
      if (!role) return false;
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      return rolesArray.map((r) => r.toLowerCase()).includes(role);
    },
    [role]
  );

  const login = useCallback(
    async (options = {}) => {
      try {
        await loginWithRedirect({
          appState: { returnTo: window.location.pathname },
          ...options,
        });
      } catch (err) {
        console.error('Auth0 login redirect error:', err);
        throw err;
      }
    },
    [loginWithRedirect]
  );

  const loginAsDevRole = useCallback((selectedRole) => {
    const mockUsers = {
      [ROLES.ORGANISER]: {
        name: 'Dr. Prof. Organiser (Staff)',
        email: 'organiser@wits.ac.za',
        role: ROLES.ORGANISER,
        picture: null,
      },
      [ROLES.TUTOR]: {
        name: 'Alice Smith (Tutor)',
        email: 'alice@students.wits.ac.za',
        role: ROLES.TUTOR,
        picture: null,
      },
      [ROLES.STUDENT]: {
        name: 'John Doe (Student)',
        email: 'john@students.wits.ac.za',
        role: ROLES.STUDENT,
        picture: null,
      },
    };

    const target = mockUsers[selectedRole] || mockUsers[ROLES.ORGANISER];
    localStorage.setItem(DEV_USER_STORAGE_KEY, JSON.stringify(target));
    setDevUser(target);
  }, []);

  const logout = useCallback(
    (options = {}) => {
      localStorage.removeItem(DEV_USER_STORAGE_KEY);
      setDevUser(null);
      if (auth0IsAuthenticated) {
        return auth0Logout({
          logoutParams: {
            returnTo: window.location.origin,
            ...options,
          },
        });
      }
    },
    [auth0Logout, auth0IsAuthenticated]
  );

  const getToken = useCallback(async () => {
    if (devUser) {
      return 'dev-mock-jwt-token';
    }
    try {
      return await getAccessTokenSilently();
    } catch (err) {
      console.debug('Failed to acquire token silently:', err);
      return null;
    }
  }, [getAccessTokenSilently, devUser]);

  return {
    user,
    role,
    isAuthenticated,
    isLoading,
    error: auth0Error,
    isOrganiser: role === ROLES.ORGANISER,
    isTutor: role === ROLES.TUTOR,
    isStudent: role === ROLES.STUDENT,
    hasRole,
    login,
    loginAsDevRole,
    logout,
    getToken,
  };
}

export default useAuth;
