import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VolunteersPage from '../src/pages/VolunteersPage';
import { useAuth } from '../src/hooks/useAuth';
import { overflowApi } from '../src/api/overflow';
import { coursesApi } from '../src/api/courses';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/overflow', () => ({
  overflowApi: {
    getPosts: vi.fn(),
    createPost: vi.fn(),
    claimPost: vi.fn(),
    approveClaim: vi.fn(),
    rejectClaim: vi.fn(),
    cancelPost: vi.fn(),
  },
}));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));

const post = (overrides = {}) => ({
  id: 'op-1',
  status: 'OPEN',
  hoursNeeded: 4,
  description: 'Cover needed for a lab session',
  course: { id: 'c1', code: 'COMS3011A', name: 'SDP' },
  claims: [],
  ...overrides,
});

const show = () =>
  render(
    <MemoryRouter>
      <VolunteersPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ isStaff: false, dbUser: { id: 'u1', role: 'student' } });
  overflowApi.getPosts.mockResolvedValue({ data: [] });
  coursesApi.getCourses.mockResolvedValue({ data: [] });
});

describe('Volunteer overflow workflow', () => {
  it('lets a student claim an open post', async () => {
    overflowApi.getPosts.mockResolvedValue({ data: [post()] });
    overflowApi.claimPost.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: 'Claim' }));

    await waitFor(() => expect(overflowApi.claimPost).toHaveBeenCalledWith('op-1'));
  });

  it('shows the student their pending claim under My claims', async () => {
    overflowApi.getPosts.mockResolvedValue({
      data: [
        post({
          claims: [{ id: 'cl-1', status: 'PENDING', user: { id: 'u1', name: 'Student One' } }],
        }),
      ],
    });
    show();

    expect(await screen.findByText('My claims')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Record hours/i })).not.toBeInTheDocument();
    // The claimed post must not appear again as claimable open work.
    expect(screen.getByText('No overflow work right now')).toBeInTheDocument();
  });

  it('shows a Record hours link once the claim is approved', async () => {
    overflowApi.getPosts.mockResolvedValue({
      data: [
        post({
          status: 'CLAIMED',
          claims: [{ id: 'cl-1', status: 'APPROVED', user: { id: 'u1', name: 'Student One' } }],
        }),
      ],
    });
    show();

    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Record hours/i })).toHaveAttribute(
      'href',
      '/timesheets'
    );
  });

  it('lets staff reject a pending claim', async () => {
    useAuth.mockReturnValue({ isStaff: true, dbUser: { id: 'a1', role: 'admin' } });
    overflowApi.getPosts.mockResolvedValue({
      data: [
        post({
          claims: [
            {
              id: 'cl-1',
              status: 'PENDING',
              user: { id: 'u2', name: 'Student Two', email: 's2@test.com' },
            },
          ],
        }),
      ],
    });
    overflowApi.rejectClaim.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(overflowApi.rejectClaim).toHaveBeenCalledWith('cl-1'));
  });

  it('lets staff approve a pending claim', async () => {
    useAuth.mockReturnValue({ isStaff: true, dbUser: { id: 'a1', role: 'admin' } });
    overflowApi.getPosts.mockResolvedValue({
      data: [
        post({
          claims: [
            {
              id: 'cl-1',
              status: 'PENDING',
              user: { id: 'u2', name: 'Student Two', email: 's2@test.com' },
            },
          ],
        }),
      ],
    });
    overflowApi.approveClaim.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(overflowApi.approveClaim).toHaveBeenCalledWith('cl-1'));
  });
});
