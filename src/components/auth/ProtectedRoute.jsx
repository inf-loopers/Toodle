/**
 * @file ProtectedRoute.jsx
 * @description Route guard component ensuring only authenticated users can access child routes.
 *
 * Responsibilities:
 * - Checks `isAuthenticated` and `isLoading` from `useAuth()`.
 * - Shows an accessible loading spinner while authentication state is verified.
 * - Redirects unauthenticated visitors to `/login` with the current location saved in state.
 * - Renders `<Outlet />` or `children` when authentication succeeds.
 *
 * Expected Usage:
 * ```jsx
 * <Route element={<ProtectedRoute><PageLayout /></ProtectedRoute>}>
 *   <Route path="/dashboard" element={<DashboardPage />} />
 * </Route>
 * ```
 */
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import LogoutButton from '../auth/LogoutButton';
import AppLogo from '../ui/AppLogo';

/**
 * Wrap protected route trees with this. Optionally pass `allowedRoles` to
 * restrict access further (e.g. ['admin']) — unauthorised users see an
 * in-place notice rather than being bounced, since they are still logged in.
 */
export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, role, error } = useAuth();
  const location = useLocation();
  const accountClosed = String(error || '').startsWith('This account is closed.');

  if (isLoading) {
    return <Spinner fullPage label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  // Authenticated but backend sync failed — show a retry screen
  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {accountClosed ? 'Account closed' : 'Couldn’t verify your account'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
        <div className="flex items-center gap-3">
          {accountClosed && (
            <Button as={Link} to="/register-again">
              Create a new account
            </Button>
          )}
          {!accountClosed && (
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          )}
          <LogoutButton className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100" />
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <AuthStatusScreen
        tone="danger"
        title="You don’t have access to this page"
        message={`This area is restricted to ${allowedRoles.join(' / ')} accounts.`}
        primaryAction={
          <Button className="w-full sm:w-auto" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go back
          </Button>
        }
      />
    );
  }

  return <Outlet />;
}

const TONES = {
  warning: {
    Icon: AlertTriangle,
    badge:
      'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  },
  danger: {
    Icon: ShieldAlert,
    badge:
      'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20',
  },
};

/**
 * Status card for signed-in users who can't proceed. `fullScreen` is for the
 * sync failure, which renders outside PageLayout and so carries its own page
 * background and logo; the role check renders inside the app shell.
 * Sign out skips the confirm step: here it is the expected way forward.
 */
function AuthStatusScreen({ tone, title, message, details, primaryAction, fullScreen = false }) {
  const { Icon, badge } = TONES[tone];

  return (
    <div
      className={
        fullScreen
          ? 'flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-black'
          : 'flex min-h-[60vh] flex-col items-center justify-center py-6'
      }
    >
      {fullScreen && <AppLogo className="mb-6 h-12 w-12 object-contain" alt="Toodle" />}

      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-8 ${badge}`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-neutral-50">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          {message}
        </p>

        {details && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs break-words text-slate-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            <span className="font-semibold text-slate-600 dark:text-neutral-300">Details: </span>
            {details}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <LogoutButton
            confirm={false}
            className="w-full justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-50 sm:w-auto dark:border-neutral-700 dark:bg-neutral-900 dark:text-rose-400 dark:hover:bg-rose-500/10"
          />
          {primaryAction}
        </div>
      </div>
    </div>
  );
}

export default ProtectedRoute;
