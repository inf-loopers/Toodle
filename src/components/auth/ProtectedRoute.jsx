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

export default function ProtectedRoute() {
  // TODO: Implement authentication guard & loading spinner
  return null;
}
