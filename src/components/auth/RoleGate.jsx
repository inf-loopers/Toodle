/**
 * @file RoleGate.jsx
 * @description Role-Based Access Control (RBAC) component.
 *
 * Responsibilities:
 * - Compares the user's role against `allowedRoles` (e.g. ['organiser', 'tutor']).
 * - Can act as a route guard (redirecting unauthorized users to /dashboard) or as a UI component wrapper (hiding forbidden buttons).
 *
 * Props:
 * - allowedRoles: Array of allowed role strings from ROLES constant (e.g. [ROLES.ORGANISER]).
 * - children: Elements to render when authorized.
 * - fallback: Optional component to display when access is denied.
 * - isRoute: Boolean flag indicating if this is used inside a React Router <Route>.
 * - redirect: Path to redirect to if unauthorized (default: '/dashboard').
 *
 * Expected Usage:
 * ```jsx
 * <RoleGate allowedRoles={[ROLES.ORGANISER]}>
 *   <Button>Delete Course</Button>
 * </RoleGate>
 * ```
 */

export default function RoleGate() {
  // TODO: Implement RBAC role verification logic
  return null;
}
