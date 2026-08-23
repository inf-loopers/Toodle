/**
 * RoleGate.jsx
 *
 * Conditionally renders children based on the current user's role.
 * Use this for role-specific UI within a page that any authenticated
 * user can reach — e.g. hiding the "Create Course" button from Tutors.
 *
 * For blocking a whole PAGE by role, do that check in the page itself
 * (e.g. redirect Tutors away from AllocationBoardPage), not here.
 *
 * Usage:
 *   <RoleGate allow={['Organiser']}>
 *     <Button onClick={createCourse}>Create Course</Button>
 *   </RoleGate>
 *
 *   <RoleGate allow={['Organiser', 'Tutor']} fallback={<p>Not available</p>}>
 *     <AllocationBoard />
 *   </RoleGate>
 */

import { useAuth } from '../../hooks/useAuth';

export default function RoleGate({ allow, children, fallback = null }) {
  const { role } = useAuth();

  if (!role || !allow.includes(role)) {
    return fallback;
  }

  return children;
}

export default RoleGate;
