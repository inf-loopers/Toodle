/**
 * @file PageLayout.jsx
 * @description Master layout wrapper for all protected internal pages.
 *
 * Responsibilities:
 * - Coordinates state for mobile responsive sidebar navigation.
 * - Composes `<Navbar />`, `<Sidebar />`, dynamic main `<Outlet />`, and `<Footer />`.
 * - Locks the shell to the viewport (`h-screen h-[100dvh] overflow-hidden`): the sidebar stays
 *   pinned while `<main>` scrolls independently, and the content column (`min-w-0`)
 *   can shrink below wide content so pages never scroll horizontally at body level.
 * - Keeps the top navigation as one continuous app bar above the sidebar and content.
 *
 * Expected Usage:
 * Used as the layout element in React Router protected routes:
 * ```jsx
 * <Route element={<ProtectedRoute><PageLayout /></ProtectedRoute>}>
 *   <Route path="/dashboard" element={<DashboardPage />} />
 * </Route>
 * ```
 */

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { applyTheme, getInitialTheme, persistTheme } from '../../utils/theme';

const SIDEBAR_STORAGE_KEY = 'toodle.sidebarCollapsed';

const PAGE_TITLES = [
  { match: '/dashboard', title: 'Dashboard' },
  { match: '/allocations', title: 'Allocation Board' },
  { match: '/courses', title: 'Courses' },
  { match: '/tutors', title: 'Tutors' },
  { match: '/volunteers', title: 'Volunteer Overflow' },
  { match: '/timesheets', title: 'Timesheets' },
  { match: '/excusals', title: 'Excusals' },
  { match: '/swaps', title: 'Session Swaps' },
  { match: '/reports', title: 'Reports' },
  { match: '/users', title: 'Users' },
  { match: '/profile', title: 'My Profile' },
];

function getInitialSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function PageLayout() {
  const { pathname } = useLocation();
  const current = PAGE_TITLES.find((p) => pathname.startsWith(p.match));
  const title = current?.title || 'Dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
    } catch {
      // Storage can be unavailable in private browsing or embedded contexts.
    }
  }, [sidebarCollapsed]);

  return (
    <div className="toodle-app flex h-screen h-[100dvh] flex-col overflow-hidden overscroll-none bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      <Navbar
        title={title}
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-50 dark:bg-[#0b1220]">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          theme={theme}
          onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-50 p-4 dark:bg-[#0b1220] sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default PageLayout;
