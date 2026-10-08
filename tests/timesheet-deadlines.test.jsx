import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimesheetsPage } from '../src/pages/TimesheetsPage';
import { useAuth } from '../src/hooks/useAuth';
import { timesheetsApi } from '../src/api/timesheets';
import { allocationsApi } from '../src/api/allocations';

/** B08: each outstanding timesheet shows its cycle due date and deadline state. */

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/timesheets', () => ({
  timesheetsApi: {
    getTimesheets: vi.fn(),
    getTimesheet: vi.fn(),
    createTimesheet: vi.fn(),
    addEntry: vi.fn(),
    deleteEntry: vi.fn(),
    submitTimesheet: vi.fn(),
    approveTimesheet: vi.fn(),
    disputeTimesheet: vi.fn(),
  },
}));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));

const sheet = (overrides) => ({
  totalHours: 2,
  weekStartDate: '2026-10-12T00:00:00.000Z',
  dueDate: '2026-10-27',
  course: { id: 'c1', code: 'COMS3011A', name: 'Software Design' },
  _count: { entries: 1 },
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ dbUser: { id: 't1' }, isTutor: true, isStaff: false });
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
});

describe('Timesheet due dates', () => {
  it('flags due-soon and overdue timesheets with their due date', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [
        sheet({ id: 'a', status: 'DRAFT', deadlineStatus: 'DUE_SOON' }),
        sheet({ id: 'b', status: 'SUBMITTED', deadlineStatus: 'OVERDUE' }),
      ],
    });

    render(<TimesheetsPage />);

    expect(await screen.findByText('Due soon')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getAllByText(/Due 27 Oct/)).toHaveLength(2);
  });

  it('shows no deadline for finished or not-yet-due timesheets', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [
        sheet({ id: 'c', status: 'APPROVED', deadlineStatus: null }),
        sheet({ id: 'd', status: 'DRAFT', deadlineStatus: 'NOT_DUE', dueDate: '2026-11-27' }),
      ],
    });

    render(<TimesheetsPage />);

    expect(await screen.findByText(/Due 27 Nov/)).toBeInTheDocument();
    expect(screen.queryByText('Due soon')).not.toBeInTheDocument();
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
    expect(screen.queryByText(/Due 27 Oct/)).not.toBeInTheDocument();
    // A not-yet-due sheet still shows when it is due.
    expect(screen.getByText(/Due 27 Nov/)).toBeInTheDocument();
  });
});
