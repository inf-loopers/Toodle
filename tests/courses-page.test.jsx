import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoursesPage } from '../src/pages/CoursesPage';
import { useAuth } from '../src/hooks/useAuth';
import { coursesApi } from '../src/api/courses';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/courses', () => ({
  coursesApi: { getCourses: vi.fn() },
}));

const course = (overrides = {}) => ({
  id: 'c1',
  code: 'COMS101',
  name: 'Intro to CS',
  semester: 2,
  year: 2026,
  minMarkRequired: 60,
  applicationsOpen: true,
  coordinators: [],
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoursesPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ isAdmin: false });
});

describe('Courses page lecturer display', () => {
  it('shows lecturer names on each course card for students and tutors', async () => {
    coursesApi.getCourses.mockResolvedValue({
      data: [
        course({
          coordinators: [
            { userId: 'l1', user: { id: 'l1', name: 'Dr. Naledi Khumalo' } },
            { userId: 'l2', user: { id: 'l2', name: 'Prof. Sipho Dlamini' } },
          ],
        }),
      ],
    });

    renderPage();

    expect(
      await screen.findByText(/Lecturers: Dr\. Naledi Khumalo, Prof\. Sipho Dlamini/)
    ).toBeInTheDocument();
  });

  it('shows a single lecturer without pluralising', async () => {
    coursesApi.getCourses.mockResolvedValue({
      data: [
        course({
          coordinators: [{ userId: 'l1', user: { id: 'l1', name: 'Dr. Naledi Khumalo' } }],
        }),
      ],
    });

    renderPage();

    expect(await screen.findByText(/Lecturer: Dr\. Naledi Khumalo/)).toBeInTheDocument();
  });

  it('shows a placeholder when no lecturer is assigned', async () => {
    coursesApi.getCourses.mockResolvedValue({ data: [course()] });

    renderPage();

    expect(await screen.findByText('No lecturer assigned')).toBeInTheDocument();
  });
});
