/**
 * @file LoginPage.jsx
 * @description Public authentication entry point.
 *
 * Click "Sign In to Portal" → Auth0 Universal Login → backend syncs user to
 * Supabase (role checked from DB) → redirect to the appropriate dashboard.
 *
 * Route: `/login`
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LoginButton from '../components/auth/LoginButton';
import Card from '../components/ui/Card';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Sign in · Toodle';
  }, []);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Welcome to Toodle</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in with your Wits account to reach your dashboard.
          </p>
        </div>

        <Card>
          <div className="flex items-start gap-3 rounded-xl bg-primary-subtle p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-primary">
              Authentication is handled securely by Auth0. Your role is read from the database and
              determines what you can see.
            </p>
          </div>

          <LoginButton className="mt-5 w-full justify-center" />
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
