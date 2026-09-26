import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OnboardingPage from '../src/pages/OnboardingPage';
import { useAuth } from '../src/hooks/useAuth';
import { usersApi } from '../src/api/users';
import { tutorsApi } from '../src/api/tutors';
import { coursesApi } from '../src/api/courses';

vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../src/api/users', () => ({ usersApi: { getCurrentUser: vi.fn(), updateUser: vi.fn() } }));
vi.mock('../src/api/tutors', () => ({
  tutorsApi: { submitMark: vi.fn(), setAvailability: vi.fn() },
}));
vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));

const profile = (overrides = {}) => ({
  id: 'u1',
  role: 'student',
  name: 'Diana',
  yearOfStudy: null,
  availability: [],
  tutorMarks: [],
  onboarding: { complete: false, missing: ['yearOfStudy', 'availability', 'courseMark'] },
  ...overrides,
});

const show = (auth) => {
  useAuth.mockImplementation(() => ({ isLoading: false, ...auth }));
  return render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.resetAllMocks();
  usersApi.getCurrentUser.mockResolvedValue({ data: profile() });
  coursesApi.getCourses.mockResolvedValue({
    data: [{ id: 'c1', code: 'COMS101', name: 'Intro to CS', minMarkRequired: 60 }],
  });
});

describe('Onboarding page', () => {
  it('starts on the year-of-study step and lists everything missing', async () => {
    show({ dbUser: profile(), updateDbUser: vi.fn() });

    expect(await screen.findByText('Welcome to Toodle')).toBeTruthy();
    expect(screen.getByText('What year are you in?')).toBeTruthy();
    const missingChips = within(screen.getByTestId('onboarding-missing'));
    expect(missingChips.getByText('Year of study')).toBeTruthy();
    expect(missingChips.getByText('Availability time')).toBeTruthy();
    expect(missingChips.getByText('Course mark')).toBeTruthy();
  });

  it('moves to the free-time step once a year of study is saved', async () => {
    const user = userEvent.setup();
    const auth = { dbUser: profile(), updateDbUser: vi.fn() };
    auth.updateDbUser.mockImplementation((next) => {
      auth.dbUser = next;
    });
    usersApi.updateUser.mockResolvedValue({});
    usersApi.getCurrentUser.mockResolvedValue({
      data: profile({
        yearOfStudy: 3,
        onboarding: { complete: false, missing: ['availability', 'courseMark'] },
      }),
    });

    const view = show(auth);

    await user.selectOptions(await screen.findByLabelText('Year of study'), '3');
    await user.click(screen.getByRole('button', { name: /Save and continue/i }));

    expect(usersApi.updateUser).toHaveBeenCalledWith('u1', { yearOfStudy: 3 });
    expect(auth.updateDbUser).toHaveBeenCalledWith(expect.objectContaining({ yearOfStudy: 3 }));

    view.rerender(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('When are you free to tutor?')).toBeTruthy();
  });

  it('submits a course mark and offers to add another or finish', async () => {
    const user = userEvent.setup();
    const auth = {
      dbUser: profile({
        yearOfStudy: 3,
        availability: [{ dayOfWeek: 'MONDAY' }],
        onboarding: { complete: false, missing: ['courseMark'] },
      }),
      updateDbUser: vi.fn(),
    };
    auth.updateDbUser.mockImplementation((next) => {
      auth.dbUser = next;
    });
    tutorsApi.submitMark.mockResolvedValue({});
    usersApi.getCurrentUser.mockResolvedValue({
      data: profile({
        yearOfStudy: 3,
        availability: [{ dayOfWeek: 'MONDAY' }],
        tutorMarks: [
          {
            id: 'm1',
            courseId: 'c1',
            mark: 72,
            status: 'PENDING',
            course: { code: 'COMS101', name: 'Intro to CS' },
          },
        ],
        onboarding: { complete: true, missing: [] },
      }),
    });

    show(auth);

    expect(await screen.findByText('Submit a course mark')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Course'), 'c1');
    await user.type(screen.getByLabelText('Final mark (%)'), '72');
    await user.click(screen.getByRole('button', { name: /Submit mark/i }));

    expect(tutorsApi.submitMark).toHaveBeenCalledWith({ courseId: 'c1', mark: 72 });

    expect(await screen.findByText(/Mark submitted for COMS101/)).toBeTruthy();
    expect(screen.getByText('COMS101 — 72%')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add another mark/i })).toBeTruthy();

    // The completed card only appears once the student chooses to finish.
    expect(screen.queryByText("You're all set")).toBeNull();

    await user.click(screen.getByRole('button', { name: /Finish onboarding/i }));

    expect(await screen.findByText("You're all set")).toBeTruthy();
  });

  it('lets a student add marks for more courses before finishing', async () => {
    const user = userEvent.setup();
    coursesApi.getCourses.mockResolvedValue({
      data: [
        { id: 'c1', code: 'COMS101', name: 'Intro to CS', minMarkRequired: 60 },
        { id: 'c2', code: 'COMS102', name: 'Data Structures', minMarkRequired: 60 },
      ],
    });

    const marksFor = (entries) =>
      profile({
        yearOfStudy: 3,
        availability: [{ dayOfWeek: 'MONDAY' }],
        tutorMarks: entries.map(([courseId, mark, code]) => ({
          id: `m-${courseId}`,
          courseId,
          mark,
          status: 'PENDING',
          course: { code, name: 'Course' },
        })),
        onboarding: { complete: true, missing: [] },
      });

    const auth = {
      dbUser: profile({
        yearOfStudy: 3,
        availability: [{ dayOfWeek: 'MONDAY' }],
        onboarding: { complete: false, missing: ['courseMark'] },
      }),
      updateDbUser: vi.fn(),
    };
    auth.updateDbUser.mockImplementation((next) => {
      auth.dbUser = next;
    });
    tutorsApi.submitMark.mockResolvedValue({});
    usersApi.getCurrentUser
      .mockResolvedValueOnce({ data: marksFor([['c1', 72, 'COMS101']]) })
      .mockResolvedValueOnce({
        data: marksFor([
          ['c1', 72, 'COMS101'],
          ['c2', 65, 'COMS102'],
        ]),
      });

    show(auth);

    expect(await screen.findByText('Submit a course mark')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText('Course'), 'c1');
    await user.type(screen.getByLabelText('Final mark (%)'), '72');
    await user.click(screen.getByRole('button', { name: /Submit mark/i }));

    expect(await screen.findByText(/Mark submitted for COMS101/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Add another mark/i }));

    // The first course is no longer offered in the "add another" form.
    const courseSelect = screen.getByLabelText('Course');
    expect(within(courseSelect).queryByText(/COMS101/)).toBeNull();
    expect(within(courseSelect).getByText('COMS102 — Data Structures')).toBeTruthy();

    await user.selectOptions(courseSelect, 'c2');
    await user.type(screen.getByLabelText('Final mark (%)'), '65');
    await user.click(screen.getByRole('button', { name: /Submit mark/i }));

    expect(tutorsApi.submitMark).toHaveBeenLastCalledWith({ courseId: 'c2', mark: 65 });
    expect(await screen.findByText('COMS102 — 65%')).toBeTruthy();
    expect(screen.getByText('COMS101 — 72%')).toBeTruthy();
  });

  it('shows the completed state for an onboarding-complete student', async () => {
    show({
      dbUser: profile({
        yearOfStudy: 3,
        availability: [{ dayOfWeek: 'MONDAY' }],
        tutorMarks: [{ courseId: 'c1', status: 'PENDING' }],
        onboarding: { complete: true, missing: [] },
      }),
      updateDbUser: vi.fn(),
    });

    expect(await screen.findByText("You're all set")).toBeTruthy();
    expect(screen.getByRole('button', { name: /Go to dashboard/i })).toBeTruthy();
  });
});
