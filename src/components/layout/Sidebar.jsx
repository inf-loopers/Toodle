/**
 * @file Sidebar.jsx
 * @description Side navigation drawer with dynamic role-based navigation links.
 *
 * Responsibilities:
 * - Filters visible navigation links based on user role:
 *   - Organiser: Dashboard, Allocation Board, Courses, Tutor Directory.
 *   - Tutor: Dashboard, Courses, My Availability / Profile.
 *   - Student: Dashboard, Courses.
 * - Highlights active route with `NavLink`.
 * - Responsive backdrop and slide-in drawer on mobile viewports (< 1024px).
 *
 * Props:
 * - isOpen: Boolean indicating whether mobile drawer is open.
 * - onClose: Callback to close mobile drawer upon navigation item click or backdrop tap.
 */
import { NavLink } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  Users,
  BookOpen,
  Clock,
  ArrowLeftRight,
  HandHeart,
  BarChart3,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NAV_SECTIONS, ROLE_LABELS } from '../../utils/constants';
import LogoutButton from '../auth/LogoutButton';

const ICONS = {
  Home,
  LayoutGrid,
  Users,
  BookOpen,
  Clock,
  ArrowLeftRight,
  HandHeart,
  BarChart3,
};

export function Sidebar({ pendingSwaps = 0, isOpen = false, onClose }) {
  const { role } = useAuth();
  const sections = NAV_SECTIONS[role] || NAV_SECTIONS.student;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:sticky md:top-0 md:z-auto md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            T
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Toodle</h1>
            <p className="text-xs text-slate-400">Tutor Management</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          {sections.map((section) => (
            <div key={section.heading} className="sidebar-section">
              <p className="sidebar-heading">{section.heading}</p>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] || Home;
                  const badge = item.name === 'Swaps' && pendingSwaps > 0 ? pendingSwaps : null;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                    >
                      <span className="icon-box">
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      {item.name}
                      {badge && <span className="sidebar-badge">{badge}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Signed in as
          </p>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">{ROLE_LABELS[role] || 'Guest'}</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <Wifi className="h-3 w-3" />
                Connected
              </div>
              <LogoutButton
                showLabel={false}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                title="Sign out"
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
