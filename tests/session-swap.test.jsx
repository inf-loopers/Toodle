import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionSwapPage } from '../src/pages/SessionSwapPage';
import { useAuth } from '../src/hooks/useAuth';
import { swapsApi } from '../src/api/swaps';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/swaps', () => ({
  swapsApi: {
    getSwaps: vi.fn(),
    getOptions: vi.fn(),
    requestSwap: vi.fn(),
    approveSwap: vi.fn(),
    rejectSwap: vi.fn(),
    cancelSwap: vi.fn(),
  },
}));

const pending = {
  id: 'swap',
  status: 'PENDING',
  requesterId: 'tutor',
  requesteeId: 'target',
  requester: { name: 'Alice' },
  requestee: { name: 'Bob' },
  requesterAllocation: { course: { code: 'CSC101' } },
  targetAllocation: { course: { code: 'MAT101' } },
  validationWarnings: {
    requester: [{ type: 'HOURS_EXCEEDED', message: 'Weekly hours exceeded' }],
    requestee: [],
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  // Match the actual auth hook: Auth0 user has no DB id or isOrganiser flag.
  useAuth.mockReturnValue({ user: { sub: 'auth0|tutor' }, dbUser: { id: 'tutor' }, role: 'TUTOR' });
  swapsApi.getSwaps.mockResolvedValue({ data: [pending] });
  swapsApi.getOptions.mockResolvedValue({
    data: [
      {
        id: 'origin',
        userId: 'tutor',
        courseId: 'csc',
        status: 'ACTIVE',
        course: { code: 'CSC101' },
      },
      {
        id: 'destination',
        userId: 'target',
        courseId: 'mat',
        status: 'ACTIVE',
        course: { code: 'MAT101' },
        user: { name: 'Bob' },
      },
      {
        id: 'inactive',
        userId: 'tutor',
        courseId: 'old',
        status: 'REMOVED',
        course: { code: 'OLD101' },
      },
    ],
  });
});

describe('Session swap page integration', () => {
  it('uses the DB identity and partner options to submit a tutor request', async () => {
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Request swap' }));
    await user.selectOptions(screen.getByLabelText('One of your sessions'), 'origin');
    await user.selectOptions(screen.getByLabelText('Swap with'), 'destination');
    expect(screen.queryByRole('option', { name: 'OLD101' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() =>
      expect(swapsApi.requestSwap).toHaveBeenCalledWith({
        originAllocationId: 'origin',
        targetAllocationId: 'destination',
        requesteeId: 'target',
        reason: '',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows organiser controls, warnings and approval failures', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'organiser' }, role: 'ORGANISER' });
    swapsApi.approveSwap.mockRejectedValue({
      response: {
        data: {
          error: 'Swap does not satisfy allocation constraints',
          details: { requester: [{ message: 'Outside recorded availability' }], requestee: [] },
        },
      },
    });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    expect(await screen.findByText('Alice: Weekly hours exceeded')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Outside recorded availability');
    expect(swapsApi.getOptions).not.toHaveBeenCalled();
  });

  it('allows organiser rejection and refreshes the result', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'organiser' }, role: 'ORGANISER' });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(swapsApi.rejectSwap).toHaveBeenCalledWith('swap');
    await waitFor(() => expect(swapsApi.getSwaps).toHaveBeenCalledTimes(2));
  });

  it('shows the cancel action for the requesting DB user', async () => {
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(swapsApi.cancelSwap).toHaveBeenCalledWith('swap');
    await waitFor(() => expect(swapsApi.getOptions).toHaveBeenCalledTimes(2));
  });

  it('does not show cancellation for the target or requests for a student', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'target' }, role: 'STUDENT' });
    render(<SessionSwapPage />);
    await screen.findByText('PENDING');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request swap' })).not.toBeInTheDocument();
  });
});
