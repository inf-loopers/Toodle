import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  eligibility: { status: 'eligible', reasons: [], missing: [] },
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

  it('keeps the posted details and shows the API error when posting work fails', async () => {
    useAuth.mockReturnValue({ isStaff: true, dbUser: { id: 'a1', role: 'admin' } });
    coursesApi.getCourses.mockResolvedValue({
      data: [{ id: 'c1', code: 'COMS3011A', name: 'SDP' }],
    });
    overflowApi.createPost.mockRejectedValue({
      response: { data: { error: 'Hours exceed the course budget' } },
    });
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Post work/ }));
    const dialog = screen.getByRole('dialog', { name: 'Post overflow work' });
    await user.selectOptions(within(dialog).getByLabelText('Course'), 'c1');
    await user.type(within(dialog).getByLabelText('Description'), 'Cover the Thursday lab');
    await user.click(within(dialog).getByRole('button', { name: 'Post work' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Hours exceed the course budget');
    expect(alert).toHaveTextContent(/try again/i);

    // The dialog stays open with everything entered, so the post can be retried.
    expect(within(dialog).getByLabelText('Description')).toHaveValue('Cover the Thursday lab');
    expect(within(dialog).getByLabelText('Course')).toHaveValue('c1');
    expect(overflowApi.createPost).toHaveBeenCalledTimes(1);
  });

  it('shows a visible error banner when claiming a post fails', async () => {
    overflowApi.getPosts.mockResolvedValue({ data: [post()] });
    overflowApi.claimPost.mockRejectedValue({
      response: { data: { error: 'This post has already been filled' } },
    });
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: 'Claim' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This post has already been filled');
    expect(alert).toHaveTextContent(/try again/i);
    // The action stays available so the student can retry it.
    expect(screen.getByRole('button', { name: 'Claim' })).toBeEnabled();
    expect(overflowApi.claimPost).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when the overflow list fails to load', async () => {
    // Fail the initial load only; the retry then resolves so refetch()'s promise
    // is handled (models real recovery, avoids an unhandled rejection).
    overflowApi.getPosts.mockRejectedValueOnce(new Error('Network Error'));
    const user = userEvent.setup();
    show();

    expect(await screen.findByText("Couldn't load overflow work")).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(overflowApi.getPosts).toHaveBeenCalledTimes(2));
  });
});

describe('B05 volunteer discovery', () => {
  it.each([
    ['ineligible', ['Insufficient weekly hours'], [], 'Ineligible'],
    ['profile_incomplete', [], ['availability'], 'Profile incomplete'],
  ])('blocks %s claims with guidance', async (status, reasons, missing, label) => {
    overflowApi.getPosts.mockResolvedValue({
      data: [
        post({
          eligibility: { status, reasons, missing },
          approvalEligibility: { status: 'profile_incomplete', reasons: [], missing: [] },
        }),
      ],
    });
    show();
    expect((await screen.findAllByText(label))[0]).toBeInTheDocument();
    expect(screen.queryByText(/You may submit a claim for review/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled();
    if (missing.length)
      expect(screen.getByRole('link', { name: 'Complete profile' })).toHaveAttribute(
        'href',
        '/profile'
      );
    else expect(screen.getByText('Insufficient weekly hours')).toBeInTheDocument();
  });
  it('shows claim eligibility separately from missing marks for approval', async () => {
    overflowApi.getPosts.mockResolvedValue({
      data: [
        post({
          approvalEligibility: {
            status: 'profile_incomplete',
            missing: ['courseMark'],
            reasons: [],
          },
        }),
      ],
    });
    show();
    expect(await screen.findByText('Approval readiness')).toBeInTheDocument();
    expect(screen.getByText('Profile incomplete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add marks' })).toHaveAttribute('href', '/courses/c1');
    expect(screen.getByRole('button', { name: 'Claim' })).toBeEnabled();
  });
  it('shows stale claim errors and reconciles the card', async () => {
    overflowApi.getPosts.mockResolvedValue({ data: [post()] });
    overflowApi.claimPost.mockImplementation(async () => {
      overflowApi.getPosts.mockResolvedValue({
        data: [
          post({
            eligibility: { status: 'ineligible', reasons: ['Hours exhausted'], missing: [] },
          }),
        ],
      });
      throw { response: { data: { error: 'Insufficient weekly hours' } } };
    });
    show();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Claim' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient weekly hours');
    expect(await screen.findByText('Hours exhausted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled();
  });
});

describe('B05 conflict resolution preserves load and action errors', () => {
  it('keeps the rejected claim error visible when reconciliation fails and the list is retried', async () => {
    overflowApi.getPosts.mockResolvedValueOnce({ data: [post()] });
    overflowApi.getPosts.mockRejectedValueOnce(new Error('Refresh connection failed'));
    overflowApi.getPosts.mockResolvedValueOnce({ data: [post()] });
    overflowApi.claimPost.mockRejectedValue({
      response: { data: { error: 'Weekly hours changed' } },
    });
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole('button', { name: 'Claim' }));
    expect(await screen.findByText("Couldn't load overflow work")).toBeInTheDocument();
    expect(screen.getByText('Refresh connection failed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Weekly hours changed');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Claim' })).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Weekly hours changed');
    expect(screen.queryByText('Refresh connection failed')).not.toBeInTheDocument();
  });
});
