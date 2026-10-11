import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TimesheetsPage from '../src/pages/TimesheetsPage';
import ExcusalsPage from '../src/pages/ExcusalsPage';
import DashboardPage from '../src/pages/DashboardPage';
import { swapsApi } from '../src/api/swaps';
import { timesheetsApi } from '../src/api/timesheets';
import { coursesApi } from '../src/api/courses';
import { allocationsApi } from '../src/api/allocations';
import { tutorsApi } from '../src/api/tutors';
import { usersApi } from '../src/api/users';
import { excusalsApi } from '../src/api/excusals';
vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({
    dbUser: { id: 'tutor' },
    user: { id: 'tutor', name: 'Alice' },
    role: 'tutor',
    isTutor: true,
    isStaff: false,
  }),
}));
vi.mock('../src/api/swaps', () => ({
  swapsApi: { getCoverage: vi.fn(), getWorkload: vi.fn(), getSwaps: vi.fn() },
}));
vi.mock('../src/api/timesheets', () => ({
  timesheetsApi: { getTimesheets: vi.fn(), createTimesheet: vi.fn(), addEntry: vi.fn() },
}));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourseSessions: vi.fn() } }));
vi.mock('../src/api/tutors', () => ({ tutorsApi: { getTutor: vi.fn() } }));
vi.mock('../src/api/users', () => ({ usersApi: { getCurrentUser: vi.fn() } }));
vi.mock('../src/api/excusals', () => ({ excusalsApi: { getExcusals: vi.fn() } }));
const cover = {
  id: 'cover',
  allocationId: 'partner-allocation',
  sessionId: 'incoming-session',
  courseId: 'incoming-course',
  sessionDate: '2030-01-07',
  startTime: '09:00',
  endTime: '10:00',
  course: { id: 'incoming-course', code: 'MAT101', name: 'Mathematics' },
};
beforeEach(() => {
  vi.resetAllMocks();
  swapsApi.getCoverage.mockResolvedValue({ data: [cover] });
  swapsApi.getWorkload.mockResolvedValue({
    data: { week: '2030-01-07', hours: 7, remainingHours: 3 },
  });
  swapsApi.getSwaps.mockResolvedValue({ data: [] });
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
  timesheetsApi.getTimesheets.mockResolvedValue({
    data: [
      {
        id: 'sheet',
        courseId: cover.courseId,
        course: cover.course,
        userId: 'tutor',
        status: 'DRAFT',
        weekStartDate: '2030-01-07',
        totalHours: 0,
      },
    ],
  });
  coursesApi.getCourseSessions.mockResolvedValue({
    data: [
      {
        id: cover.sessionId,
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
        sessionType: 'LAB',
      },
    ],
  });
  tutorsApi.getTutor.mockResolvedValue({ data: { allocations: [] } });
  usersApi.getCurrentUser.mockResolvedValue({ data: { availability: [], maxHoursPerWeek: 10 } });
  excusalsApi.getExcusals.mockResolvedValue({ data: [] });
});
describe('Session cover in tutor workflows', () => {
  it('lets a tutor start a timesheet for a course they only cover', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );
    await user.click(await screen.findByRole('button', { name: 'New timesheet' }));
    expect(screen.getByRole('option', { name: /MAT101/ })).toHaveValue('incoming-course');
  });
  it('logs the covered session using the original slot and correct date', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );
    await user.click(await screen.findByRole('button', { name: 'Log hours' }));
    await user.selectOptions(screen.getByLabelText('Session or other work'), 'cover-cover');
    expect(screen.getByLabelText('Date')).toHaveValue('2030-01-07');
    await user.click(screen.getByRole('button', { name: 'Log entry' }));
    await waitFor(() =>
      expect(timesheetsApi.addEntry).toHaveBeenCalledWith(
        'sheet',
        expect.objectContaining({
          allocationId: cover.allocationId,
          sessionId: cover.sessionId,
          date: '2030-01-07',
          hoursWorked: 1,
        })
      )
    );
  });
  it('allows an excusal for an incoming covered course', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/excusals']}>
        <ExcusalsPage />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Request excusal' })).toBeEnabled()
    );
    await user.click(screen.getByRole('button', { name: 'Request excusal' }));
    expect(screen.getByRole('option', { name: /MAT101/ })).toHaveValue('partner-allocation');
  });
  it('shows incoming responsibilities and adjusted weekly hours on the dashboard', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Sessions you are covering')).toBeInTheDocument();
    await screen.findByText(/MAT101.*2030-01-07/);
    expect(await screen.findByText(/7.*10h/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View your full schedule' })).toHaveAttribute(
      'href',
      '/calendar'
    );
    expect(screen.getByRole('link', { name: 'Log hours', exact: true })).toHaveAttribute(
      'href',
      '/timesheets'
    );
    expect(screen.getByRole('link', { name: 'Edit availability' })).toHaveAttribute(
      'href',
      '/profile'
    );
  });
  it('keeps coverage and workload failures visible while retaining allocation-based weekly hours', async () => {
    swapsApi.getCoverage.mockRejectedValueOnce(new Error('Cover unavailable'));
    swapsApi.getWorkload.mockRejectedValueOnce(new Error('Workload unavailable'));
    allocationsApi.getAllocations.mockResolvedValueOnce({
      data: [{ id: 'a1', status: 'ACTIVE', hoursPerWeek: 2, course: cover.course }],
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await screen.findByText('2h / 10h');
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByText(/Could not load session cover: Cover unavailable/)).toBeInTheDocument();
    expect(
      screen.getByText(/Could not load this week’s adjusted hours: Workload unavailable/)
    ).toBeInTheDocument();
  });
});
