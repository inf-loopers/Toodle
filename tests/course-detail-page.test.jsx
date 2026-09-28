/**
 * @file course-detail-page.test.jsx
 * @description Add-session modal: a failure carrying no API message still shows
 * an actionable alert, a server message wins over the fallback, and the entered
 * values survive the failure so the session can be corrected and retried.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
