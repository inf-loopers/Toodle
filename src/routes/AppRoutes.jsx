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

import { Routes, Route, Navigate } from 'react-router-dom';
import { ROLES } from '../utils/constants';

import PageLayout from '../components/layout/PageLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';

import LandingPage from '../pages/LandingPage';
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
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/callback" element={<CallbackPage />} />

      {/* Authenticated shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PageLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/timesheets" element={<TimesheetsPage />} />
          <Route path="/swaps" element={<SessionSwapPage />} />
          <Route path="/volunteers" element={<VolunteersPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Organiser-only */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ORGANISER]} />}>
            <Route path="/allocations" element={<AllocationBoardPage />} />
            <Route path="/tutors" element={<TutorsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
    </Routes>
  );
}
