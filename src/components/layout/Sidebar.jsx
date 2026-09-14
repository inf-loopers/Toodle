/**
 * @file Sidebar.jsx
 * @description Side navigation drawer with dynamic role-based navigation links.
 *
 * Responsibilities:
 * - Filters visible navigation links based on user role.
 * - Highlights active route with `NavLink`.
 * - Responsive backdrop and slide-in drawer on mobile viewports.
 * - Supports collapsed desktop navigation.
 * - Provides theme controls and account status.
 * - Provides access to the problem reporting flow.
 *
 * Props:
 * - pendingSwaps: Number of pending swap requests.
 * - isOpen: Boolean indicating whether mobile drawer is open.
 * - isCollapsed: Boolean indicating whether desktop sidebar is collapsed.
 * - onClose: Callback to close mobile drawer.
 * - onToggleCollapsed: Callback to collapse/expand desktop sidebar.
 * - theme: Current application theme.
 * - onToggleTheme: Callback to switch application theme.
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Bug,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  HandHeart,
  Home,
  LayoutGrid,
  Moon,
  Sun,
  Users,
  Wifi,
  X,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { NAV_SECTIONS, ROLE_LABELS } from '../../utils/constants';
import { cn } from '../../utils/helpers';

import LogoutButton from '../auth/LogoutButton';
import ReportProblemModal from './ReportProblemModal';

const ICONS = {
  Home,
  LayoutGrid,
  Users,
  BookOpen,
  Clock,
  CalendarX,
  ArrowLeftRight,
  HandHeart,
  BarChart3,
};

const PAGE_NAMES = [
  { match: '/dashboard', name: 'Dashboard' },
  { match: '/allocations', name: 'Allocation Board' },
  { match: '/courses', name: 'Courses' },
  { match: '/tutors', name: 'Tutors' },
  { match: '/timesheets', name: 'Timesheets' },
  { match: '/excusals', name: 'Excusals' },
  { match: '/swaps', name: 'Session Swaps' },
  { match: '/volunteers', name: 'Volunteer Overflow' },
  { match: '/reports', name: 'Reports' },
  { match: '/profile', name: 'My Profile' },
];

function getPageName(pathname) {
  const page = PAGE_NAMES.find((item) => pathname.startsWith(item.match));

  return page?.name || 'Toodle';
}

export function Sidebar({
  pendingSwaps = 0,
  isOpen = false,
  isCollapsed = false,
  onClose,
  onToggleCollapsed,
  theme = 'light',
  onToggleTheme,
}) {
  const { role } = useAuth();
  const { pathname } = useLocation();

  const [reportOpen, setReportOpen] = useState(false);

  const sections = NAV_SECTIONS[role] || NAV_SECTIONS.student;
  const roleLabel = ROLE_LABELS[role] || 'Guest';

  const isDark = theme === 'dark';

  const ThemeIcon = isDark ? Sun : Moon;

  const themeLabel = isDark ? 'Light mode' : 'Dark mode';

  const themeTooltip = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const pageName = getPageName(pathname);

  const handleOpenReport = () => {
    setReportOpen(true);

    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-[transform,width] duration-200 ease-in-out dark:border-slate-800 dark:bg-[#0a1020]',
          'lg:sticky lg:top-0 lg:z-40 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'
        )}
      >
        {/* Desktop collapse button */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute -right-3 top-6 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Branding */}
        <div
          className={cn(
            'relative flex h-20 items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800',
            isCollapsed && 'lg:justify-center lg:px-3'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            T
          </div>

          <div className={cn(isCollapsed && 'lg:hidden')}>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Toodle</h1>

            <p className="text-xs text-slate-400">Tutor Management</p>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 overflow-y-auto px-3 py-6', isCollapsed && 'lg:px-2')}>
          {sections.map((section) => (
            <div key={section.heading} className="sidebar-section">
              <p
                className={cn(
                  'sidebar-heading',
                  isCollapsed && 'sidebar-heading-collapsed lg:justify-center lg:px-0'
                )}
              >
                <span className={cn(isCollapsed && 'lg:hidden')}>{section.heading}</span>
              </p>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] || Home;

                  const badge = item.name === 'Swaps' && pendingSwaps > 0 ? pendingSwaps : null;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      aria-label={isCollapsed ? item.name : undefined}
                      title={isCollapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        cn(
                          'sidebar-nav-item group relative',
                          isCollapsed && 'lg:justify-center lg:gap-0 lg:px-2',
                          isActive && 'active'
                        )
                      }
                    >
                      <span className="icon-box">
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>

                      <span className={cn('truncate', isCollapsed && 'lg:hidden')}>
                        {item.name}
                      </span>

                      {badge && (
                        <span
                          className={cn(
                            'sidebar-badge',
                            isCollapsed &&
                              'lg:absolute lg:right-1 lg:top-1 lg:ml-0 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[0.5625rem]'
                          )}
                        >
                          {badge}
                        </span>
                      )}

                      {isCollapsed && (
                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom controls */}
        <div
          className={cn(
            'border-t border-slate-100 p-4 dark:border-slate-800',
            isCollapsed && 'lg:p-2'
          )}
        >
          {/* Report a problem */}
          <div className="mb-2">
            <button
              type="button"
              onClick={handleOpenReport}
              aria-label="Report a problem"
              title={isCollapsed ? 'Report a problem' : undefined}
              className={cn(
                'sidebar-nav-item group relative w-full',
                isCollapsed && 'lg:justify-center lg:gap-0 lg:px-2'
              )}
            >
              <span className="icon-box">
                <Bug className="h-4 w-4" strokeWidth={2} />
              </span>

              <span className={cn('truncate', isCollapsed && 'lg:hidden')}>Report a problem</span>

              {isCollapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Report a problem
                </span>
              )}
            </button>
          </div>

          {/* Theme */}
          <div className="mb-3">
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label={themeTooltip}
              title={isCollapsed ? themeTooltip : undefined}
              onClick={onToggleTheme}
              className={cn(
                'sidebar-theme-button group relative',
                isCollapsed && 'lg:flex-col lg:justify-center lg:gap-1 lg:px-2'
              )}
            >
              <span className="icon-box">
                <ThemeIcon className="h-4 w-4" strokeWidth={2} />
              </span>

              <span className={cn('truncate', isCollapsed && 'lg:hidden')}>{themeLabel}</span>

              <span
                className={cn(
                  'theme-switch',
                  isDark && 'theme-switch-on',
                  isCollapsed && 'theme-switch-compact lg:ml-0'
                )}
                aria-hidden="true"
              >
                <span className="theme-switch-thumb" />
              </span>

              {isCollapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  {themeTooltip}
                </span>
              )}
            </button>
          </div>

          {/* Expanded account status */}
          <div className={cn(isCollapsed && 'lg:hidden')}>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Signed in as
            </p>

            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-200">{roleLabel}</p>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <Wifi className="h-3 w-3" />
                  Connected
                </div>

                <LogoutButton
                  showLabel={false}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                  title="Sign out"
                />
              </div>
            </div>
          </div>

          {/* Collapsed account status */}
          {isCollapsed && (
            <div className="hidden flex-col items-center gap-2 lg:flex">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                title={roleLabel}
              >
                {roleLabel.charAt(0)}
              </div>

              <div
                className="flex h-8 w-8 items-center justify-center text-emerald-600"
                title="Connected"
              >
                <Wifi className="h-3.5 w-3.5" />
              </div>

              <LogoutButton
                showLabel={false}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Sign out"
              />
            </div>
          )}
        </div>
      </aside>

      {/* Problem report modal */}
      <ReportProblemModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        pageName={pageName}
        pathname={pathname}
      />
    </>
  );
}

export default Sidebar;
