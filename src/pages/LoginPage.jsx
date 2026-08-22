/**
 * @file LoginPage.jsx
 * @description Public authentication entry point with a split-screen layout.
 *
 * Responsibilities:
 * - Renders a two-panel login page: left branding hero (LoginHero) and
 *   right sign-in form (LoginForm).
 * - Automatically redirects already-authenticated users to `/dashboard`
 *   (or their originally requested route via `appState.returnTo`).
 * - Provides a full-height responsive layout: on desktop the two panels
 *   sit side-by-side; on mobile the form is shown stacked below a
 *   condensed hero.
 *
 * Route: `/login`
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginHero from '../components/auth/LoginHero';
import LoginForm from '../components/auth/LoginForm';

/**
 * LoginPage
 *
 * If the user is already authenticated, redirect them away from the
 * login page to the dashboard. Otherwise render the split-screen
 * authentication UI.
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // While Auth0 is still checking the session, show nothing to avoid a
  // flash of the login form before redirecting.
  if (isLoading) {
    return null;
  }

  // Already signed in — no need to see the login page again.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/*
        Left panel: branding hero with university imagery.
        Hidden on small screens (mobile-first), shown from `lg` breakpoint
        and takes up 5/12 of the width.
      */}
      <aside className="hidden lg:flex lg:w-5/12">
        <LoginHero />
      </aside>

      {/*
        Right panel: sign-in form.
        Full width on mobile, 7/12 on desktop.
      */}
      <main className="flex w-full items-center justify-center lg:w-7/12">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
