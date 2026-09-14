/**
 * @file Navbar.jsx
 * @description Top navigation bar component.
 *
 * Responsibilities:
 * - Displays the current page title and Toodle branding on mobile.
 * - Mobile hamburger toggle button to open/close the responsive Sidebar.
 * - Displays the notification bell and notification dropdown.
 * - Authenticated user section with profile dropdown.
 * - Provides quick access to My Profile.
 * - Signs the user out from the profile dropdown.
 * - Supports light and dark mode styling.
 *
 * Props:
 * - title: Current page title string from PageLayout.
 * - isSidebarOpen: Boolean indicating mobile sidebar drawer state.
 * - onToggleSidebar: Function callback to toggle mobile sidebar drawer.
 */

import { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronDown, UserRound, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { getRoleBadgeStyle } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';
import NotificationBell from './NotificationBell';
import UserAvatar from '../ui/UserAvatar';

export default function Navbar({ title, isSidebarOpen, onToggleSidebar }) {
  const { user, dbUser, role, logout } = useAuth();
  const profile = dbUser || user;

  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  const menuRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menus with Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const handleSignOutClick = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError('Unable to sign out. Please try again.');
      setLoggingOut(false);
      setMenuOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#0b1220]/85 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              T
            </div>

            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Toodle</span>
          </div>

          {/* Desktop page title */}
          {title && (
            <h2 className="hidden text-lg font-semibold text-slate-900 dark:text-slate-100 md:block">
              {title}
            </h2>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {user && <NotificationBell />}

          {/* User profile */}
          {user && (
            <div className="relative" ref={menuRef}>
              {/* Profile trigger */}
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-slate-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:border-slate-700 dark:hover:bg-slate-800"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <UserAvatar user={profile} size="sm" className="text-xs font-semibold" />

                <div className="hidden flex-col items-start lg:flex">
                  <p className="text-sm font-medium leading-tight text-slate-700 dark:text-slate-200">
                    {profile.name || profile.email}
                  </p>

                  <span
                    className={`inline-block rounded px-1.5 text-[10px] font-semibold leading-tight ${getRoleBadgeStyle(
                      role
                    )}`}
                  >
                    {ROLE_LABELS[role] || 'User'}
                  </span>
                </div>

                <ChevronDown
                  className={`hidden h-4 w-4 text-slate-400 transition-transform lg:block ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile dropdown */}
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  role="menu"
                >
                  {/* User summary */}
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {user.name || user.email}
                    </p>

                    {profile.email && profile.name && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{profile.email}</p>
                    )}

                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeStyle(
                        role
                      )}`}
                    >
                      {ROLE_LABELS[role] || 'User'}
                    </span>
                  </div>

                  {/* My Profile */}
                  <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleProfile}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      role="menuitem"
                    >
                      <UserRound className="h-4 w-4" />
                      My Profile
                    </button>
                  </div>

                  {/* Sign out */}
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={handleSignOutClick}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      {loggingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                    {logoutError && (
                      <p role="alert" className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                        {logoutError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

    </>
  );
}
