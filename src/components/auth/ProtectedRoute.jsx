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
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import LogoutButton from '../auth/LogoutButton';

/**
 * Wrap protected route trees with this. Optionally pass `allowedRoles` to
 * restrict access further (e.g. ['organiser']) — unauthorised users see an
 * in-place notice rather than being bounced, since they are still logged in.
 */
export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, role, error } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner fullPage label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  // Authenticated but backend sync failed — show a retry screen
  if (error && !role) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Couldn’t verify your account</h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>
          <LogoutButton className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100" />
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">You don’t have access to this page</h2>
          <p className="mt-1 text-sm text-slate-500">
            This area is restricted to {allowedRoles.join(' / ')} accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => window.history.back()}>Go back</Button>
          <LogoutButton className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100" />
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
