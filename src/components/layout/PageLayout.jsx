/**
 * @file PageLayout.jsx
 * @description Master layout wrapper for all protected internal pages.
 *
 * Responsibilities:
 * - Coordinates state for mobile responsive sidebar navigation.
 * - Composes `<Navbar />`, `<Sidebar />`, dynamic main `<Outlet />`, and `<Footer />`.
 * - Manages desktop margin offsets (`lg:pl-64`) so main content area never overlaps the fixed sidebar.
 *
 * Expected Usage:
 * Used as the layout element in React Router protected routes:
 * ```jsx
 * <Route element={<ProtectedRoute><PageLayout /></ProtectedRoute>}>
 *   <Route path="/dashboard" element={<DashboardPage />} />
 * </Route>
 * ```
 */

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';

const PAGE_TITLES = [
  { match: '/dashboard', title: 'Dashboard' },
  { match: '/allocations', title: 'Allocation Board' },
  { match: '/courses', title: 'Courses' },
  { match: '/tutors', title: 'Tutors' },
  { match: '/volunteers', title: 'Volunteer Overflow' },
  { match: '/timesheets', title: 'Timesheets' },
  { match: '/swaps', title: 'Session Swaps' },
  { match: '/reports', title: 'Reports' },
  { match: '/profile', title: 'My Profile' },
];

export function PageLayout() {
  const { pathname } = useLocation();
  const current = PAGE_TITLES.find((p) => pathname.startsWith(p.match));
  const title = current?.title || 'Dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar
            title={title}
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />

          <main className="flex-1 p-6 lg:p-8">
            <Outlet />
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}

export default PageLayout;
