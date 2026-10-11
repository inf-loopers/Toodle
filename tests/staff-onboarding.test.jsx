import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OnboardingGate from '../src/components/auth/OnboardingGate';
import StaffAccessPage from '../src/pages/StaffAccessPage';
import StaffWelcomePage from '../src/pages/StaffWelcomePage';
import StaffAccessManagement from '../src/components/StaffAccessManagement';
const { auth, staffApi, usersApi, coursesApi } = vi.hoisted(() => ({
  auth: {},
  staffApi: {
    request: vi.fn(),
    cancel: vi.fn(),
    complete: vi.fn(),
    list: vi.fn(),
    invite: vi.fn(),
    review: vi.fn(),
    revoke: vi.fn(),
  },
  usersApi: { getCurrentUser: vi.fn(), syncUser: vi.fn() },
  coursesApi: { getCourses: vi.fn() },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../src/api/staffAccess', () => ({ staffAccessApi: staffApi }));
vi.mock('../src/api/users', () => ({ usersApi }));
vi.mock('../src/api/courses', () => ({ coursesApi }));
const student = {
  id: 'student',
  role: 'STUDENT',
  name: 'Sam',
  email: 'sam@example.edu',
  emailVerified: true,
  onboarding: { missing: ['yearOfStudy', 'availability', 'courseMark'] },
};
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(auth, {
    isLoading: false,
    role: 'student',
    dbUser: { ...student },
    updateDbUser: vi.fn(),
    logout: vi.fn(),
  });
  staffApi.list.mockResolvedValue({ data: { requests: [], invitations: [] } });
  coursesApi.getCourses.mockResolvedValue({
    data: [{ id: 'c1', code: 'COMS101', name: 'Introduction' }],
  });
  usersApi.getCurrentUser.mockResolvedValue({ data: student });
});
function gateAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<OnboardingGate />}>
          <Route path="/dashboard" element={<p>Dashboard destination</p>} />
          <Route path="/onboarding" element={<p>Student destination</p>} />
          <Route path="/staff-welcome" element={<p>Staff welcome destination</p>} />
        </Route>
        <Route path="/staff-access" element={<p>Staff request destination</p>} />
      </Routes>
    </MemoryRouter>
  );
}
it('keeps pending staff applicants out of the student marks flow', () => {
  auth.dbUser.staffAccessRequest = { status: 'PENDING' };
  gateAt('/dashboard');
  expect(screen.getByText('Staff request destination')).toBeInTheDocument();
  expect(screen.queryByText('Student destination')).not.toBeInTheDocument();
});
it('opens the staff welcome guide for newly approved lecturers', () => {
  auth.role = 'lecturer';
  auth.dbUser = { role: 'LECTURER', staffWelcomeRequired: true };
  gateAt('/dashboard');
  expect(screen.getByText('Staff welcome destination')).toBeInTheDocument();
});
it('does not interrupt staff who already completed their welcome guide', () => {
  auth.role = 'admin';
  auth.dbUser = { role: 'ADMIN', staffWelcomeRequired: false };
  gateAt('/dashboard');
  expect(screen.getByText('Dashboard destination')).toBeInTheDocument();
});
it('submits a staff request without requiring student academic details', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <StaffAccessPage />
    </MemoryRouter>
  );
  await user.type(
    screen.getByLabelText('Department and reason for access'),
    'Computer science lecturer'
  );
  await user.click(screen.getByRole('button', { name: 'Submit staff request' }));
  expect(staffApi.request).toHaveBeenCalledWith({
    requestedRole: 'LECTURER',
    reason: 'Computer science lecturer',
  });
  expect(
    await screen.findByText('Your request has been sent to administrators.')
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Final mark (%)')).not.toBeInTheDocument();
});
it('refreshes approved access from the pending request screen', async () => {
  const user = userEvent.setup();
  auth.dbUser.staffAccessRequest = { status: 'PENDING', requestedRole: 'LECTURER' };
  const approved = { ...student, role: 'LECTURER', staffWelcomeRequired: true };
  usersApi.getCurrentUser.mockResolvedValue({ data: approved });
  render(
    <MemoryRouter>
      <StaffAccessPage />
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: 'Check access status' }));
  expect(auth.updateDbUser).toHaveBeenCalledWith(approved);
  expect(usersApi.syncUser).toHaveBeenCalledWith({});
});
it('explains missing lecturer assignments and persists welcome completion', async () => {
  const user = userEvent.setup();
  auth.dbUser = {
    ...student,
    role: 'LECTURER',
    staffWelcomeRequired: true,
    coordinatedCourses: [],
  };
  render(
    <MemoryRouter>
      <StaffWelcomePage />
    </MemoryRouter>
  );
  expect(screen.getByText(/An administrator needs to assign your courses/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save and go to dashboard' }));
  expect(staffApi.complete).toHaveBeenCalledWith({ role: 'LECTURER', name: 'Sam' });
});
it('offers an administrator welcome flow without academic fields', () => {
  auth.dbUser = { ...student, role: 'ADMIN' };
  render(
    <MemoryRouter>
      <StaffWelcomePage />
    </MemoryRouter>
  );
  expect(
    screen.getByRole('heading', { name: 'Welcome to Toodle, Administrator' })
  ).toBeInTheDocument();
  expect(screen.getByText(/Open Users to invite staff/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Final mark (%)')).not.toBeInTheDocument();
});
it('reports an unsent invitation accurately and lets the admin assign courses', async () => {
  const user = userEvent.setup();
  const changed = vi.fn();
  staffApi.invite.mockResolvedValue({
    data: {
      invitation: { email: 'lecturer@example.edu' },
      email: { status: 'SKIPPED' },
      loginUrl: 'https://example.edu/login',
    },
  });
  render(
    <MemoryRouter>
      <StaffAccessManagement onUsersChanged={changed} />
    </MemoryRouter>
  );
  await screen.findByText('No staff requests awaiting review.');
  await user.click(screen.getByRole('button', { name: 'Invite staff' }));
  await user.type(screen.getByLabelText('Institutional email'), 'lecturer@example.edu');
  await user.click(screen.getByLabelText('COMS101 — Introduction'));
  await user.click(screen.getByRole('button', { name: 'Send invitation' }));
  expect(staffApi.invite).toHaveBeenCalledWith({
    email: 'lecturer@example.edu',
    role: 'LECTURER',
    courseIds: ['c1'],
  });
  expect(await screen.findByText(/email delivery is not configured/)).toBeInTheDocument();
  expect(changed).toHaveBeenCalled();
});
it('shows admin request review and passes the approved role with a decision reason', async () => {
  const user = userEvent.setup();
  staffApi.list.mockResolvedValue({
    data: {
      invitations: [],
      requests: [
        { id: 'r1', requestedRole: 'ADMIN', reason: 'Department staff', user: { ...student } },
      ],
    },
  });
  render(
    <MemoryRouter>
      <StaffAccessManagement onUsersChanged={vi.fn()} />
    </MemoryRouter>
  );
  await user.click(await screen.findByRole('button', { name: 'Review staff request' }));
  await user.selectOptions(screen.getByLabelText('Staff role'), 'LECTURER');
  await user.type(screen.getByLabelText('Decision reason'), 'Confirmed lecturer identity');
  await user.click(screen.getByRole('button', { name: 'Approve staff access' }));
  expect(staffApi.review).toHaveBeenCalledWith('r1', {
    status: 'APPROVED',
    role: 'LECTURER',
    courseIds: [],
    reviewReason: 'Confirmed lecturer identity',
  });
});
