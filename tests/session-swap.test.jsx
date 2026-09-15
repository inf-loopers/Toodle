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
    acceptSwap: vi.fn(),
    declineSwap: vi.fn(),
  },
}));

const pending = {
  id: 'swap',
  status: 'PENDING',
  requesteeAcceptedAt: '2026-09-15T09:00:00Z',
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
  it('shows the accepted state after the recipient accepts and refreshes', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'target' }, role: 'TUTOR' });
    swapsApi.getSwaps
      .mockResolvedValueOnce({ data: [{ ...pending, requesteeAcceptedAt: null }] })
      .mockResolvedValue({ data: [pending] });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Accept swap' }));
    expect(await screen.findByText('Tutor accepted · awaiting organiser')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept swap' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });
  it.each(['Accept swap', 'Decline'])(
    'keeps a failed %s decision actionable and displays its error',
    async (action) => {
      useAuth.mockReturnValue({ dbUser: { id: 'target' }, role: 'TUTOR' });
      swapsApi.getSwaps.mockResolvedValue({ data: [{ ...pending, requesteeAcceptedAt: null }] });
      (action === 'Decline' ? swapsApi.declineSwap : swapsApi.acceptSwap).mockRejectedValue(
        new Error('Decision failed')
      );
      const user = userEvent.setup();
      render(<SessionSwapPage />);
      await user.click(await screen.findByRole('button', { name: action }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Decision failed');
      expect(screen.getByRole('button', { name: action })).toBeEnabled();
      expect(swapsApi.getSwaps).toHaveBeenCalledTimes(1);
    }
  );
  it('removes recipient actions when decline resolves the request', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'target' }, role: 'TUTOR' });
    swapsApi.getSwaps.mockResolvedValueOnce({ data: [pending] }).mockResolvedValue({
      data: [
        { ...pending, status: 'REJECTED', rejectionReason: 'Declined by the requested tutor' },
      ],
    });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Decline' }));
    expect(await screen.findByText('REJECTED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept swap' })).not.toBeInTheDocument();
  });
  it('lets only the recipient accept or decline a new request', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'target' }, role: 'TUTOR' });
    swapsApi.getSwaps.mockResolvedValue({ data: [{ ...pending, requesteeAcceptedAt: null }] });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Accept swap' }));
    expect(swapsApi.acceptSwap).toHaveBeenCalledWith('swap');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Decline' }));
    expect(swapsApi.declineSwap).toHaveBeenCalledWith('swap');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
  it('blocks organiser approval until the partner accepts', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'organiser' }, role: 'ORGANISER' });
    swapsApi.getSwaps.mockResolvedValue({ data: [{ ...pending, requesteeAcceptedAt: null }] });
    render(<SessionSwapPage />);
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByText('Awaiting other tutor’s acceptance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept swap' })).not.toBeInTheDocument();
  });
  it('reloads allocation choices before opening a request', async () => {
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await screen.findByRole('button', { name: 'Request swap' });
    swapsApi.getOptions.mockResolvedValue({ data: [] });
    await user.click(screen.getByRole('button', { name: 'Request swap' }));
    expect(
      await screen.findByText('You need an active course allocation to request a swap.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'CSC101' })).not.toBeInTheDocument();
    expect(swapsApi.getOptions).toHaveBeenCalledTimes(2);
  });

  it('refreshes and clears stale selections after a missing allocation response', async () => {
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Request swap' }));
    await user.selectOptions(screen.getByLabelText('Your course allocation'), 'origin');
    await user.selectOptions(screen.getByLabelText('Swap with'), 'destination');
    swapsApi.requestSwap.mockRejectedValue({
      response: { status: 404, data: { error: 'Allocation not found' } },
    });
    swapsApi.getOptions.mockResolvedValue({ data: [] });
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choices refreshed');
    expect(screen.getByLabelText('Your course allocation')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
    expect(swapsApi.getOptions).toHaveBeenCalledTimes(3);
    expect(swapsApi.requestSwap).toHaveBeenCalledTimes(1);
  });

  it('keeps the form closed when fresh choices cannot be loaded', async () => {
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await screen.findByRole('button', { name: 'Request swap' });
    swapsApi.getOptions.mockRejectedValue(new Error('Options unavailable'));
    await user.click(screen.getByRole('button', { name: 'Request swap' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Options unavailable');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the DB identity and partner options to submit a tutor request', async () => {
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Request swap' }));
    await user.selectOptions(screen.getByLabelText('Your course allocation'), 'origin');
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
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Requesting tutor: Outside recorded availability'
    );
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
  it('resets a dismissed request form', async () => {
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Request swap' }));
    await user.selectOptions(screen.getByLabelText('Your course allocation'), 'origin');
    await user.selectOptions(screen.getByLabelText('Swap with'), 'destination');
    await user.type(screen.getByLabelText('Reason (optional)'), 'Old reason');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Request swap' }));
    expect(screen.getByLabelText('Your course allocation')).toHaveValue('');
    expect(screen.getByLabelText('Reason (optional)')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
  });

  it('closes a saved request even when refreshing the list fails', async () => {
    swapsApi.getSwaps
      .mockResolvedValueOnce({ data: [pending] })
      .mockRejectedValue(new Error('Refresh failed'));
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Request swap' }));
    await user.selectOptions(screen.getByLabelText('Your course allocation'), 'origin');
    await user.selectOptions(screen.getByLabelText('Swap with'), 'destination');
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh failed');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(swapsApi.requestSwap).toHaveBeenCalledTimes(1);
  });

  it('shows field validation errors and keeps a failed request editable', async () => {
    swapsApi.requestSwap.mockRejectedValue({
      response: {
        data: {
          error: 'Validation failed',
          details: [{ field: 'reason', message: 'Reason is too long' }],
        },
      },
    });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Request swap' }));
    await user.selectOptions(screen.getByLabelText('Your course allocation'), 'origin');
    await user.selectOptions(screen.getByLabelText('Swap with'), 'destination');
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reason is too long');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeEnabled();
  });
});
