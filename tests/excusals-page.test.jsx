import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExcusalsPage } from '../src/pages/ExcusalsPage';
import { useAuth } from '../src/hooks/useAuth';
import { excusalsApi } from '../src/api/excusals';
import { swapsApi } from '../src/api/swaps';
import { tutorsApi } from '../src/api/tutors';
import { coursesApi } from '../src/api/courses';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/excusals', () => ({
  excusalsApi: {
    getExcusals: vi.fn(),
    requestExcusal: vi.fn(),
    approveExcusal: vi.fn(),
    declineExcusal: vi.fn(),
  },
}));
vi.mock('../src/api/swaps', () => ({ swapsApi: { getCoverage: vi.fn() } }));
vi.mock('../src/api/tutors', () => ({ tutorsApi: { getTutor: vi.fn() } }));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourseSessions: vi.fn() } }));

const lab = {
  id: 'session-lab',
  courseId: 'course-1',
  dayOfWeek: 'TUESDAY',
  startTime: '14:00',
  endTime: '15:30',
  venue: 'MSL 004',
  sessionType: 'LAB',
};
const tutorial = {
  id: 'session-tut',
  courseId: 'course-1',
  dayOfWeek: 'THURSDAY',
  startTime: '10:00',
  endTime: '11:00',
  venue: null,
  sessionType: 'TUTORIAL',
};

const asTutor = () =>
  useAuth.mockReturnValue({ dbUser: { id: 'tutor-1' }, isTutor: true, isStaff: false });

beforeEach(() => {
  vi.resetAllMocks();
  // Fake only Date so userEvent's timers still run. Monday 2026-10-05, 10:00 SAST.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T08:00:00.000Z'));
  asTutor();
  excusalsApi.getExcusals.mockResolvedValue({ data: [] });
  excusalsApi.requestExcusal.mockResolvedValue({ data: {} });
  swapsApi.getCoverage.mockResolvedValue({ data: [] });
  tutorsApi.getTutor.mockResolvedValue({
    data: {
      allocations: [
        {
          id: 'alloc-1',
          userId: 'tutor-1',
          courseId: 'course-1',
          status: 'ACTIVE',
          course: { code: 'COMS3011A', name: 'SDP' },
        },
      ],
    },
  });
  coursesApi.getCourseSessions.mockResolvedValue({ data: [lab, tutorial] });
});

afterEach(() => {
  vi.useRealTimers();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/excusals']}>
      <ExcusalsPage />
    </MemoryRouter>
  );

const openRequest = async (user) => {
  renderPage();
  const button = await screen.findByRole('button', { name: /Request excusal/ });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
  return screen.getByRole('dialog');
};

describe('Excusal requests bind to a real session (B11)', () => {
  it('submits the chosen session and one of its occurrence dates', async () => {
    const user = userEvent.setup();
    const dialog = await openRequest(user);

    await user.selectOptions(within(dialog).getByLabelText('Course'), 'alloc-1');
    await waitFor(() => expect(coursesApi.getCourseSessions).toHaveBeenCalledWith('course-1'));

    const sessionSelect = within(dialog).getByLabelText('Session');
    await waitFor(() => expect(sessionSelect).toBeEnabled());
    await user.selectOptions(sessionSelect, 'session-lab');

    // Only Tuesdays are offered for the Tuesday lab.
    const dateSelect = within(dialog).getByLabelText('Date');
    const dates = within(dateSelect)
      .getAllByRole('option')
      .map((option) => option.value)
      .filter(Boolean);
    expect(dates.slice(0, 2)).toEqual(['2026-10-06', '2026-10-13']);
    expect(dates.every((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 2)).toBe(true);

    await user.selectOptions(dateSelect, '2026-10-13');
    expect(within(dialog).getByText(/You will miss 1h 30m/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Reason'), 'Medical appointment');
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }));

    await waitFor(() =>
      expect(excusalsApi.requestExcusal).toHaveBeenCalledWith({
        allocationId: 'alloc-1',
        sessionId: 'session-lab',
        sessionDate: '2026-10-13',
        reason: 'Medical appointment',
      })
    );
  });

  it('cannot submit until a session and date are chosen', async () => {
    const user = userEvent.setup();
    const dialog = await openRequest(user);
    const send = within(dialog).getByRole('button', { name: 'Send request' });

    await user.selectOptions(within(dialog).getByLabelText('Course'), 'alloc-1');
    await user.type(within(dialog).getByLabelText('Reason'), 'Sick');
    expect(send).toBeDisabled();

    const sessionSelect = within(dialog).getByLabelText('Session');
    await waitFor(() => expect(sessionSelect).toBeEnabled());
    await user.selectOptions(sessionSelect, 'session-tut');
    expect(send).toBeDisabled();

    // Changing session clears the previously chosen date.
    await user.selectOptions(within(dialog).getByLabelText('Date'), '2026-10-08');
    expect(send).toBeEnabled();
    await user.selectOptions(sessionSelect, 'session-lab');
    expect(within(dialog).getByLabelText('Date')).toHaveValue('');
    expect(send).toBeDisabled();
  });

  it('explains when the course has no scheduled sessions', async () => {
    coursesApi.getCourseSessions.mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    const dialog = await openRequest(user);

    await user.selectOptions(within(dialog).getByLabelText('Course'), 'alloc-1');

    expect(
      await within(dialog).findByRole('option', { name: 'This course has no scheduled sessions' })
    ).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Date')).not.toBeInTheDocument();
  });

  it('shows the API rejection for an invalid occurrence', async () => {
    excusalsApi.requestExcusal.mockRejectedValue(
      new Error('2026-10-06 is not a Thursday, so this session does not run on that date')
    );
    const user = userEvent.setup();
    const dialog = await openRequest(user);

    await user.selectOptions(within(dialog).getByLabelText('Course'), 'alloc-1');
    const sessionSelect = within(dialog).getByLabelText('Session');
    await waitFor(() => expect(sessionSelect).toBeEnabled());
    await user.selectOptions(sessionSelect, 'session-lab');
    await user.selectOptions(within(dialog).getByLabelText('Date'), '2026-10-06');
    await user.type(within(dialog).getByLabelText('Reason'), 'Sick');
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }));

    expect(await within(dialog).findByText(/does not run on that date/)).toBeInTheDocument();
  });
});

describe('Excusal list', () => {
  it("shows the session occurrence and keeps the tutor's and reviewer's reasons apart", async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'admin-1' }, isTutor: false, isStaff: true });
    excusalsApi.getExcusals.mockResolvedValue({
      data: [
        {
          id: 'exc-1',
          status: 'DECLINED',
          sessionDate: '2026-10-06T00:00:00.000Z',
          durationMinutes: 90,
          reason: 'Medical appointment',
          reviewReason: 'No cover available',
          session: lab,
          user: { name: 'Alice' },
          allocation: { course: { code: 'COMS3011A', name: 'SDP' } },
          reviewedBy: { name: 'Prof Smith' },
          resolvedAt: '2026-10-05T09:00:00.000Z',
        },
      ],
    });

    renderPage();

    expect(
      await screen.findByText(/Lab · Tuesday 14:00–15:30 · MSL 004 · .*6 Oct 2026 \(1h 30m\)/)
    ).toBeInTheDocument();
    expect(screen.getByText('Medical appointment')).toBeInTheDocument();
    expect(screen.getByText('No cover available')).toBeInTheDocument();
    expect(screen.getByText(/Declined by Prof Smith/)).toBeInTheDocument();
  });
});
