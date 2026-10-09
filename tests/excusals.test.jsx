import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExcusalsPage from '../src/pages/ExcusalsPage';
import { useAuth } from '../src/hooks/useAuth';
import { excusalsApi } from '../src/api/excusals';
import { tutorsApi } from '../src/api/tutors';
import { coursesApi } from '../src/api/courses';
import { swapsApi } from '../src/api/swaps';
vi.mock('../src/api/swaps', () => ({ swapsApi: { getCoverage: vi.fn() } }));

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/excusals', () => ({
  excusalsApi: { getExcusals: vi.fn(), requestExcusal: vi.fn() },
}));
vi.mock('../src/api/tutors', () => ({ tutorsApi: { getTutor: vi.fn() } }));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourseSessions: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  swapsApi.getCoverage.mockResolvedValue({ data: [] });
  useAuth.mockReturnValue({ dbUser: { id: 'u1' }, isTutor: true, isStaff: false });
  excusalsApi.getExcusals.mockResolvedValue({ data: [] });
  excusalsApi.requestExcusal.mockResolvedValue({ data: {} });
  tutorsApi.getTutor.mockResolvedValue({
    data: {
      allocations: [
        {
          id: 'a1',
          userId: 'u1',
          courseId: 'c1',
          status: 'ACTIVE',
          isLocked: true,
          course: { code: 'CS101' },
        },
      ],
    },
  });
  coursesApi.getCourseSessions.mockResolvedValue({
    data: [
      { id: 's1', dayOfWeek: 'THURSDAY', startTime: '09:00', endTime: '10:30', sessionType: 'LAB' },
    ],
  });
});

describe('excusal occurrence form', () => {
  it('submits a scheduled session and date without converting the date to a timestamp', async () => {
    const user = userEvent.setup();
    render(<ExcusalsPage />);
    await user.click(await screen.findByRole('button', { name: 'Request excusal' }));
    await user.selectOptions(screen.getByLabelText('Course'), 'a1');
    await screen.findByRole('option', { name: /Thursday 09:00/ });
    await user.selectOptions(screen.getByLabelText('Session'), 's1');
    const dateSelect = screen.getByLabelText('Date');
    const firstDate = [...dateSelect.options].map((option) => option.value).find(Boolean);
    expect(firstDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await user.selectOptions(dateSelect, firstDate);
    await user.type(screen.getByLabelText('Reason'), 'Appointment');
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() =>
      expect(excusalsApi.requestExcusal).toHaveBeenCalledWith({
        allocationId: 'a1',
        sessionId: 's1',
        sessionDate: firstDate,
        reason: 'Appointment',
      })
    );
  });
  it('displays the original reason, review reason and resolved timestamp separately', async () => {
    excusalsApi.getExcusals.mockResolvedValue({
      data: [
        {
          id: 'e1',
          status: 'DECLINED',
          sessionDate: '2026-10-01',
          reason: 'Appointment',
          reviewReason: 'Short notice',
          sessionStartTime: '09:00',
          sessionEndTime: '10:30',
          reviewedBy: { name: 'Coordinator' },
          resolvedAt: '2026-09-28T07:00:00Z',
        },
      ],
    });
    render(<ExcusalsPage />);
    expect(await screen.findByText('Appointment')).toBeInTheDocument();
    expect(screen.getByText('Short notice')).toBeInTheDocument();
    expect(screen.getByText(/Declined by Coordinator/)).toHaveTextContent('09:00');
    expect(screen.getByText(/09:00–10:30 · .*1 Oct 2026/)).toBeInTheDocument();
  });
});
