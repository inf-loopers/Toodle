/**
 * @file AuthContext.jsx
 * @description Application-wide authentication context that bridges Auth0 and the Toodle backend.
 *
 * Responsibilities:
 * - After Auth0 authentication completes, automatically calls `POST /auth/callback` to
 *   sync (upsert) the user into the Supabase/PostgreSQL database.
 * - Fetches the user's canonical profile (including role) from `GET /auth/me`.
 * - Exposes `dbUser` (backend profile) and `isSyncing` (loading flag) to the component tree.
 *
 * The `useAuth()` hook reads from this context so that every component gets the
 * authoritative database role instead of relying on JWT custom claims alone.
 */

import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * Read the database-backed auth state provided by `<AuthProvider>` in main.jsx.
 * Returns `null` when rendered outside the provider (e.g. in unit tests).
 */
export function useAuthContext() {
  return useContext(AuthContext);
}
