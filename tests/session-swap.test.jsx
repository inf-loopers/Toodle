import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionSwapPage } from '../src/pages/SessionSwapPage';
import { useAuth } from '../src/hooks/useAuth';
import { swapsApi } from '../src/api/swaps';
vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/swaps', () => ({
  swapsApi: Object.fromEntries(
    [
      'getSwaps',
      'getOptions',
      'previewSwap',
      'requestSwap',
      'approveSwap',
      'rejectSwap',
      'cancelSwap',
      'acceptSwap',
      'declineSwap',
      'reverseSwap',
      'getHistory',
    ].map((k) => [k, vi.fn()])
  ),
}));
const origin = {
  id: 'origin',
  allocationId: 'a1',
  sessionId: 's1',
  sessionDate: '2030-01-07',
  userId: 'tutor',
  user: { name: 'Alice' },
  course: { code: 'CSC101' },
  startTime: '09:00',
  endTime: '10:00',
  hours: 1,
  sessionType: 'LAB',
};
const target = {
  ...origin,
  id: 'target',
  allocationId: 'a2',
  sessionId: 's2',
  userId: 'target',
  user: { name: 'Bob' },
  sessionDate: '2030-01-08',
  startTime: '11:00',
  endTime: '12:00',
};
const pending = {
  id: 'swap',
  status: 'PENDING',
  requesterId: 'tutor',
  requesteeId: 'target',
  requester: { name: 'Alice' },
  requestee: { name: 'Bob' },
  requesterOccurrence: origin,
  targetOccurrence: target,
  requesteeAcceptedAt: null,
};
const suitable = {
  isValid: true,
  requester: { warnings: [], weeklyHours: [{ week: '2030-01-07', hours: 5, remainingHours: 1 }] },
  requestee: { warnings: [], weeklyHours: [] },
};
beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ dbUser: { id: 'tutor' }, isTutor: true, isStaff: false });
  swapsApi.getSwaps.mockResolvedValue({ data: [pending] });
  swapsApi.getOptions.mockResolvedValue({ data: [origin, target] });
  swapsApi.previewSwap.mockResolvedValue({ data: suitable });
  swapsApi.requestSwap.mockResolvedValue({});
  swapsApi.getHistory.mockResolvedValue({ data: [] });
});
async function choose() {
  const user = userEvent.setup();
  render(<SessionSwapPage />);
  await user.click(await screen.findByRole('button', { name: 'Request swap' }));
  await user.selectOptions(screen.getByLabelText('Your session'), 'origin');
  await user.selectOptions(screen.getByLabelText('Other tutor’s session'), 'target');
  return user;
}
describe('Dated session swap interface', () => {
  it('previews both sides and submits dated session IDs within the same course', async () => {
    const user = await choose();
    await screen.findByText('Both tutors can take these sessions.');
    expect(screen.getByText('Week of 2030-01-07: 5h planned · 1h remaining')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(swapsApi.requestSwap).toHaveBeenCalledWith({
      requesterAllocationId: 'a1',
      targetAllocationId: 'a2',
      requesterSessionId: 's1',
      targetSessionId: 's2',
      requesterSessionDate: '2030-01-07',
      targetSessionDate: '2030-01-08',
      reason: '',
    });
  });
  it('shows eligibility problems before submission and blocks sending', async () => {
    swapsApi.previewSwap.mockResolvedValue({
      data: {
        ...suitable,
        isValid: false,
        requestee: { warnings: [{ message: 'Bob has a timetable clash' }], weeklyHours: [] },
      },
    });
    await choose();
    await screen.findByText('Bob has a timetable clash');
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
    expect(swapsApi.requestSwap).not.toHaveBeenCalled();
  });
  it('does not enable submission while preview is still pending', async () => {
    let resolve;
    swapsApi.previewSwap.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    await choose();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
    resolve({ data: suitable });
    await screen.findByText('Both tutors can take these sessions.');
    expect(screen.getByRole('button', { name: 'Send request' })).toBeEnabled();
  });
  it('refreshes stale choices after a conflicting submission', async () => {
    swapsApi.requestSwap.mockRejectedValue({
      response: { status: 409, data: { error: 'Session already covered' } },
    });
    const user = await choose();
    await screen.findByText('Both tutors can take these sessions.');
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await screen.findByText('Session already covered');
    await waitFor(() => expect(screen.getByLabelText('Your session')).toHaveValue(''));
    expect(swapsApi.getOptions.mock.calls.length).toBeGreaterThan(2);
  });
  it('accepts without applying assignments and refreshes the waiting state', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'target' }, isTutor: true, isStaff: false });
    swapsApi.getSwaps
      .mockResolvedValueOnce({ data: [pending] })
      .mockResolvedValue({ data: [{ ...pending, requesteeAcceptedAt: '2030-01-01' }] });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Accept swap' }));
    expect(swapsApi.acceptSwap).toHaveBeenCalledWith('swap');
    await screen.findByText('Tutor accepted · awaiting organiser');
    expect(swapsApi.approveSwap).not.toHaveBeenCalled();
  });
  it('requires consent before staff approval', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'staff' }, isStaff: true, isTutor: false });
    render(<SessionSwapPage />);
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(swapsApi.getOptions).not.toHaveBeenCalled();
  });
  it('collects staff rejection reasons', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'staff' }, isStaff: true, isTutor: false });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await user.type(screen.getByLabelText('Reason'), 'Course needs continuity');
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(swapsApi.rejectSwap).toHaveBeenCalledWith('swap', 'Course needs continuity');
  });
  it('requires and sends a reason for reversal', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'staff' }, isStaff: true, isTutor: false });
    swapsApi.getSwaps.mockResolvedValue({ data: [{ ...pending, status: 'APPROVED' }] });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'Reverse swap' }));
    expect(screen.getByRole('button', { name: 'Confirm reversal' })).toBeDisabled();
    await user.type(screen.getByLabelText('Reason'), 'Plans restored');
    await user.click(screen.getByRole('button', { name: 'Confirm reversal' }));
    expect(swapsApi.reverseSwap).toHaveBeenCalledWith('swap', 'Plans restored');
  });
  it('shows who reviewed each historical transition', async () => {
    swapsApi.getHistory.mockResolvedValue({
      data: [
        {
          id: 'audit',
          action: 'APPROVE',
          user: { name: 'Coordinator' },
          createdAt: '2030-01-01T07:00:00Z',
          after: { status: 'APPROVED' },
        },
      ],
    });
    const user = userEvent.setup();
    render(<SessionSwapPage />);
    await user.click(await screen.findByRole('button', { name: 'View history' }));
    await screen.findByText('Swap approved · Coordinator');
  });
  it('keeps legacy course requests visible but prevents session approval', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'staff' }, isStaff: true, isTutor: false });
    swapsApi.getSwaps.mockResolvedValue({
      data: [{ ...pending, requesterOccurrence: null, requesteeAcceptedAt: '2030-01-01' }],
    });
    render(<SessionSwapPage />);
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByText(/Historical course swap/)).toBeInTheDocument();
  });
  it('keeps a failed preview unsendable and shows the API error', async () => {
    swapsApi.previewSwap.mockRejectedValue({ response: { data: { error: 'Session changed' } } });
    await choose();
    await screen.findByText('Session changed');
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
  });
});
