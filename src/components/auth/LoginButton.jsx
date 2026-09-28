import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/helpers';

export default function LoginButton({
  className,
  children = 'Continue to sign in or sign up',
  screenHint,
  ...props
}) {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  const location = useLocation();

  const returnTo = typeof location.state?.from === 'string' ? location.state.from : '/dashboard';

  const handleLogin = () => {
    login({
      appState: { returnTo },
      ...(screenHint ? { authorizationParams: { screen_hint: screenHint } } : {}),
    });
  };

  if (isLoading) return null;

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">{user?.name}</span>
        <button
          onClick={logout}
          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className={cn(
        'rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
