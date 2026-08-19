/**
 * @file AppRoutes.jsx
 * @description Central React Router (v7) routing configuration.
 *
 * Responsibilities:
 * - Defines public routes (e.g. `/login`).
 * - Defines protected route hierarchy wrapped in `<ProtectedRoute>` and `<PageLayout>`.
 * - Implements role-based access rules via `<RoleGate>`:
 *   - `/allocation-board` (Organiser)
 *   - `/tutors` (Organiser)
 *   - `/profile` (Tutor, Organiser)
 *   - `/courses`, `/courses/:id`, `/dashboard` (All authenticated roles)
 * - Defines 404 catch-all route (`*`).
 *
 * Expected Usage:
 * Rendered inside `<BrowserRouter>` in `App.jsx`.
 */

export default function AppRoutes() {
  // TODO: Implement Route hierarchy with ProtectedRoute, RoleGate, and PageLayout
  return null;
}
