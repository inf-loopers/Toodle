/**
 * @file course-detail-page.test.jsx
 * @description Add-session modal: a failure carrying no API message still shows
 * an actionable alert, a server message wins over the fallback, and the entered
 * values survive the failure so the session can be corrected and retried.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseDetailPage from '../src/pages/CourseDetailPage';
import { useAuth } from '../src/hooks/useAuth';
import { coursesApi } from '../src/api/courses';
import { usersApi } from '../src/api/users';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/courses', () => ({
  coursesApi: {
    getCourse: vi.fn(),
    getCourseSessions: vi.fn(),
    createCourseSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    setCoordinators: vi.fn(),
  },
}));
vi.mock('../src/api/users', () => ({ usersApi: { getUsers: vi.fn() } }));
vi.mock('../src/components/CourseApplications', () => ({ default: () => null }));

const course = {
  id: 'c1',
  code: 'COMS3000A',
  name: 'Software Design',
  semester: 1,
  year: 2026,
  requiredTutors: 2,
  minMarkRequired: 50,
  coordinators: [],
  allocations: [],
};

const show = () =>
  render(
    <MemoryRouter initialEntries={['/courses/c1']}>
      <Routes>
        <Route path="/courses/:id" element={<CourseDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

async function openSessionModal(user) {
  await user.click(await screen.findByRole('button', { name: 'Add' }));
  return screen.getByRole('dialog', { name: 'Add a session' });
}

beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ isAdmin: true, isStaff: true, dbUser: { id: 'a1' } });
  coursesApi.getCourse.mockResolvedValue({ data: course });
  coursesApi.getCourseSessions.mockResolvedValue({ data: [] });
  usersApi.getUsers.mockResolvedValue({ data: [] });
});

describe('AddSessionModal', () => {
  it('shows an actionable fallback and keeps input when the failure has no message', async () => {
    coursesApi.createCourseSession.mockRejectedValue({});
    const user = userEvent.setup();
    show();

    const dialog = await openSessionModal(user);
    await user.type(within(dialog).getByLabelText('Venue'), 'CompLab 3');
    await user.click(within(dialog).getByRole('button', { name: 'Add session' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not add the session.');
    expect(alert).toHaveTextContent(/try again/i);

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Venue')).toHaveValue('CompLab 3');
  });

  it('prefers the server message over the fallback', async () => {
    coursesApi.createCourseSession.mockRejectedValue({
      response: { data: { error: 'This session clashes with an existing one' } },
    });
    const user = userEvent.setup();
    show();

    const dialog = await openSessionModal(user);
    await user.click(within(dialog).getByRole('button', { name: 'Add session' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This session clashes with an existing one');
    expect(alert).not.toHaveTextContent('Could not add the session.');
  });
});

const lab = {
  id: 's-lab',
  courseId: 'c1',
  dayOfWeek: 'MONDAY',
  startTime: '14:00',
  endTime: '17:00',
  venue: 'MSL 004',
  sessionType: 'LAB',
};

describe('Editing and removing sessions', () => {
  beforeEach(() => {
    coursesApi.getCourseSessions.mockResolvedValue({ data: [lab] });
  });

  it('lets a coordinator fix the day of a lab', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isStaff: true, dbUser: { id: 'lect-1' } });
    coursesApi.getCourse.mockResolvedValue({
      data: { ...course, coordinators: [{ userId: 'lect-1', user: { name: 'Dr L' } }] },
    });
    coursesApi.updateSession.mockResolvedValue({
      data: { session: { ...lab, dayOfWeek: 'WEDNESDAY' }, revalidation: { demoted: 0 } },
    });
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Edit .* lab/i }));
    const dialog = screen.getByRole('dialog', { name: 'Edit session' });
    // The form starts from the session's current values.
    expect(within(dialog).getByLabelText('Day')).toHaveValue('MONDAY');
    expect(within(dialog).getByLabelText('Venue')).toHaveValue('MSL 004');

    await user.selectOptions(within(dialog).getByLabelText('Day'), 'WEDNESDAY');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(coursesApi.updateSession).toHaveBeenCalledWith('s-lab', {
      dayOfWeek: 'WEDNESDAY',
      startTime: '14:00',
      endTime: '17:00',
      venue: 'MSL 004',
      sessionType: 'LAB',
    });
    await waitFor(() => expect(coursesApi.getCourseSessions).toHaveBeenCalledTimes(2));
  });

  it('tells the coordinator when the change moved tutors back to pending', async () => {
    coursesApi.updateSession.mockResolvedValue({
      data: { session: lab, revalidation: { checked: 3, demoted: 2 } },
    });
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Edit .* lab/i }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '2 tutor allocations were moved back to pending'
    );
  });

  it('rejects an end time before the start time without calling the API', async () => {
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Edit .* lab/i }));
    const dialog = screen.getByRole('dialog', { name: 'Edit session' });
    const end = within(dialog).getByLabelText('End time');
    await user.clear(end);
    await user.type(end, '13:00');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The end time must be after the start time.'
    );
    expect(coursesApi.updateSession).not.toHaveBeenCalled();
  });

  it('removes a session after confirmation', async () => {
    coursesApi.deleteSession.mockResolvedValue({});
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Remove .* lab/i }));
    const dialog = screen.getByRole('dialog', { name: 'Remove session' });
    expect(dialog).toHaveTextContent(/Excusal requests for this session are deleted/);
    await user.click(within(dialog).getByRole('button', { name: 'Remove session' }));

    expect(coursesApi.deleteSession).toHaveBeenCalledWith('s-lab');
  });

  it('hides edit and remove from users who do not manage the course', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isStaff: false, dbUser: { id: 't1' } });
    show();

    expect(await screen.findByText(/MSL 004/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit .* lab/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove .* lab/i })).not.toBeInTheDocument();
  });
});
