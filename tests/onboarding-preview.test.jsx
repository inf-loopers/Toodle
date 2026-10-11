import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OnboardingPreviewPage from '../src/pages/OnboardingPreviewPage';

const { auth, usersApi, tutorsApi, staffApi, coursesApi } = vi.hoisted(() => ({
  auth: {},
  usersApi: { updateUser: vi.fn(), getCurrentUser: vi.fn(), deleteCurrentUser: vi.fn() },
  tutorsApi: { submitMark: vi.fn(), setAvailability: vi.fn() },
  staffApi: { complete: vi.fn() },
  coursesApi: { getCourses: vi.fn() },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../src/api/users', () => ({ usersApi }));
vi.mock('../src/api/tutors', () => ({ tutorsApi }));
vi.mock('../src/api/staffAccess', () => ({ staffAccessApi: staffApi }));
vi.mock('../src/api/courses', () => ({ coursesApi }));

const existingAccount = {
  id: 'real-tutor',
  role: 'TUTOR',
  name: 'Sam',
  email: 'sam@example.edu',
  yearOfStudy: 3,
  availability: [{ dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '12:00' }],
  tutorMarks: [{ id: 'real-mark', courseId: 'real-course', mark: 90, status: 'VERIFIED' }],
  onboarding: { complete: true, missing: [] },
  staffWelcomeRequired: false,
  allocations: [{ id: 'real-allocation' }],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DEV', true);
  Object.assign(auth, {
    isLoading: false,
    dbUser: structuredClone(existingAccount),
    updateDbUser: vi.fn(),
    logout: vi.fn(),
  });
});
afterEach(() => {
  // Every scenario must preserve both the saved profile and real auth context.
  expect(auth.dbUser).toEqual(existingAccount);
  expect(auth.updateDbUser).not.toHaveBeenCalled();
  expect(auth.logout).not.toHaveBeenCalled();
  for (const api of [usersApi, tutorsApi, staffApi, coursesApi]) {
    for (const method of Object.values(api)) expect(method).not.toHaveBeenCalled();
  }
  vi.unstubAllEnvs();
});

function show() {
  render(
    <MemoryRouter initialEntries={['/onboarding-preview']}>
      <Routes>
        <Route path="/onboarding-preview" element={<OnboardingPreviewPage />} />
        <Route path="/profile" element={<p>Actual profile destination</p>} />
      </Routes>
    </MemoryRouter>
  );
  return userEvent.setup();
}

describe('Local onboarding preview', () => {
  it('replays the entire student flow for a completed tutor account without saving anything', async () => {
    const user = show();
    expect(screen.getByText(/Your signed-in role is TUTOR/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Year of study'), '2');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    await user.click(screen.getByRole('button', { name: 'Add slot' }));
    await user.click(screen.getByRole('button', { name: 'Save free time' }));
    await user.selectOptions(screen.getByLabelText('Course'), 'preview-course');
    await user.type(screen.getByLabelText('Final mark (%)'), '75');
    await user.click(screen.getByRole('button', { name: 'Submit mark' }));
    expect(screen.getByText('Pending')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Finish onboarding' }));
    expect(screen.getByText("You're all set")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to dashboard' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'A real student account would now open the dashboard'
    );
    await user.click(screen.getByRole('button', { name: 'Restart preview' }));
    expect(screen.getByLabelText('Year of study')).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows staff onboarding, including both lecturer assignment states, without student academic steps', async () => {
    const user = show();
    await user.selectOptions(screen.getByLabelText('Preview role'), 'LECTURER');
    expect(
      screen.getByRole('heading', { name: 'Welcome to Toodle, Lecturer' })
    ).toBeInTheDocument();
    expect(screen.getByText(/An administrator needs to assign your courses/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Final mark (%)')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Include a sample assigned course'));
    expect(screen.getByText(/COMS101.*Example introductory course/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save and open guided help' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'A real lecturer account would now open guided help'
    );
    await user.selectOptions(screen.getByLabelText('Preview role'), 'ADMIN');
    expect(
      screen.getByRole('heading', { name: 'Welcome to Toodle, Administrator' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Open Users to invite staff/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save and go to dashboard' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'A real admin account would now open the dashboard'
    );
  });

  it('resets staff form edits and local completion when restarting', async () => {
    const user = show();
    await user.selectOptions(screen.getByLabelText('Preview role'), 'ADMIN');
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Temporary name');
    await user.click(screen.getByRole('button', { name: 'Save and go to dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Restart preview' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Sam');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Exit preview' }));
    expect(screen.getByText('Actual profile destination')).toBeInTheDocument();
  });

  it('refuses to render the preview outside development', () => {
    vi.stubEnv('DEV', false);
    show();
    expect(screen.getByText('Actual profile destination')).toBeInTheDocument();
    expect(screen.queryByLabelText('Preview role')).not.toBeInTheDocument();
  });
});
