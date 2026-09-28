import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../src/pages/DashboardPage';
import { coursesApi } from '../src/api/courses';
import { tutorsApi } from '../src/api/tutors';
import { allocationsApi } from '../src/api/allocations';

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Ada Admin' }, role: 'admin', isStaff: true }),
}));
vi.mock('../src/components/auth/LogoutButton', () => ({ default: () => null }));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));
vi.mock('../src/api/tutors', () => ({ tutorsApi: { getTutors: vi.fn() } }));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));

const course = { id: 'c1', code: 'COMS101', name: 'Computing', requiredTutors: 1 };

beforeEach(() => {
  vi.resetAllMocks();
  coursesApi.getCourses.mockResolvedValue({ data: [course] });
  tutorsApi.getTutors.mockResolvedValue({ data: [] });
  allocationsApi.getAllocations.mockResolvedValue({
    data: [
      {
        id: 'a1',
        courseId: 'c1',
        userId: 't1',
        status: 'PENDING',
        hoursPerWeek: 3,
        user: { id: 't1', name: 'Alice' },
      },
    ],
  });
});

describe('Dashboard allocation counts', () => {
  it('does not count pending allocations as staffed or active', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Courses needing tutors')).toBeInTheDocument();
    expect(screen.getByText('COMS101')).toBeInTheDocument();
    expect(within(screen.getByText('Unfilled Courses').parentElement).getByText('1'));
    expect(within(screen.getByText('Allocations').parentElement).getByText('0'));
    expect(screen.getByText('1 pending activation')).toBeInTheDocument();
  });
});
