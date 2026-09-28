/**
 * @file courses-page.test.jsx
 * @description Create-course modal: a failed save is announced and keeps the
 * entered values, client-side validation never reaches the API, and a successful
 * create closes the dialog and starts fresh when it is reopened.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CoursesPage from '../src/pages/CoursesPage';
import { useAuth } from '../src/hooks/useAuth';
import { coursesApi } from '../src/api/courses';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/courses', () => ({
  coursesApi: { getCourses: vi.fn(), createCourse: vi.fn() },
}));

const show = () =>
  render(
    <MemoryRouter>
      <CoursesPage />
    </MemoryRouter>
  );

async function openCreateModal(user) {
  await user.click(await screen.findByRole('button', { name: /New course/ }));
  return screen.getByRole('dialog', { name: 'New course' });
}

beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ isAdmin: true });
  coursesApi.getCourses.mockResolvedValue({ data: [] });
});

describe('CreateCourseModal', () => {
  it('keeps the entered values and shows the API error when creation fails', async () => {
    coursesApi.createCourse.mockRejectedValue({
      response: { data: { error: 'A course with this code already exists' } },
    });
    const user = userEvent.setup();
    show();

    const dialog = await openCreateModal(user);
    await user.type(within(dialog).getByLabelText('Course code'), 'COMS3011A');
    await user.type(within(dialog).getByLabelText('Course name'), 'Software Design');
    await user.click(within(dialog).getByRole('button', { name: 'Create course' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A course with this code already exists');
    expect(alert).toHaveTextContent(/try again/i);

    // The dialog stays open with everything the admin typed still in place.
    expect(within(dialog).getByLabelText('Course code')).toHaveValue('COMS3011A');
    expect(within(dialog).getByLabelText('Course name')).toHaveValue('Software Design');
    expect(coursesApi.createCourse).toHaveBeenCalledTimes(1);
  });

  it('explains missing required fields without calling the API', async () => {
    const user = userEvent.setup();
    show();

    const dialog = await openCreateModal(user);
    await user.click(within(dialog).getByRole('button', { name: 'Create course' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Course code and name are required.'
    );
    expect(coursesApi.createCourse).not.toHaveBeenCalled();
  });

  it('closes after a successful create and starts fresh when reopened', async () => {
    coursesApi.createCourse.mockResolvedValue({ data: { id: 'c-new' } });
    const user = userEvent.setup();
    show();

    let dialog = await openCreateModal(user);
    await user.type(within(dialog).getByLabelText('Course code'), 'COMS3011A');
    await user.type(within(dialog).getByLabelText('Course name'), 'Software Design');
    await user.click(within(dialog).getByRole('button', { name: 'Create course' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await openCreateModal(user);
    expect(within(dialog).getByLabelText('Course code')).toHaveValue('');
    expect(within(dialog).getByLabelText('Course name')).toHaveValue('');
  });
});
