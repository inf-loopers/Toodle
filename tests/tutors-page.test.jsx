/**
 * @file tutors-page.test.jsx
 * @description Failure and recovery behaviour of the tutor directory: a failed
 * mark save is announced, keeps the entered values, and never leaves a stale
 * error behind when another tutor is opened.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorsPage from '../src/pages/TutorsPage';
import { tutorsApi } from '../src/api/tutors';
import { coursesApi } from '../src/api/courses';

vi.mock('../src/api/tutors', () => ({
  tutorsApi: { getTutors: vi.fn(), addOrUpdateMark: vi.fn() },
}));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));

const tutor = {
  id: 't1',
  name: 'Tebogo Tutor',
  email: 'tebogo@test.com',
  tutorMarks: [],
  availability: [],
  maxHoursPerWeek: 10,
};

const secondTutor = { ...tutor, id: 't2', name: 'Lerato Lecturer', email: 'lerato@test.com' };

const course = { id: 'c1', code: 'COMS3011A', name: 'SDP' };

beforeEach(() => {
  vi.resetAllMocks();
  tutorsApi.getTutors.mockResolvedValue({ data: [tutor] });
  coursesApi.getCourses.mockResolvedValue({ data: [course] });
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
