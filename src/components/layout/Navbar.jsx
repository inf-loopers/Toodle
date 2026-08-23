/**
 * @file Navbar.jsx
 * @description Top navigation bar component.
 *
 * Responsibilities:
 * - Displays the current page title and Toodle branding on mobile.
 * - Mobile hamburger toggle button to open/close the responsive Sidebar.
 * - Authenticated user section: displays user avatar, display name, role badge, and quick logout button.
 * - Sticky header positioning with translucent backdrop blur effect.
 *
 * Props:
 * - title: Current page title string from PageLayout.
 * - isSidebarOpen: Boolean indicating mobile sidebar drawer state.
 * - onToggleSidebar: Function callback to toggle mobile sidebar drawer.
 */

import { useState, useRef, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInitials, getRoleBadgeStyle } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';
import LogoutButton from '../auth/LogoutButton';

export default function Navbar({ title, isSidebarOpen, onToggleSidebar }) {
  const { user, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
      {/* Left section: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile logo (visible only when sidebar is hidden) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
            T
          </div>
          <span className="text-sm font-bold text-slate-900">Toodle</span>
        </div>

        {/* Page title (desktop) */}
        {title && (
          <h2 className="hidden text-lg font-semibold text-slate-900 md:block">{title}</h2>
        )}
      </div>

      {/* Right section: user info */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="relative" ref={menuRef}>
            {/* User trigger button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary">
                {getInitials(user.name || user.email)}
              </div>
              <div className="hidden flex-col items-start lg:flex">
                <p className="text-sm font-medium leading-tight text-slate-700">
                  {user.name || user.email}
                </p>
                <span className={`inline-block rounded px-1.5 text-[10px] font-semibold leading-tight ${getRoleBadgeStyle(role)}`}>
                  {ROLE_LABELS[role] || 'User'}
                </span>
              </div>
              <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform lg:block ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {/* Header */}
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{user.name || user.email}</p>
                  {user.email && user.name && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">{user.email}</p>
                  )}
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeStyle(role)}`}>
                    {ROLE_LABELS[role] || 'User'}
                  </span>
                </div>

                {/* Actions */}
                <div className="px-2 py-2">
                  <LogoutButton
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMenuOpen(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

