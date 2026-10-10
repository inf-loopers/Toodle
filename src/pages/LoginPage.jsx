/**
 * @file LoginPage.jsx
 * @description Public authentication entry point.
 *
 * Users start here from the landing page or a protected-route redirect. The
 * button opens Auth0 Universal Login, where they can sign in or create an
 * account. After Auth0 returns, the backend syncs the user profile and the
 * onboarding gate decides whether a first-time student must complete setup.
 *
 * Route: `/login`
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Moon, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LoginButton from '../components/auth/LoginButton';
import Card from '../components/ui/Card';
import { applyTheme, getInitialTheme, persistTheme } from '../utils/theme';
import AppLogo from '../components/ui/AppLogo';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.title = 'Sign in or sign up - Toodle';
  }, []);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  return (
    <div className="toodle-app relative flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 dark:bg-[#000000]">
      <button
        type="button"
        onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3b70] text-white shadow-sm transition hover:bg-[#092f59] dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        {theme === 'dark' ? (
          <Sun size={19} strokeWidth={2.2} />
        ) : (
          <Moon size={19} strokeWidth={2.2} />
        )}
      </button>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <AppLogo className="h-16 w-16 object-contain" />

          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome to Toodle
          </h1>

          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Sign in or create an account to continue.
          </p>
        </div>

        <Card>
          <div className="flex items-start gap-3 rounded-xl bg-primary-subtle p-4 dark:bg-blue-950/40">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

            <p className="text-xs leading-relaxed text-primary dark:text-blue-200">
              Authentication is handled securely by Auth0. New student accounts complete onboarding
              after sign-up so Toodle can collect study details, availability, and course marks.
            </p>
          </div>

          <LoginButton className="mt-5 flex w-full items-center justify-center" />
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
