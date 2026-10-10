/**
 * @file GlobalSearch.jsx
 * @description Global, permission-aware search entry point in the navbar.
 *
 * Responsibilities:
 * - Renders a search icon button that opens a dialog with one search field.
 * - Debounces the query (300ms) and calls GET /search, which returns matches
 *   grouped by type (courses, people, timesheets) already scoped to the caller's
 *   role and course ownership — the UI never widens that scope.
 * - Groups results under Courses / People / Timesheets headings, rendering a
 *   group only when it has matches, and navigates to a valid destination when a
 *   result is activated (closing the dialog).
 * - Shows an initial prompt, a loading state, an empty/no-result state and an
 *   error state, and ignores stale responses so fast typing never races.
 *
 * Expected Usage:
 * ```jsx
 * <GlobalSearch />  // placed in the Navbar right-hand section
 * ```
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, Clock } from 'lucide-react';

import { searchApi } from '../../api/search';
import { getApiErrorMessage } from '../../utils/apiError';
import { TIMESHEET_STATUS_TONE } from '../../utils/constants';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import Badge from '../ui/Badge';
import { EmptyState, ErrorState } from '../ui/EmptyState';

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

function formatWeek(date) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ResultButton({ icon: Icon, onClick, title, subtitle, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:bg-slate-800"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-slate-400 dark:text-slate-400">
            {subtitle}
          </span>
        )}
      </span>
      {trailing}
    </button>
  );
}

function ResultGroup({ heading, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <h4 className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {heading}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function GlobalSearch() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Monotonic request id lets a slow earlier response be discarded when a newer
  // query has already been issued.
  const requestIdRef = useRef(0);

  // Reset the dialog contents each time it is closed so reopening starts clean.
  useEffect(() => {
    if (open) return;
    setTerm('');
    setResults(null);
    setError(null);
    setLoading(false);
  }, [open]);

  // Debounced search effect.
  useEffect(() => {
    if (!open) return undefined;

    const query = term.trim();
    if (query.length < MIN_QUERY) {
      requestIdRef.current += 1; // invalidate any in-flight request
      setResults(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const id = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const response = await searchApi.search(query);
        if (id !== requestIdRef.current) return;
        setResults(response?.data ?? response);
        setError(null);
      } catch (err) {
        if (id !== requestIdRef.current) return;
        setError(getApiErrorMessage(err, 'Search failed. Please try again.'));
        setResults(null);
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const query = term.trim();
  const courses = results?.courses ?? [];
  const people = results?.people ?? [];
  const timesheets = results?.timesheets ?? [];
  const hasResults = courses.length > 0 || people.length > 0 || timesheets.length > 0;
  const searched = results !== null && query.length >= MIN_QUERY;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Global search"
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <Search className="h-5 w-5" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Search Toodle"
        description="Find courses, people and timesheets you have access to."
        size="lg"
        placement="top"
      >
        <Input
          aria-label="Search Toodle"
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by course code, name, tutor or timesheet…"
          autoComplete="off"
        />

        <div className="mt-4" aria-live="polite">
          {error ? (
            <ErrorState title="Search failed" description={error} className="py-6 sm:py-8" />
          ) : loading ? (
            <div className="flex justify-center py-8 sm:py-10">
              <Spinner label="Searching…" />
            </div>
          ) : searched && !hasResults ? (
            <EmptyState
              icon={Search}
              title={`No results for "${query}"`}
              description="Try a course code, a tutor name, or a shorter search term."
              className="py-6 sm:py-8"
            />
          ) : !hasResults ? (
            <p className="py-6 text-center text-sm text-slate-400 sm:py-8">
              Type at least {MIN_QUERY} characters to search across courses, people and timesheets.
            </p>
          ) : (
            <>
              {courses.length > 0 && (
                <ResultGroup heading="Courses">
                  {courses.map((course) => (
                    <ResultButton
                      key={course.id}
                      icon={BookOpen}
                      onClick={() => go(`/courses/${course.id}`)}
                      title={`${course.code} — ${course.name}`}
                      subtitle={`Year ${course.year} · Semester ${course.semester}`}
                    />
                  ))}
                </ResultGroup>
              )}

              {people.length > 0 && (
                <ResultGroup heading="People">
                  {people.map((person) => (
                    <ResultButton
                      key={person.id}
                      icon={Users}
                      onClick={() =>
                        go(`/tutors?q=${encodeURIComponent(person.name || person.email || '')}`)
                      }
                      title={person.name || person.email}
                      subtitle={person.email}
                      trailing={
                        <Badge tone="primary" className="shrink-0">
                          Tutor
                        </Badge>
                      }
                    />
                  ))}
                </ResultGroup>
              )}

              {timesheets.length > 0 && (
                <ResultGroup heading="Timesheets">
                  {timesheets.map((timesheet) => (
                    <ResultButton
                      key={timesheet.id}
                      icon={Clock}
                      onClick={() => go('/timesheets')}
                      title={`${timesheet.course?.code ?? 'Timesheet'} · week of ${formatWeek(
                        timesheet.weekStartDate
                      )}`}
                      subtitle={timesheet.user?.name}
                      trailing={
                        <Badge
                          tone={TIMESHEET_STATUS_TONE[timesheet.status] || 'neutral'}
                          className="shrink-0"
                        >
                          {timesheet.status}
                        </Badge>
                      }
                    />
                  ))}
                </ResultGroup>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

export default GlobalSearch;
