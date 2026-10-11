/**
 * @file OnboardingGate.jsx
 * @description Route gate that keeps students in the first-time onboarding
 * flow until the system has collected their eligibility information.
 *
 * A STUDENT whose profile is missing onboarding items is redirected to
 * `/onboarding` from every authenticated route. Staff roles (ADMIN,
 * LECTURER) receive a separate welcome flow when their role is first granted.
 * Pending staff requests open the access-status screen. Tutors and completed
 * students pass straight through.
 *
 * Expected Usage:
 * Nested inside `<ProtectedRoute>` so the gate only ever sees authenticated,
 * backend-synced users.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { getOnboardingMissing } from '../../utils/onboarding';

export function OnboardingGate() {
  const { isLoading, role, dbUser } = useAuth();
  const location = useLocation();

  // ProtectedRoute above us already handles loading and unauthenticated
  // states; hold the tree until the backend profile has synced.
  if (isLoading) return <Outlet />;

  if (role === ROLES.STUDENT && dbUser?.staffAccessRequest?.status === 'PENDING') {
    return <Navigate to="/staff-access" replace />;
  }
  if (
    [ROLES.ADMIN, ROLES.LECTURER].includes(role) &&
    dbUser?.staffWelcomeRequired &&
    !['/staff-welcome', '/profile', '/help'].includes(location.pathname)
  ) {
    return <Navigate to="/staff-welcome" replace />;
  }

  const needsOnboarding = role === ROLES.STUDENT && getOnboardingMissing(dbUser).length > 0;

  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export default OnboardingGate;
