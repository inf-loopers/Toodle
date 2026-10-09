import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

const FEATURE_PATHS = new Set([
  '/courses',
  '/volunteers',
  '/calendar',
  '/timesheets',
  '/allocations',
  '/tutors',
  '/reports',
  '/profile',
  '/swaps',
  '/excusals',
  '/users',
]);

export default function FeatureHeading({ children, className, as: Heading = 'h1' }) {
  const { pathname } = useLocation();
  return (
    <div className="flex items-start justify-between gap-2 md:contents">
      <Heading className={className}>{children}</Heading>
      {FEATURE_PATHS.has(pathname) && (
        <Link
          to="/dashboard"
          aria-label={`Close ${children} and return to Dashboard`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
