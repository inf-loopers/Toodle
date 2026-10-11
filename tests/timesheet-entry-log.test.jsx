/**
 * @file timesheet-entry-log.test.jsx
 * @description Covers TimesheetEntryLog / TimesheetEntryDetails — the detailed
 * session log added on fix/timesheets so reviewers and tutors can see when and
 * where each logged entry happened: weekday, date, time slot, venue, session
 * type, the tutor's notes under "What was done", and graceful fallbacks for
 * entries that are not (or no longer) linked to a scheduled session.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TimesheetEntryLog, TimesheetEntryDetails } from '../src/components/TimesheetEntryLog';

const session = {
  id: 'sess-1',
  dayOfWeek: 'TUESDAY',
  startTime: '10:00:00',
  endTime: '11:00:00',
  venue: 'MATHS 104',
  sessionType: 'TUTORIAL',
};

const entry = (overrides = {}) => ({
  id: 'e1',
  date: '2026-08-18',
  hoursWorked: 2,
  description: 'Ran the tutorial problems set',
  createdAt: '2026-08-18T14:00:00.000Z',
  session,
  ...overrides,
});

describe('TimesheetEntryLog', () => {
  it('renders each entry as a list item with its session context', () => {
    render(<TimesheetEntryLog entries={[entry(), entry({ id: 'e2' })]} courseCode="COMS3011A" />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Both rows carry the same session fixture, so the badge appears twice.
    expect(screen.getAllByText('Tutorial')).toHaveLength(2);
    expect(screen.getAllByText('Tuesday · 18 Aug')).toHaveLength(2);
    expect(screen.getAllByText(/10:00 AM–11:00 AM/)).toHaveLength(2);
    expect(screen.getAllByText('MATHS 104')).toHaveLength(2);
    expect(screen.getAllByText('What was done')).toHaveLength(2);
    expect(screen.getAllByText('Ran the tutorial problems set')).toHaveLength(2);
    expect(screen.getAllByText('Logged 18 Aug')).toHaveLength(2);
  });

  it('falls back to the timesheet course code when the entry carries no course', () => {
    render(<TimesheetEntryLog entries={[entry()]} courseCode="COMS3011A" />);

    expect(screen.getByText('COMS3011A')).toBeInTheDocument();
  });

  it('prefers the course code stored on the entry itself', () => {
    render(
      <TimesheetEntryLog
        entries={[entry({ course: { code: 'MATH1040' } })]}
        courseCode="COMS3011A"
      />
    );

    expect(screen.getByText('MATH1040')).toBeInTheDocument();
    expect(screen.queryByText('COMS3011A')).not.toBeInTheDocument();
  });

  it('shows a placeholder when the tutor recorded no notes', () => {
    render(<TimesheetEntryLog entries={[entry({ description: null })]} />);

    expect(screen.getByText('No notes were recorded for this entry.')).toBeInTheDocument();
  });

  it('flags entries that are not linked to a scheduled session', () => {
    render(<TimesheetEntryLog entries={[entry({ session: null })]} />);

    expect(screen.getByText('Not linked to a scheduled session.')).toBeInTheDocument();
    expect(screen.queryByText(/10:00 AM/)).not.toBeInTheDocument();
    // The date still renders without a weekday prefix.
    expect(screen.getByText('18 Aug')).toBeInTheDocument();
  });

  it('explains legacy frozen snapshots whose session details were not captured', () => {
    render(<TimesheetEntryLog entries={[entry({ session: null, sessionId: 'sess-old' })]} />);

    expect(
      screen.getByText('Session details were not recorded in this submission.')
    ).toBeInTheDocument();
  });

  it('omits the venue chip when the session has no venue', () => {
    render(<TimesheetEntryLog entries={[entry({ session: { ...session, venue: null } })]} />);

    expect(screen.queryByText('MATHS 104')).not.toBeInTheDocument();
    expect(screen.getByText('Tuesday · 18 Aug')).toBeInTheDocument();
  });

  it('renders the empty-state message when there are no entries', () => {
    render(<TimesheetEntryLog entries={[]} emptyMessage="No entries in this submission." />);

    expect(screen.getByText('No entries in this submission.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('renders caller-owned actions instead of the lock icon', () => {
    const onRemove = vi.fn();
    render(
      <TimesheetEntryLog
        entries={[entry()]}
        locked
        renderActions={(row) => (
          <button type="button" onClick={() => onRemove(row.id)}>
            Remove
          </button>
        )}
      />
    );

    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
});

describe('TimesheetEntryDetails', () => {
  it('marks a locked submission row with the read-only lock icon', () => {
    const { container } = render(<TimesheetEntryDetails entry={entry()} locked />);

    // The lucide Lock icon is the only svg in the right-hand slot.
    expect(container.querySelector('svg.lucide-lock')).toBeInTheDocument();
  });

  it('labels an unknown session type with its raw enum value', () => {
    render(
      <TimesheetEntryDetails entry={entry({ session: { ...session, sessionType: 'SEMINAR' } })} />
    );

    expect(screen.getByText('SEMINAR')).toBeInTheDocument();
  });
});
