/**
 * @file tutors-page.test.jsx
 * @description Failure and recovery behaviour of the tutor directory: a failed
 * mark save is announced, keeps the entered values, and never leaves a stale
 * error behind when another tutor is opened.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorsPage from '../src/pages/TutorsPage';
import { tutorsApi } from '../src/api/tutors';
import { coursesApi } from '../src/api/courses';
import { ratesApi } from '../src/api/rates';
import { useAuth } from '../src/hooks/useAuth';

vi.mock('../src/api/tutors', () => ({
  tutorsApi: { getTutors: vi.fn(), addOrUpdateMark: vi.fn() },
}));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));
vi.mock('../src/api/rates', () => ({
  ratesApi: { getRateHistory: vi.fn(), createRate: vi.fn(), correctRate: vi.fn() },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));

const tutor = {
  id: 't1',
  name: 'Tebogo Tutor',
  email: 'tebogo@test.com',
  tutorMarks: [],
  availability: [],
  allocations: [],
  maxHoursPerWeek: 10,
  currentRate: null,
};

const secondTutor = { ...tutor, id: 't2', name: 'Lerato Lecturer', email: 'lerato@test.com' };

const course = { id: 'c1', code: 'COMS3011A', name: 'SDP' };

beforeEach(() => {
  vi.resetAllMocks();
  tutorsApi.getTutors.mockResolvedValue({ data: [tutor] });
  coursesApi.getCourses.mockResolvedValue({ data: [course] });
  ratesApi.getRateHistory.mockResolvedValue({ data: [] });
  useAuth.mockReturnValue({ isAdmin: true, isLecturer: false });
});

async function openTutor(user, name = 'Tebogo Tutor') {
  await user.click(await screen.findByRole('button', { name: new RegExp(name) }));
  return screen.getByRole('dialog', { name });
}

describe('Tutor detail modal mark entry', () => {
  it('saves a mark and then clears the inputs', async () => {
    tutorsApi.addOrUpdateMark.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<TutorsPage />);

    const dialog = await openTutor(user);
    await user.selectOptions(within(dialog).getByLabelText('Add / update a mark'), 'c1');
    await user.type(within(dialog).getByLabelText('Mark (%)'), '78');
    await user.click(within(dialog).getByRole('button', { name: 'Save mark' }));

    await waitFor(() =>
      expect(tutorsApi.addOrUpdateMark).toHaveBeenCalledWith('t1', { courseId: 'c1', mark: 78 })
    );
    await waitFor(() => expect(within(dialog).getByLabelText('Mark (%)')).toHaveValue(null));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the entered values and shows the API error when saving fails', async () => {
    tutorsApi.addOrUpdateMark.mockRejectedValue({
      response: { data: { error: 'Mark must be between 0 and 100' } },
    });
    const user = userEvent.setup();
    render(<TutorsPage />);

    const dialog = await openTutor(user);
    await user.selectOptions(within(dialog).getByLabelText('Add / update a mark'), 'c1');
    await user.type(within(dialog).getByLabelText('Mark (%)'), '120');
    await user.click(within(dialog).getByRole('button', { name: 'Save mark' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Mark must be between 0 and 100');
    expect(alert).toHaveTextContent(/try again/i);

    // Nothing the staff member typed is lost, and the dialog stays open.
    expect(within(dialog).getByLabelText('Mark (%)')).toHaveValue(120);
    expect(within(dialog).getByLabelText('Add / update a mark')).toHaveValue('c1');
    expect(dialog).toBeInTheDocument();
    expect(tutorsApi.addOrUpdateMark).toHaveBeenCalledTimes(1);
  });

  it('clears a previous failure when another tutor is opened', async () => {
    tutorsApi.getTutors.mockResolvedValue({ data: [tutor, secondTutor] });
    tutorsApi.addOrUpdateMark.mockRejectedValue({
      response: { data: { error: 'Mark must be between 0 and 100' } },
    });
    const user = userEvent.setup();
    render(<TutorsPage />);

    const dialog = await openTutor(user);
    await user.selectOptions(within(dialog).getByLabelText('Add / update a mark'), 'c1');
    await user.type(within(dialog).getByLabelText('Mark (%)'), '120');
    await user.click(within(dialog).getByRole('button', { name: 'Save mark' }));
    await screen.findByRole('alert');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openTutor(user, 'Lerato Lecturer');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mark (%)')).toHaveValue(null);
  });
});

describe('Tutor pay rate', () => {
  it('shows the current rate and history, and admins can add a new forward-dated rate', async () => {
    tutorsApi.getTutors.mockResolvedValue({
      data: [{ ...tutor, currentRate: { rate: 150, effectiveFrom: '2026-01-01' } }],
    });
    ratesApi.getRateHistory.mockResolvedValue({
      data: [{ id: 'r1', rate: 150, effectiveFrom: '2026-01-01', isCorrection: false }],
    });
    ratesApi.createRate.mockResolvedValue({ data: { id: 'r2' } });
    const user = userEvent.setup();
    render(<TutorsPage />);

    const dialog = await openTutor(user);
    expect(within(dialog).getByText(/Current rate: R150.00\/hr since 2026-01-01/)).toBeInTheDocument();
    await waitFor(() => expect(ratesApi.getRateHistory).toHaveBeenCalledWith('t1'));
    expect(within(dialog).getByText(/2026-01-01 — R150.00\/hr/)).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Rate (R / hr)'), '200');
    fireEvent.change(within(dialog).getByLabelText('New rate from'), {
      target: { value: '2026-09-01' },
    });
    await user.click(within(dialog).getByRole('button', { name: /Save new rate/ }));

    await waitFor(() =>
      expect(ratesApi.createRate).toHaveBeenCalledWith('t1', {
        rate: 200,
        effectiveFrom: '2026-09-01',
      })
    );
  });

  it('lets an admin correct a mistaken rate value in place', async () => {
    ratesApi.getRateHistory.mockResolvedValue({
      data: [{ id: 'r1', rate: 150, effectiveFrom: '2026-01-01', isCorrection: false }],
    });
    ratesApi.correctRate.mockResolvedValue({ data: { id: 'r1', rate: 175 } });
    const user = userEvent.setup();
    render(<TutorsPage />);

    const dialog = await openTutor(user);
    await waitFor(() => expect(ratesApi.getRateHistory).toHaveBeenCalled());
    await user.click(within(dialog).getByRole('button', { name: 'Fix' }));

    const correctionInput = within(dialog).getByDisplayValue('150');
    await userEvent.clear(correctionInput);
    await userEvent.type(correctionInput, '175');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(ratesApi.correctRate).toHaveBeenCalledWith('t1', 'r1', { rate: 175 })
    );
  });

  it('hides the pay rate section from a lecturer who does not manage the tutor', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isLecturer: true });
    tutorsApi.getTutors.mockResolvedValue({ data: [{ ...tutor, allocations: [] }] });
    const user = userEvent.setup();
    render(<TutorsPage />);

    const dialog = await openTutor(user);
    expect(within(dialog).queryByText('Pay rate')).not.toBeInTheDocument();
    expect(ratesApi.getRateHistory).not.toHaveBeenCalled();
  });

  it('shows the pay rate section to a lecturer managing the tutor', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isLecturer: true });
    tutorsApi.getTutors.mockResolvedValue({
      data: [{ ...tutor, allocations: [{ id: 'a1', courseId: 'c1' }] }],
    });
    ratesApi.getRateHistory.mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    render(<TutorsPage />);

    const dialog = await openTutor(user);
    expect(within(dialog).getByText('Pay rate')).toBeInTheDocument();
  });
});

describe('Tutor directory load failure', () => {
  it('explains the failure and offers a retry', async () => {
    // Fail the initial load, then let the retry succeed so the promise returned
    // by refetch() is handled (models real recovery, avoids an unhandled rejection).
    tutorsApi.getTutors.mockRejectedValueOnce(new Error('Network Error'));
    const user = userEvent.setup();
    render(<TutorsPage />);

    expect(await screen.findByText("Couldn't load tutors")).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(tutorsApi.getTutors).toHaveBeenCalledTimes(2));
  });
});
