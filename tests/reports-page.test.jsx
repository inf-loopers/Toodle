import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ReportsPage from '../src/pages/ReportsPage';
import { coursesApi } from '../src/api/courses';
import { allocationsApi } from '../src/api/allocations';
import { timesheetsApi } from '../src/api/timesheets';
import { tutorsApi } from '../src/api/tutors';

vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));
vi.mock('../src/api/timesheets', () => ({ timesheetsApi: { getTimesheets: vi.fn() } }));
vi.mock('../src/api/tutors', () => ({ tutorsApi: { getTutors: vi.fn() } }));

const course = { id: 'c1', code: 'COMS101', name: 'Computing', requiredTutors: 1 };
const alice = { id: 't1', name: 'Alice', email: 'alice@example.test', maxHoursPerWeek: 10 };
const bob = { id: 't2', name: 'Bob', email: 'bob@example.test', maxHoursPerWeek: 10 };

function allocation(overrides = {}) {
  return {
    id: 'a1',
    userId: 't1',
    courseId: 'c1',
    status: 'ACTIVE',
    hoursPerWeek: 2,
    user: alice,
    course,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  coursesApi.getCourses.mockResolvedValue({ data: [course] });
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
  timesheetsApi.getTimesheets.mockResolvedValue({ data: [] });
  tutorsApi.getTutors.mockResolvedValue({ data: [] });
});

function approvedTimesheet(overrides = {}) {
  return {
    id: 'ts-1',
    userId: 't1',
    courseId: 'c1',
    weekStartDate: new Date().toISOString().slice(0, 10),
    status: 'APPROVED',
    totalHours: 2,
    course,
    user: alice,
    entries: [
      {
        id: 'e1',
        date: new Date().toISOString().slice(0, 10),
        hoursWorked: 2,
        description: '',
        course,
      },
    ],
    ...overrides,
  };
}

describe('Reports allocation totals', () => {
  it('counts only active allocations in hours, staffing and workload', async () => {
    allocationsApi.getAllocations.mockResolvedValue({
      data: [
        allocation(),
        allocation({ id: 'a2', userId: 't2', status: 'PENDING', hoursPerWeek: 3, user: bob }),
      ],
    });
    render(<ReportsPage />);
    expect(await screen.findByText('across 1 active allocation')).toBeInTheDocument();
    expect(screen.getByText('1 / 1 tutor')).toBeInTheDocument();
    expect(within(screen.getByText('Unfilled courses').parentElement).getByText('0'));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(timesheetsApi.getTimesheets).toHaveBeenCalledWith({
      status: 'APPROVED',
      include: 'entries',
    });
  });

  it('treats a pending-only course as unstaffed and disables the CSV export', async () => {
    allocationsApi.getAllocations.mockResolvedValue({
      data: [allocation({ id: 'a2', userId: 't2', status: 'PENDING', hoursPerWeek: 3, user: bob })],
    });
    render(<ReportsPage />);
    expect(await screen.findByText('across 0 active allocations')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 tutor')).toBeInTheDocument();
    expect(within(screen.getByText('Unfilled courses').parentElement).getByText('1'));
    expect(screen.getByText('No tutors have hours allocated yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download CSV/ })).toBeDisabled();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });
});

describe('Reports payroll CSV export', () => {
  it('enables the Download CSV button once an approved entry falls in the selected period', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(<ReportsPage />);

    expect(await screen.findByRole('button', { name: /Download CSV/ })).not.toBeDisabled();
  });

  it('disables the Download CSV button when there are no approved entries', async () => {
    render(<ReportsPage />);

    expect(await screen.findByRole('button', { name: /Download CSV/ })).toBeDisabled();
  });

  it('offers an "Export full approved history" toggle alongside the period filter', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(<ReportsPage />);

    const toggle = await screen.findByLabelText('Export full approved history');
    expect(toggle).not.toBeChecked();
  });

  it('keeps the CSV export disabled when only non-approved timesheets come back', async () => {
    // Defence-in-depth: even if the backend ever returned a mixed-status
    // list, non-approved work must never make it into the payroll export.
    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [
        approvedTimesheet({ id: 'ts-draft', status: 'DRAFT' }),
        approvedTimesheet({ id: 'ts-submitted', status: 'SUBMITTED' }),
        approvedTimesheet({ id: 'ts-disputed', status: 'DISPUTED' }),
      ],
    });
    render(<ReportsPage />);

    expect(await screen.findByRole('button', { name: /Download CSV/ })).toBeDisabled();
  });
});

describe('Reports budget vs spend', () => {
  it('shows the known reconciled spend and remaining figures for a budgeted course', async () => {
    coursesApi.getCourses.mockResolvedValue({
      data: [{ ...course, budget: { amount: '50000', spent: '32500' } }],
    });
    render(<ReportsPage />);

    expect(await screen.findByText('R32,500 / R50,000')).toBeInTheDocument();
    expect(screen.getByText(/R32,500 spent of R50,000 budgeted/)).toBeInTheDocument();
    expect(screen.getByText('R17,500 remaining')).toBeInTheDocument();
    expect(screen.getByText('R17,500 remaining overall')).toBeInTheDocument();
    expect(screen.queryByText(/over budget/)).not.toBeInTheDocument();
  });

  it('flags a course that has spent beyond its budget and shows the overage amount', async () => {
    coursesApi.getCourses.mockResolvedValue({
      data: [{ ...course, budget: { amount: '10000', spent: '12000' } }],
    });
    render(<ReportsPage />);

    expect(await screen.findByText('R12,000 / R10,000')).toBeInTheDocument();
    expect(screen.getByText('· 1 course over budget')).toBeInTheDocument();
    expect(screen.getByText('R2,000 over budget')).toBeInTheDocument();
    expect(screen.getByText('R2,000 over budget overall')).toBeInTheDocument();
  });

  it('shows an empty state when no courses have a budget set', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('No courses have a budget set yet.')).toBeInTheDocument();
  });
});

describe('Reports rate offered per course', () => {
  it('shows a chip for each tutor allocated to the course with their current rate', async () => {
    coursesApi.getCourses.mockResolvedValue({
      data: [{ ...course, budget: { amount: '50000', spent: '32500' } }],
    });
    tutorsApi.getTutors.mockResolvedValue({
      data: [
        {
          ...alice,
          allocations: [{ id: 'a1', courseId: 'c1' }],
          currentRate: { rate: 150, effectiveFrom: '2026-01-01' },
        },
      ],
    });
    render(<ReportsPage />);

    expect(await screen.findByText('Alice — R150.00/hr')).toBeInTheDocument();
  });

  it('shows no chips for a course when no tutor has a rate configured', async () => {
    coursesApi.getCourses.mockResolvedValue({
      data: [{ ...course, budget: { amount: '50000', spent: '32500' } }],
    });
    tutorsApi.getTutors.mockResolvedValue({
      data: [{ ...alice, allocations: [{ id: 'a1', courseId: 'c1' }], currentRate: null }],
    });
    render(<ReportsPage />);

    await screen.findByText('R32,500 / R50,000');
    expect(screen.queryByText(/—.*\/hr/)).not.toBeInTheDocument();
  });
});

describe('Reports period boundaries (UTC-based, timezone-independent)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes a timesheet exactly on the first day of the month and excludes the day before', async () => {
    // "Now" is fixed well inside August (UTC) so "this month" always means
    // 2026-08-01T00:00:00Z (inclusive) .. 2026-09-01T00:00:00Z (exclusive),
    // regardless of the host machine's local timezone.
    // Fake only Date (not setTimeout/MutationObserver) so findByText's
    // internal polling still runs normally while "now" stays pinned.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [
        approvedTimesheet({ id: 'ts-in', weekStartDate: '2026-08-01', entries: [] }),
        approvedTimesheet({ id: 'ts-out', weekStartDate: '2026-07-31', entries: [] }),
      ],
    });
    render(<ReportsPage />);

    fireEvent.change(await screen.findByLabelText('Report period'), { target: { value: 'month' } });

    expect(await screen.findByText('from 1 timesheet this month')).toBeInTheDocument();
  });

  it('excludes a timesheet landing on the first day of the next month', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [approvedTimesheet({ id: 'ts-next', weekStartDate: '2026-09-01', entries: [] })],
    });
    render(<ReportsPage />);

    fireEvent.change(await screen.findByLabelText('Report period'), { target: { value: 'month' } });

    expect(await screen.findByText('from 0 timesheets this month')).toBeInTheDocument();
  });
});
