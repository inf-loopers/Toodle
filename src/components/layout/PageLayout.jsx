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

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const SIDEBAR_STORAGE_KEY = 'toodle.sidebarCollapsed';
const THEME_STORAGE_KEY = 'toodle.theme';

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
  { match: '/profile', title: 'My Profile' },
];

function getInitialSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
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
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable in private browsing or embedded contexts.
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
    } catch {
      // Storage can be unavailable in private browsing or embedded contexts.
    }
  }, [sidebarCollapsed]);

  return (
    <div className="toodle-app min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          theme={theme}
          onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
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
        </div>
      </div>
    </div>
  );
}

export default PageLayout;
