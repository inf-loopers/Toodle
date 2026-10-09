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
 * Performance (B07): every authenticated page is lazy-loaded so its code (and
 * heavy deps like FullCalendar on `/calendar` or dnd-kit on `/allocations`) is
 * split into its own on-demand chunk instead of shipping in the initial bundle.
 * Public entry routes (landing/login/callback/404) stay eager for a fast first
 * paint. Lazy pages resolve inside the `<Suspense>` boundary in `PageLayout`
 * (or the onboarding-specific boundary below), keeping the shell mounted.
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

// Public entry routes are kept in the initial bundle so the first paint is not
// blocked waiting on a lazy chunk.
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import CallbackPage from '../pages/CallbackPage';
import NotFoundPage from '../pages/NotFoundPage';

// Authenticated pages are lazy-loaded: each becomes its own route chunk fetched
// only when the user navigates there. Heavy per-page dependencies (FullCalendar,
// dnd-kit, etc.) are therefore kept out of the main bundle.
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AllocationBoardPage = lazy(() => import('../pages/AllocationBoardPage'));
const CoursesPage = lazy(() => import('../pages/CoursesPage'));
const CourseDetailPage = lazy(() => import('../pages/CourseDetailPage'));
const TutorsPage = lazy(() => import('../pages/TutorsPage'));
const VolunteersPage = lazy(() => import('../pages/VolunteersPage'));
const TimesheetsPage = lazy(() => import('../pages/TimesheetsPage'));
const SessionSwapPage = lazy(() => import('../pages/SessionSwapPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const ExcusalsPage = lazy(() => import('../pages/ExcusalsPage'));
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
          <Route
            path="/onboarding"
            element={
              <Suspense fallback={<Spinner fullPage label="Loading…" />}>
                <OnboardingPage />
              </Suspense>
            }
          />

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
