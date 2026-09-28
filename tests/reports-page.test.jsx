import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ReportsPage from '../src/pages/ReportsPage';
import { coursesApi } from '../src/api/courses';
import { allocationsApi } from '../src/api/allocations';
import { timesheetsApi } from '../src/api/timesheets';

vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));
vi.mock('../src/api/timesheets', () => ({ timesheetsApi: { getTimesheets: vi.fn() } }));

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
});

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
    expect(timesheetsApi.getTimesheets).toHaveBeenCalledWith({ status: 'APPROVED' });
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
