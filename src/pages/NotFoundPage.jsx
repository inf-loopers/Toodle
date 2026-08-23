/**
 * @file NotFoundPage.jsx
 * @description 404 Fallback page for unmatched client-side routes.
 *
 * Responsibilities:
 * - Informs the user that the requested URL does not exist.
 * - Provides a clear navigation action back to `/dashboard`.
 *
 * Route: `*`
 */

import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
        <Compass className="h-6 w-6" />
      </div>
      <h1 className="mt-6 text-4xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-sm text-slate-500">This page doesn't exist, or you don't have access to it.</p>
      <Link to="/dashboard" className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}

export default NotFoundPage;

