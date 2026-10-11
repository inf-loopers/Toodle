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
import { NAV_SECTIONS, ROLES } from '../src/utils/constants';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/courses', () => ({
  coursesApi: { getCourses: vi.fn(), getMyCourses: vi.fn(), createCourse: vi.fn() },
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

const course = (overrides = {}) => ({
  id: 'c1',
  code: 'COMS3011A',
  name: 'Software Design',
  semester: 2,
  year: 2026,
  minMarkRequired: 60,
  coordinators: [],
  ...overrides,
});

const showMine = () =>
  render(
    <MemoryRouter>
      <CoursesPage scope="mine" />
    </MemoryRouter>
  );

describe('Courses vs My Courses', () => {
  it('lists every course on the Courses tab', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isTutor: true });
    coursesApi.getCourses.mockResolvedValue({
      data: [course(), course({ id: 'c2', code: 'MATH2001A', name: 'Algebra' })],
    });
    show();

    expect(await screen.findByText('COMS3011A')).toBeInTheDocument();
    expect(screen.getByText('MATH2001A')).toBeInTheDocument();
    expect(coursesApi.getMyCourses).not.toHaveBeenCalled();
  });

  it("shows only a tutor's allocated courses with their allocation on My Courses", async () => {
    useAuth.mockReturnValue({ isAdmin: false, isTutor: true });
    coursesApi.getMyCourses.mockResolvedValue({
      data: [
        course({ myAllocation: { id: 'a1', status: 'ACTIVE', hoursPerWeek: 4 } }),
        course({
          id: 'c3',
          code: 'COMS2002A',
          myAllocation: { id: 'a2', status: 'PENDING', hoursPerWeek: 2 },
        }),
      ],
    });
    showMine();

    expect(await screen.findByRole('heading', { name: 'My Courses' })).toBeInTheDocument();
    expect(screen.getByText('The courses you are allocated to tutor.')).toBeInTheDocument();
    expect(screen.getByText('Tutoring · 4h/week')).toBeInTheDocument();
    expect(screen.getByText('Allocation pending')).toBeInTheDocument();
    expect(coursesApi.getCourses).not.toHaveBeenCalled();
  });

  it('shows a lecturer only the courses they coordinate on My Courses', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isTutor: false, isLecturer: true });
    coursesApi.getMyCourses.mockResolvedValue({ data: [course()] });
    showMine();

    expect(await screen.findByText('COMS3011A')).toBeInTheDocument();
    expect(screen.getByText('The courses you are assigned to coordinate.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New course/ })).not.toBeInTheDocument();
  });

  it('points a tutor with no allocations to the full course list', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isTutor: true });
    coursesApi.getMyCourses.mockResolvedValue({ data: [] });
    showMine();

    expect(await screen.findByText(/aren't allocated to any courses yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
  });

  it.each([ROLES.TUTOR, ROLES.LECTURER])('gives a %s both Courses and My Courses tabs', (role) => {
    const items = NAV_SECTIONS[role].flatMap((section) => section.items);

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Courses', path: '/courses' }),
        expect.objectContaining({ name: 'My Courses', path: '/my-courses' }),
      ])
    );
  });
});
