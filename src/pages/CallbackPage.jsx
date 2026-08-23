/**
 * @file CallbackPage.jsx
 * @description Auth0 callback handler rendered at `/callback` after the user authenticates.
 *
 * The Auth0 SDK processes the authorization code exchange automatically, but while that
 * is in flight (or while the backend sync runs) this page shows a full-screen spinner.
 * Once the user is fully authenticated AND the DB sync completes, it redirects to
 * `/dashboard`.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth();
  const { isLoading: auth0Loading } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    // Auth + sync complete → go to dashboard
    if (!isLoading && isAuthenticated && !error) {
      navigate('/dashboard', { replace: true });
    }
    // Auth0 finished but not authenticated (no valid callback params) → go to login
    if (!auth0Loading && !isAuthenticated && !error) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, error, auth0Loading, navigate]);

  // If there's an auth error, show it instead of spinning forever
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-900">Authentication error</p>
        <p className="max-w-md text-sm text-slate-500">{error}</p>
        <a
          href="/"
          className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return <Spinner fullPage label="Signing you in…" />;
}
