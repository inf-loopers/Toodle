/**
 * @file useAuth.js
 * @description Central authentication and Role-Based Access Control (RBAC) custom hook.
 *
 * Responsibilities:
 * - Wraps `@auth0/auth0-react` SDK methods and state.
 * - Reads the user's canonical role from the Supabase database via `AuthContext`.
 * - Provides role boolean flags: `isOrganiser`, `isTutor`, `isStudent`.
 * - Provides permission checker: `hasRole(['organiser', 'tutor'])`.
 * - Provides token retrieval helper: `getToken()` for manual Bearer token requests.
 * - Includes offline local development bypass support (`loginAsDevRole`) for rapid testing.
 *
 * Returns:
 * - `user`: Authenticated user profile object (DB profile preferred).
 * - `role`: Active user role string from the database (organiser | tutor | student).
 * - `isAuthenticated`: Boolean authentication flag.
 * - `isLoading`: Boolean loading indicator (Auth0 SDK + DB sync).
 * - `error`: Any Auth0 or backend sync error.
 * - `login()`: Triggers Auth0 redirect.
 * - `logout()`: Clears session.
 * - `getToken()`: Asynchronously retrieves JWT access token.
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo, useState } from 'react';
import { ROLES } from '../utils/constants';
import { useAuthContext } from '../context/AuthContext';

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

  // Database-backed user state from the AuthProvider context
  const authContext = useAuthContext();
  const dbUser = authContext?.dbUser ?? null;
  const syncError = authContext?.syncError ?? null;

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
  // Loading while Auth0 initialises OR while authenticated with no DB profile yet (and no error)
  const isLoading =
    (auth0IsLoading && !devUser) ||
    (auth0IsAuthenticated && !dbUser && !devUser && !syncError);
  // Prefer the DB profile; fall back to dev user, then Auth0 profile
  const user = dbUser || devUser || auth0User;

  // Role: DB role is authoritative; dev user role for testing; null if unknown
  const role = useMemo(() => {
    if (dbUser?.role) return dbUser.role.toLowerCase();
    if (devUser?.role) return devUser.role.toLowerCase();
    return null;
  }, [dbUser, devUser]);

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
      // Always clear dev-mode state
      localStorage.removeItem(DEV_USER_STORAGE_KEY);
      setDevUser(null);

      // Clear any cached Auth0 tokens from local storage
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('@@auth0') || key.startsWith('auth0'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch {
        // Silently ignore storage access errors
      }

      if (auth0IsAuthenticated) {
        // Auth0 SDK logout — redirects to Auth0 then back to returnTo
        return auth0Logout({
          logoutParams: {
            returnTo: options.returnTo || window.location.origin,
          },
        });
      }

      // Dev-only user: redirect to landing page manually
      window.location.href = options.returnTo || window.location.origin;
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
    error: auth0Error || syncError,
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
