import { MemoryRouter } from 'react-router-dom';
/**
 * @file timesheet-review.test.jsx
 * @description Covers the timesheet review/approval experience added on the
 * fix/timesheets branch and wired into TimesheetsPage during the merge:
 * - ReviewTimesheetModal: read-only frozen snapshot, disputed comparison tabs,
 *   re-submission history, and the missing-snapshot fallback.
 * - TimesheetAuditTrail: lifecycle events (created, submitted, disputed, approved).
 * - SubmitConfirmationModal / ApproveConfirmationModal: explicit confirm-before-
 *   commit dialogs that gate the destructive action behind a checkbox.
 * - TimesheetsPage: the Review / Submit / Approve buttons load the full timesheet
 *   and drive the matching dialog to the correct API call.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReviewTimesheetModal } from '../src/components/ReviewTimesheetModal';
import { SubmitConfirmationModal } from '../src/components/SubmitConfirmationModal';
import { ApproveConfirmationModal } from '../src/components/ApproveConfirmationModal';
import { TimesheetAuditTrail } from '../src/components/TimesheetAuditTrail';

import TimesheetsPage from '../src/pages/TimesheetsPage';
import { timesheetsApi } from '../src/api/timesheets';
import { allocationsApi } from '../src/api/allocations';
import { ratesApi } from '../src/api/rates';
import { swapsApi } from '../src/api/swaps';
import { useAuth } from '../src/hooks/useAuth';

vi.mock('../src/api/timesheets', () => ({
  timesheetsApi: {
    getTimesheets: vi.fn(),
    approveTimesheet: vi.fn(),
    submitTimesheet: vi.fn(),
    disputeTimesheet: vi.fn(),
    addEntry: vi.fn(),
    deleteEntry: vi.fn(),
    getTimesheet: vi.fn(),
    createTimesheet: vi.fn(),
  },
}));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));
vi.mock('../src/api/rates', () => ({ ratesApi: { getCurrentRate: vi.fn() } }));
vi.mock('../src/api/swaps', () => ({ swapsApi: { getCoverage: vi.fn() } }));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourseSessions: vi.fn() } }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));

const tutor = { id: 'tutor-1', name: 'Tebogo Tutor' };
const organiser = { id: 'org-1', name: 'Ada Organiser' };
const coCoordinator = { id: 'org-2', name: 'Bongani Coordinator' };
const course = { id: 'c1', code: 'COMS3011A', name: 'SDP' };

const entry = (overrides = {}) => ({
  id: 'e1',
  date: '2026-08-18',
  hoursWorked: 2,
  description: 'Tutorial session',
  course,
  ...overrides,
});

const submission = (overrides = {}) => ({
  submittedAt: '2026-08-21T10:00:00.000Z',
  totalHours: 5,
  entries: [entry({ hoursWorked: 5 })],
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
  ratesApi.getCurrentRate.mockResolvedValue({ data: null });
  swapsApi.getCoverage.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReviewTimesheetModal', () => {
  it('renders nothing without a timesheet', () => {
    render(<ReviewTimesheetModal timesheet={null} open onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the frozen submitted version and its total for a first submission', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'SUBMITTED',
      course,
      user: tutor,
      totalHours: 5,
      submittedAt: '2026-08-21T10:00:00.000Z',
      submittedSnapshot: [submission()],
    };
    render(<ReviewTimesheetModal timesheet={timesheet} open onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Review timesheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submitted version' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audit trail' })).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.getByText('Total (submitted): 5h')).toBeInTheDocument();
  });

  it('compares the disputed snapshot with the current draft', async () => {
    const user = userEvent.setup();
    const timesheet = {
      id: 'ts-2',
      status: 'DISPUTED',
      course,
      user: tutor,
      totalHours: 3,
      disputeReason: 'Hours do not match the session records',
      disputedAt: '2026-08-22T09:00:00.000Z',
      disputedBy: organiser,
      entries: [entry({ id: 'e2', hoursWorked: 3 })],
      submittedSnapshot: [submission({ totalHours: 5, entries: [entry({ hoursWorked: 5 })] })],
    };
    render(<ReviewTimesheetModal timesheet={timesheet} open onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Disputed snapshot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dispute info' })).toBeInTheDocument();
    // Defaults to the frozen snapshot.
    expect(screen.getByText('Total (submitted): 5h')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Current draft' }));
    expect(screen.getByText('Total (current): 3h')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dispute info' }));
    expect(screen.getByText('Current dispute')).toBeInTheDocument();
    expect(screen.getByText('Hours do not match the session records')).toBeInTheDocument();
  });

  it('warns when there is no submission snapshot', () => {
    const timesheet = {
      id: 'ts-3',
      status: 'SUBMITTED',
      course,
      user: tutor,
      totalHours: 0,
      submittedSnapshot: [],
    };
    render(<ReviewTimesheetModal timesheet={timesheet} open onClose={vi.fn()} />);

    expect(screen.getByText('No submission snapshot')).toBeInTheDocument();
  });

  it('surfaces dispute history for a re-submitted version', async () => {
    const user = userEvent.setup();
    const timesheet = {
      id: 'ts-4',
      status: 'SUBMITTED',
      course,
      user: tutor,
      totalHours: 4,
      submittedSnapshot: [
        submission({
          submittedAt: '2026-08-14T10:00:00.000Z',
          totalHours: 6,
          entries: [entry({ hoursWorked: 6 })],
        }),
        submission({
          submittedAt: '2026-08-21T10:00:00.000Z',
          totalHours: 4,
          entries: [entry({ hoursWorked: 4 })],
        }),
      ],
    };
    render(<ReviewTimesheetModal timesheet={timesheet} open onClose={vi.fn()} />);

    expect(screen.getByText('Re-submission #2 after dispute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Latest submission' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dispute history' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dispute history' }));
    expect(screen.getByText('1 dispute recorded')).toBeInTheDocument();
  });
});

describe('TimesheetAuditTrail', () => {
  it('renders nothing without a timesheet', () => {
    render(<TimesheetAuditTrail timesheet={null} />);
    expect(screen.queryByText('Audit trail')).not.toBeInTheDocument();
  });

  it('lists the created and submitted events for a single submission', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'SUBMITTED',
      user: tutor,
      createdAt: '2026-08-17T08:00:00.000Z',
      submittedSnapshot: [submission({ entries: [entry(), entry({ id: 'e2' })] })],
    };
    render(<TimesheetAuditTrail timesheet={timesheet} />);

    expect(screen.getByText('Timesheet created')).toBeInTheDocument();
    expect(screen.getByText('Submitted (v1)')).toBeInTheDocument();
    expect(screen.getByText('5h logged across 2 entries')).toBeInTheDocument();
    expect(screen.getByText('Submissions:')).toBeInTheDocument();
  });

  it('adds an approved event once the timesheet is approved', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'APPROVED',
      user: tutor,
      approver: organiser,
      approverRole: 'Administrator',
      createdAt: '2026-08-17T08:00:00.000Z',
      approvedAt: '2026-08-22T12:00:00.000Z',
      submittedSnapshot: [submission()],
    };
    render(<TimesheetAuditTrail timesheet={timesheet} />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Timesheet approved after review')).toBeInTheDocument();
  });

  it('records disputes across re-submissions', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'DISPUTED',
      user: tutor,
      disputeReason: 'Mismatched hours',
      disputedBy: organiser,
      createdAt: '2026-08-10T08:00:00.000Z',
      disputedAt: '2026-08-22T09:00:00.000Z',
      submittedSnapshot: [
        submission({
          submittedAt: '2026-08-14T10:00:00.000Z',
          totalHours: 6,
          entries: [entry({ hoursWorked: 6 })],
          // Each dispute is stamped onto the version it sent back.
          disputedAt: '2026-08-15T09:00:00.000Z',
          disputedBy: coCoordinator,
          disputeReason: 'Missing Friday lab',
        }),
        submission({
          submittedAt: '2026-08-21T10:00:00.000Z',
          totalHours: 4,
          entries: [entry({ hoursWorked: 4 })],
          disputedAt: '2026-08-22T09:00:00.000Z',
          disputedBy: organiser,
          disputeReason: 'Mismatched hours',
        }),
      ],
    };
    render(<TimesheetAuditTrail timesheet={timesheet} />);

    expect(screen.getByText('Submitted (v1)')).toBeInTheDocument();
    expect(screen.getByText('Submitted (v2)')).toBeInTheDocument();
    expect(screen.getByText('Disputed (v1)')).toBeInTheDocument();
    expect(screen.getByText('Disputed (v2)')).toBeInTheDocument();
    // Each dispute keeps its own reason and the lecturer who raised it.
    expect(screen.getByText('Missing Friday lab')).toBeInTheDocument();
    expect(screen.getByText('Mismatched hours')).toBeInTheDocument();
    expect(screen.getByText('Bongani Coordinator')).toBeInTheDocument();
    expect(screen.getByText('Ada Organiser')).toBeInTheDocument();
    expect(screen.getByText('Disputes:')).toBeInTheDocument();
  });

  it('does not borrow the current dispute details for an unrecorded earlier dispute', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'DISPUTED',
      user: tutor,
      disputeReason: 'Mismatched hours',
      disputedBy: organiser,
      createdAt: '2026-08-10T08:00:00.000Z',
      disputedAt: '2026-08-22T09:00:00.000Z',
      submittedSnapshot: [
        submission({ submittedAt: '2026-08-14T10:00:00.000Z' }),
        submission({ submittedAt: '2026-08-21T10:00:00.000Z' }),
      ],
    };
    render(<TimesheetAuditTrail timesheet={timesheet} />);

    expect(screen.getAllByText('Mismatched hours')).toHaveLength(1);
    expect(screen.getAllByText('Ada Organiser')).toHaveLength(1);
    expect(screen.getByText('Timesheet disputed')).toBeInTheDocument();
    expect(screen.getByText('Course coordinator (not recorded)')).toBeInTheDocument();
  });

  it('names the lecturer who approved the timesheet', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'APPROVED',
      user: tutor,
      createdAt: '2026-08-10T08:00:00.000Z',
      approvedAt: '2026-08-23T09:00:00.000Z',
      approvedBy: { ...coCoordinator, role: 'LECTURER' },
      submittedSnapshot: [submission()],
    };
    render(<TimesheetAuditTrail timesheet={timesheet} />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Bongani Coordinator')).toBeInTheDocument();
    expect(screen.queryByText(/Organiser/)).not.toBeInTheDocument();
  });
});

describe('SubmitConfirmationModal', () => {
  const draft = {
    id: 'ts-1',
    status: 'DRAFT',
    course,
    user: tutor,
    totalHours: 5,
    entries: [entry({ hoursWorked: 5 })],
  };

  it('renders nothing without a timesheet', () => {
    render(<SubmitConfirmationModal timesheet={null} open onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps submit disabled until the tutor confirms, then reports success', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <SubmitConfirmationModal timesheet={draft} open onClose={vi.fn()} onConfirm={onConfirm} />
    );

    expect(screen.getByRole('dialog', { name: 'Submit timesheet' })).toBeInTheDocument();
    expect(screen.getByText(/Submitted timesheets cannot be edited/)).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: 'Submit timesheet' });
    expect(submitButton).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox'));
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Submitted successfully!')).toBeInTheDocument();
  });

  it('shows the disputed-version diff when re-submitting corrections', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'DISPUTED',
      course,
      user: tutor,
      totalHours: 4,
      entries: [entry({ id: 'e2', hoursWorked: 4 })],
      submittedSnapshot: [
        submission({
          totalHours: 6,
          entries: [entry({ hoursWorked: 3 }), entry({ id: 'e2', hoursWorked: 3 })],
        }),
      ],
    };
    render(
      <SubmitConfirmationModal
        timesheet={timesheet}
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isResubmission
      />
    );

    expect(screen.getByRole('dialog', { name: 'Re-submit timesheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Re-submit timesheet' })).toBeInTheDocument();
    expect(screen.getByText('Changes from disputed version')).toBeInTheDocument();
  });

  it('warns when a re-submission changes nothing', () => {
    const timesheet = {
      id: 'ts-1',
      status: 'DISPUTED',
      course,
      user: tutor,
      totalHours: 6,
      entries: [entry({ hoursWorked: 6 })],
      submittedSnapshot: [submission({ totalHours: 6, entries: [entry({ hoursWorked: 6 })] })],
    };
    render(
      <SubmitConfirmationModal
        timesheet={timesheet}
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isResubmission
      />
    );

    expect(screen.getByText('No changes detected')).toBeInTheDocument();
  });
});

describe('ApproveConfirmationModal', () => {
  const submitted = {
    id: 'ts-1',
    status: 'SUBMITTED',
    course,
    user: tutor,
    totalHours: 5,
    entries: [entry({ hoursWorked: 5 })],
    submittedAt: '2026-08-21T10:00:00.000Z',
    submittedSnapshot: [submission()],
    approverName: 'Ada Organiser',
    approverRole: 'Administrator',
  };

  it('renders nothing without a timesheet', () => {
    render(
      <ApproveConfirmationModal timesheet={null} open onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('gates approval behind a confirmation checkbox and closes on success', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ApproveConfirmationModal
        timesheet={submitted}
        open
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Approve timesheet' })).toBeInTheDocument();
    expect(screen.getByText('You are approving the submitted version')).toBeInTheDocument();
    expect(screen.getByText('Tebogo Tutor')).toBeInTheDocument();
    expect(screen.getByText('COMS3011A — SDP')).toBeInTheDocument();
    expect(screen.getByText('Ada Organiser')).toBeInTheDocument();

    const approveButton = screen.getByRole('button', { name: 'Approve timesheet' });
    expect(approveButton).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox'));
    expect(approveButton).toBeEnabled();

    await user.click(approveButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('TimesheetsPage — review / submit / approve wiring', () => {
  it('opens the review dialog from a submitted timesheet', async () => {
    useAuth.mockReturnValue({ dbUser: tutor, isStaff: false });
    const submitted = {
      id: 'ts-1',
      userId: 'tutor-1',
      courseId: 'c1',
      weekStartDate: '2026-08-17',
      status: 'SUBMITTED',
      totalHours: 5,
      course,
      user: tutor,
      appliedRate: 150,
      submittedAt: '2026-08-21T10:00:00.000Z',
      submittedSnapshot: [submission()],
    };
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [submitted] });
    timesheetsApi.getTimesheet.mockResolvedValue({ data: submitted });
    ratesApi.getCurrentRate.mockResolvedValue({ data: { rate: 150 } });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: 'Review' }));
    const dialog = await screen.findByRole('dialog', { name: 'Review timesheet' });
    expect(timesheetsApi.getTimesheet).toHaveBeenCalledWith('ts-1');
    expect(within(dialog).getByText('Total (submitted): 5h')).toBeInTheDocument();
  });

  it('submits a draft through the confirmation dialog', async () => {
    useAuth.mockReturnValue({ dbUser: tutor, isStaff: false });
    const draft = {
      id: 'ts-1',
      userId: 'tutor-1',
      courseId: 'c1',
      weekStartDate: '2026-08-17',
      status: 'DRAFT',
      totalHours: 5,
      course,
      user: tutor,
      entries: [entry({ hoursWorked: 5 })],
    };
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [draft] });
    timesheetsApi.getTimesheet.mockResolvedValue({ data: draft });
    timesheetsApi.submitTimesheet.mockResolvedValue({ data: { ...draft, status: 'SUBMITTED' } });
    ratesApi.getCurrentRate.mockResolvedValue({ data: { rate: 150 } });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: 'Submit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Submit timesheet' });
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Submit timesheet' }));

    await waitFor(() => expect(timesheetsApi.submitTimesheet).toHaveBeenCalledWith('ts-1'));
    await waitFor(() => expect(timesheetsApi.getTimesheets).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('approves a submitted timesheet through the confirmation dialog', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'admin-1' }, isStaff: true });
    const submitted = {
      id: 'ts-1',
      userId: 'tutor-1',
      courseId: 'c1',
      weekStartDate: '2026-08-17',
      status: 'SUBMITTED',
      totalHours: 5,
      course,
      user: tutor,
      appliedRate: 150,
      submittedAt: '2026-08-21T10:00:00.000Z',
      submittedSnapshot: [submission()],
    };
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [submitted] });
    timesheetsApi.getTimesheet.mockResolvedValue({ data: submitted });
    timesheetsApi.approveTimesheet.mockResolvedValue({
      data: { ...submitted, status: 'APPROVED' },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve timesheet' });
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Approve timesheet' }));

    await waitFor(() => expect(timesheetsApi.approveTimesheet).toHaveBeenCalledWith('ts-1'));
    await waitFor(() => expect(timesheetsApi.getTimesheets).toHaveBeenCalledTimes(2));
  });
});
