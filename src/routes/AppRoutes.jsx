/**
 * @file AppRoutes.jsx
 * @description Central React Router (v7) routing configuration.
 *
 * Responsibilities:
 * - Defines public routes (e.g. `/login`).
 * - Defines protected route hierarchy wrapped in `<ProtectedRoute>` and `<PageLayout>`.
 * - Implements role-based access rules via `<RoleGate>`:
 *   - `/allocation-board` (Admin, Lecturer)
 *   - `/tutors` (Admin, Lecturer)
 *   - `/profile` (All authenticated roles)
 *   - `/reports` (Admin)
 *   - `/users` (Admin)
 *   - `/courses`, `/courses/:id`, `/dashboard` (All authenticated roles)
 *   - `/calendar` (All authenticated roles; lazy-loaded)
 * - Defines 404 catch-all route (`*`).
 *
 * Expected Usage:
 * Rendered inside `<BrowserRouter>` in `App.jsx`.
 */

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ROLES } from '../utils/constants';

import PageLayout from '../components/layout/PageLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import OnboardingGate from '../components/auth/OnboardingGate';
import Spinner from '../components/ui/Spinner';

import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import CallbackPage from '../pages/CallbackPage';
import DashboardPage from '../pages/DashboardPage';
import AllocationBoardPage from '../pages/AllocationBoardPage';
import CoursesPage from '../pages/CoursesPage';
import CourseDetailPage from '../pages/CourseDetailPage';
import TutorsPage from '../pages/TutorsPage';
import VolunteersPage from '../pages/VolunteersPage';
import TimesheetsPage from '../pages/TimesheetsPage';
import SessionSwapPage from '../pages/SessionSwapPage';
import ReportsPage from '../pages/ReportsPage';
import UsersPage from '../pages/UsersPage';
import ProfilePage from '../pages/ProfilePage';
import OnboardingPage from '../pages/OnboardingPage';
import NotFoundPage from '../pages/NotFoundPage';
import ExcusalsPage from '../pages/ExcusalsPage';

// Lazy-loaded so FullCalendar is split into its own chunk and kept out of the
// main bundle; it is only needed on /calendar.
const CalendarPage = lazy(() => import('../pages/CalendarPage'));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      {/* Authenticated shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<OnboardingGate />}>
          {/* First-time onboarding (outside the page layout, no sidebar) */}
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route element={<PageLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/calendar"
              element={
                <Suspense fallback={<Spinner fullPage label="Loading calendar…" />}>
                  <CalendarPage />
                </Suspense>
              }
            />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailPage />} />
            <Route path="/timesheets" element={<TimesheetsPage />} />
            <Route path="/swaps" element={<SessionSwapPage />} />
            <Route path="/volunteers" element={<VolunteersPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Tutor + staff */}
            <Route
              element={<ProtectedRoute allowedRoles={[ROLES.TUTOR, ROLES.ADMIN, ROLES.LECTURER]} />}
            >
              <Route path="/excusals" element={<ExcusalsPage />} />
            </Route>

            {/* Staff (admin + lecturer) */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.LECTURER]} />}>
              <Route path="/allocations" element={<AllocationBoardPage />} />
              <Route path="/tutors" element={<TutorsPage />} />
            </Route>

            {/* Admin-only */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
