import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CoursesPage from '../src/pages/CoursesPage';
import OnboardingGate from '../src/components/auth/OnboardingGate';
import { coursesApi } from '../src/api/courses';
import { useAuth } from '../src/hooks/useAuth';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/courses', () => ({
  coursesApi: { getOpportunities: vi.fn(), getCourses: vi.fn() },
}));
const course = (id, status, reasons = [], missing = []) => ({
  id,
  code: id,
  name: id + ' course',
  applicationsOpen: true,
  minMarkRequired: 60,
  eligibility: { status, reasons, missing },
});
beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ role: 'student' });
  coursesApi.getCourses.mockResolvedValue({ data: [] });
});
describe('B05 catalog discovery', () => {
  it('puts eligible courses first and keeps reasons and next actions visible', async () => {
    coursesApi.getOpportunities.mockResolvedValue({
      data: [
        course('LOW', 'ineligible', ['Mark below minimum']),
        course('MISSING', 'profile_incomplete', [], ['courseMark']),
        course('READY', 'eligible'),
      ],
    });
    render(
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>
    );
    await screen.findByText('Eligible to submit');
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    ).toEqual(['READY', 'LOW', 'MISSING']);
    expect(screen.getByText('Mark below minimum')).toBeInTheDocument();
    expect(screen.getByText('Profile incomplete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add marks' })).toHaveAttribute(
      'href',
      '/courses/MISSING'
    );
    expect(coursesApi.getOpportunities).toHaveBeenCalled();
    expect(coursesApi.getCourses).not.toHaveBeenCalled();
  });
  it('keeps staff on the existing catalog endpoint', async () => {
    useAuth.mockReturnValue({ role: 'lecturer' });
    render(
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>
    );
    await screen.findByText('No courses found');
    expect(coursesApi.getCourses).toHaveBeenCalled();
    expect(coursesApi.getOpportunities).not.toHaveBeenCalled();
  });
});
describe('Existing onboarding route gate', () => {
  const showGate = () =>
    render(
      <MemoryRouter initialEntries={['/courses']}>
        <Routes>
          <Route element={<OnboardingGate />}>
            <Route path="/courses" element={<div>Discovery page</div>} />
            <Route path="/onboarding" element={<div>Required onboarding</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  it('still redirects incomplete students to onboarding', () => {
    useAuth.mockReturnValue({
      role: 'student',
      dbUser: { onboarding: { missing: ['availability'] } },
    });
    showGate();
    expect(screen.getByText('Required onboarding')).toBeInTheDocument();
    expect(screen.queryByText('Discovery page')).not.toBeInTheDocument();
  });
  it.each(['student', 'tutor', 'admin', 'lecturer'])('allows completed %s profiles', (role) => {
    useAuth.mockReturnValue({ role, dbUser: { onboarding: { missing: [] } } });
    showGate();
    expect(screen.getByText('Discovery page')).toBeInTheDocument();
  });
});
