import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginButton() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();

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
      onClick={login}
      className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl px-5 py-2.5"
    >
      Sign In to Portal
    </button>
  );
}

