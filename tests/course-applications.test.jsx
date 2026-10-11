import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CourseApplications from '../src/components/CourseApplications';
import { useAuth } from '../src/hooks/useAuth';
import { coursesApi } from '../src/api/courses';
import { tutorsApi } from '../src/api/tutors';
import { usersApi } from '../src/api/users';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/courses', () => ({
  coursesApi: {
    getApplications: vi.fn(),
    getEligibility: vi.fn(),
    apply: vi.fn(),
    reviewApplication: vi.fn(),
    withdrawApplication: vi.fn(),
    updateCourse: vi.fn(),
    deleteCourse: vi.fn(),
  },
}));
vi.mock('../src/api/tutors', () => ({ tutorsApi: { submitMark: vi.fn(), reviewMark: vi.fn() } }));
vi.mock('../src/api/users', () => ({ usersApi: { getCurrentUser: vi.fn() } }));
const course = {
  id: 'c1',
  code: 'COMS101',
  minMarkRequired: 60,
  applicationsOpen: true,
  sessions: [{ id: 's1' }],
};
const application = {
  id: 'a1',
  status: 'PENDING',
  hoursPerWeek: 2,
  user: { name: 'Alice', tutorMarks: [{ id: 'm1', mark: 75, status: 'PENDING' }] },
  eligibility: {
    remainingHours: 8,
    warnings: [{ type: 'MARK_NOT_VERIFIED', message: 'Mark needs verification' }],
  },
};
const show = (props = {}) => {
  const onUpdated = props.onUpdated ?? vi.fn().mockResolvedValue();
  const c = props.course ?? course;
  return {
    ...render(
      <MemoryRouter>
        <CourseApplications course={c} onUpdated={onUpdated} />
      </MemoryRouter>
    ),
    onUpdated,
  };
};
beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ isAdmin: false, role: 'student' });
  coursesApi.getEligibility.mockResolvedValue({
    data: { status: 'eligible', reasons: [], missing: [] },
  });
  coursesApi.getApplications.mockResolvedValue({ data: [] });
  usersApi.getCurrentUser.mockResolvedValue({ data: { tutorMarks: [] } });
});
describe('Course application workflow', () => {
  it('shows verified marks as read-only with correction guidance while still allowing applications', async () => {
    usersApi.getCurrentUser.mockResolvedValue({
      data: { tutorMarks: [{ courseId: 'c1', mark: 75, status: 'VERIFIED' }] },
    });
    const user = userEvent.setup();
    show();
    expect(await screen.findByText(/Your recorded mark: 75%/)).toHaveTextContent('VERIFIED');
    expect(screen.getByText(/Contact your course coordinator with supporting/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Your course mark (%)')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Submit mark for verification' })
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText('Why would you like to tutor this course?'),
      'I enjoy teaching'
    );
    await user.click(screen.getByRole('button', { name: 'Apply to tutor' }));
    await waitFor(() => expect(coursesApi.apply).toHaveBeenCalled());
    expect(tutorsApi.submitMark).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'REJECTED'])(
    'keeps the self-submission form available for %s marks',
    async (status) => {
      usersApi.getCurrentUser.mockResolvedValue({
        data: { tutorMarks: [{ courseId: 'c1', mark: 75, status }] },
      });
      const user = userEvent.setup();
      show();
      await screen.findByText(/Your recorded mark: 75%/);
      await user.type(screen.getByLabelText('Your course mark (%)'), '82');
      await user.click(screen.getByRole('button', { name: 'Submit mark for verification' }));
      await waitFor(() =>
        expect(tutorsApi.submitMark).toHaveBeenCalledWith({ courseId: 'c1', mark: 82 })
      );
    }
  );

  it('shows backend correction guidance when a mark is verified after the form was loaded', async () => {
    tutorsApi.submitMark.mockRejectedValue({
      response: {
        data: {
          error:
            'Verified marks cannot be resubmitted. Contact your course coordinator with supporting records to request a correction.',
        },
      },
    });
    const user = userEvent.setup();
    show();
    await user.type(screen.getByLabelText('Your course mark (%)'), '90');
    await user.click(screen.getByRole('button', { name: 'Submit mark for verification' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Contact your course coordinator');
  });

  it('lets a student submit a mark and apply with requested hours', async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByLabelText('Your course mark (%)'), '75');
    await user.click(screen.getByRole('button', { name: 'Submit mark for verification' }));
    await waitFor(() =>
      expect(tutorsApi.submitMark).toHaveBeenCalledWith({ courseId: 'c1', mark: 75 })
    );
    await user.type(
      await screen.findByLabelText('Why would you like to tutor this course?'),
      'I enjoy teaching'
    );
    await user.click(await screen.findByRole('button', { name: 'Apply to tutor' }));
    await waitFor(() =>
      expect(coursesApi.apply).toHaveBeenCalledWith('c1', {
        hoursPerWeek: 2,
        motivation: 'I enjoy teaching',
      })
    );
    expect(screen.queryByRole('button', { name: 'Remove course' })).not.toBeInTheDocument();
  });
  it('blocks approval until marks are verified and requires a reason', async () => {
    useAuth.mockReturnValue({ isAdmin: true });
    coursesApi.getApplications.mockResolvedValue({ data: [application] });
    const user = userEvent.setup();
    show();
    expect(await screen.findByText('Mark needs verification')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Review reason for Alice'), 'School record checked');
    expect(screen.getByRole('button', { name: 'Approve application' })).toBeDisabled();
    coursesApi.getApplications.mockResolvedValue({
      data: [
        {
          ...application,
          user: { name: 'Alice', tutorMarks: [{ id: 'm1', mark: 75, status: 'VERIFIED' }] },
          eligibility: { remainingHours: 8, warnings: [] },
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Verify mark' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Approve application' })).toBeEnabled()
    );
    await user.click(screen.getByRole('button', { name: 'Approve application' }));
    await waitFor(() =>
      expect(coursesApi.reviewApplication).toHaveBeenCalledWith('c1', 'a1', {
        status: 'APPROVED',
        reason: 'School record checked',
      })
    );
  });
  it('shows failed API requests instead of claiming there are no applications', async () => {
    coursesApi.getApplications.mockRejectedValue({
      response: { status: 404, data: { error: 'Application API unavailable' } },
    });
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Application API unavailable');
    expect(screen.queryByText('No applications yet.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply to tutor' })).not.toBeInTheDocument();
  });
  it('requires confirmation for removal and displays history protection errors', async () => {
    useAuth.mockReturnValue({ isAdmin: true });
    coursesApi.deleteCourse.mockRejectedValue({
      response: { data: { error: 'Close applications instead to preserve history' } },
    });
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: 'Remove course' }));
    expect(coursesApi.deleteCourse).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm removal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Close applications instead');
  });
  it('lets an applicant withdraw their pending application', async () => {
    coursesApi.getApplications.mockResolvedValue({ data: [application] });
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole('button', { name: 'Withdraw application' }));
    await waitFor(() => expect(coursesApi.withdrawApplication).toHaveBeenCalledWith('c1', 'a1'));
  });
  it('allows an admin to open applications when currently closed', async () => {
    useAuth.mockReturnValue({ isAdmin: true });
    coursesApi.updateCourse.mockResolvedValue({ data: { ...course, applicationsOpen: true } });
    const onUpdated = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    show({ course: { ...course, applicationsOpen: false }, onUpdated });

    await user.click(screen.getByRole('button', { name: 'Open applications' }));
    await waitFor(() => {
      expect(coursesApi.updateCourse).toHaveBeenCalledWith('c1', { applicationsOpen: true });
      expect(onUpdated).toHaveBeenCalled();
    });
  });
  it('allows an admin to close applications when currently open', async () => {
    useAuth.mockReturnValue({ isAdmin: true });
    coursesApi.updateCourse.mockResolvedValue({ data: { ...course, applicationsOpen: false } });
    const onUpdated = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    show({ course: { ...course, applicationsOpen: true }, onUpdated });

    await user.click(screen.getByRole('button', { name: 'Close applications' }));
    await waitFor(() => {
      expect(coursesApi.updateCourse).toHaveBeenCalledWith('c1', { applicationsOpen: false });
      expect(onUpdated).toHaveBeenCalled();
    });
  });
});

describe('B05 application next actions', () => {
  it('blocks ineligible applications and shows the backend reason', async () => {
    coursesApi.getEligibility.mockResolvedValue({
      data: { status: 'ineligible', reasons: ['Required mark not met'], missing: [] },
    });
    show();
    expect(await screen.findByText('Ineligible')).toBeInTheDocument();
    expect(screen.getByText('Required mark not met')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply to tutor' })).toBeDisabled();
  });
  it('distinguishes missing profile data and links to actual workflows', async () => {
    coursesApi.getEligibility.mockResolvedValue({
      data: { status: 'profile_incomplete', reasons: [], missing: ['availability', 'courseMark'] },
    });
    show();
    expect(await screen.findByText('Profile incomplete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Complete profile' })).toHaveAttribute(
      'href',
      '/profile'
    );
    expect(screen.getByRole('link', { name: 'Add marks' })).toHaveAttribute('href', '/courses/c1');
    expect(screen.getByRole('button', { name: 'Apply to tutor' })).toBeDisabled();
    expect(screen.queryByText('Ineligible')).not.toBeInTheDocument();
  });
  it('shows a stale-state rejection truthfully and refreshes eligibility', async () => {
    coursesApi.apply.mockImplementation(async () => {
      coursesApi.getEligibility.mockResolvedValue({
        data: { status: 'ineligible', reasons: ['Weekly hours changed'], missing: [] },
      });
      throw { response: { data: { error: 'Server rejected: weekly hours changed' } } };
    });
    const { onUpdated } = show();
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText('Why would you like to tutor this course?'),
      'I enjoy teaching'
    );
    await user.click(screen.getByRole('button', { name: 'Apply to tutor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Server rejected: weekly hours changed'
    );
    expect(await screen.findByText('Weekly hours changed')).toBeInTheDocument();
    expect(onUpdated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Apply to tutor' })).toBeDisabled();
  });
  it('does not show applicant forms to a lecturer who does not manage the course', async () => {
    useAuth.mockReturnValue({ role: 'lecturer', dbUser: { id: 'other' } });
    show();
    expect(await screen.findByText('Only students and tutors can apply.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply to tutor' })).not.toBeInTheDocument();
    expect(coursesApi.getEligibility).not.toHaveBeenCalled();
  });
});
