/**
 * @file TimesheetEntryLog.jsx
 * @description Presentational session-log rendering of timesheet entries.
 *
 * Shows what each logged entry actually covers — the date and, when the entry
 * is linked to a scheduled session, the weekday, time slot, venue and session
 * type — plus the tutor's notes under a "What was done" label, so reviewers
 * (and the tutor themselves) can see exactly what the logged hours were spent
 * on. Strictly presentational: every field arrives via props, no API imports.
 *
 * Expected Usage:
 * ```jsx
 * <TimesheetEntryLog
 *   entries={timesheet.entries}
 *   courseCode={timesheet.course?.code}
 *   locked
 *   renderActions={(entry) => <Button onClick={() => remove(entry.id)}>Remove</Button>}
 * />
 * ```
 */
import { Calendar, Clock, Lock, MapPin, Unlink } from 'lucide-react';
import Badge from './ui/Badge';
import { formatDay, formatShortDate, formatTime } from '../utils/helpers';

const SESSION_TYPE_LABELS = { LECTURE: 'Lecture', TUTORIAL: 'Tutorial', LAB: 'Lab' };

/**
 * TimesheetEntryDetails - the rich row content for a single entry.
 * `actions` replaces the read-only lock icon with caller-owned controls.
 */
export function TimesheetEntryDetails({ entry, courseCode, locked = false, actions = null }) {
  const session = entry.session || null;
  const code = entry.course?.code || courseCode;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tabular-nums text-slate-800">
            {Number(entry.hoursWorked || 0)}h
          </p>
          {code && <Badge tone="neutral">{code}</Badge>}
          {session && (
            <Badge tone="neutral">
              {SESSION_TYPE_LABELS[session.sessionType] || session.sessionType}
            </Badge>
          )}
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {session ? `${formatDay(session.dayOfWeek)} · ` : ''}
            {formatShortDate(entry.date)}
          </span>
          {session && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatTime(session.startTime)}–{formatTime(session.endTime)}
            </span>
          )}
          {session?.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {session.venue}
            </span>
          )}
        </p>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What was done
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {entry.description || 'No notes were recorded for this entry.'}
          </p>
        </div>

        {session === null && entry.sessionId ? (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Unlink className="h-3 w-3" aria-hidden="true" />
            Session details were not recorded in this submission.
          </p>
        ) : !session ? (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Unlink className="h-3 w-3" aria-hidden="true" />
            Not linked to a scheduled session.
          </p>
        ) : null}

        {entry.createdAt && (
          <p className="text-xs text-slate-500">Logged {formatShortDate(entry.createdAt)}</p>
        )}
      </div>

      {actions ||
        (locked && (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
            <Lock className="h-3 w-3 text-slate-500" aria-hidden="true" />
          </div>
        ))}
    </div>
  );
}

/**
 * TimesheetEntryLog - the divided list wrapper around the detail rows.
 */
export function TimesheetEntryLog({
  entries,
  courseCode,
  locked = false,
  emptyMessage = 'No entries have been logged yet.',
  renderActions,
}) {
  if (!entries || entries.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((entry, index) => (
        <li key={entry.id || index} className="p-4">
          <TimesheetEntryDetails
            entry={entry}
            courseCode={courseCode}
            locked={locked}
            actions={renderActions ? renderActions(entry) : null}
          />
        </li>
      ))}
    </ul>
  );
}

export default TimesheetEntryLog;
