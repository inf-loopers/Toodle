/**
 * @file Navbar.jsx
 * @description Top navigation bar component.
 *
 * Responsibilities:
 * - Displays the current page title and Toodle branding on mobile.
 * - Mobile hamburger toggle button to open/close the responsive Sidebar.
 * - Authenticated user section with profile dropdown.
 * - Provides quick access to My Profile.
 * - Confirms before signing the user out.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  UserRound,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { getInitials, getRoleBadgeStyle } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';

export default function Navbar({
  title,
  isSidebarOpen,
  onToggleSidebar,
}) {
  const { user, role, logout } = useAuth();

  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown with Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setShowLogoutConfirm(false);
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

  const handleSignOutClick = () => {
    setMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
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
            aria-label={
              isSidebarOpen ? 'Close sidebar' : 'Open sidebar'
            }
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              T
            </div>

            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Toodle
            </span>
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary dark:bg-slate-800 dark:text-sky-200">
                  {getInitials(user.name || user.email)}
                </div>

                <div className="hidden flex-col items-start lg:flex">
                  <p className="text-sm font-medium leading-tight text-slate-700 dark:text-slate-200">
                    {user.name || user.email}
                  </p>

                  <span
                    className={`inline-block rounded px-1.5 text-[10px] font-semibold leading-tight ${getRoleBadgeStyle(
                      role,
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

              {/* Dropdown */}
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

                    {user.email && user.name && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {user.email}
                      </p>
                    )}

                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeStyle(
                        role,
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
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Sign-out confirmation */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[1px]"
          role="presentation"
          onMouseDown={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2
              id="logout-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Sign out?
            </h2>

            <p
              id="logout-description"
              className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
            >
              Are you sure you want to sign out of Toodle?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLogout}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}