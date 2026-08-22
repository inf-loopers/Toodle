/**
 * ProtectedRoute.jsx
 *
 * Wrap any route element that requires a logged-in user.
 *
 * Usage (React Router v7):
 *   <Route
 *     path="/dashboard"
 *     element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
 *   />
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, login } = useAuth();
  

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  }

  if (!isAuthenticated) {
    login(); // kicks off the Auth0 redirect
    return null;
  }

  return children;
}
