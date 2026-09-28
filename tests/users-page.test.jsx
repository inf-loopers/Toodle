import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import UsersPage from '../src/pages/UsersPage';

const { auth, usersApi } = vi.hoisted(() => ({
  auth: { dbUser: { id: 'admin-1', name: 'Ada Admin', email: 'ada@example.com', role: 'ADMIN' } },
  usersApi: { getUsers: vi.fn(), updateUser: vi.fn() },
}));

vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../src/api/users', () => ({ usersApi }));

const USERS = [
  { id: 'admin-1', name: 'Ada Admin', email: 'ada@example.com', role: 'ADMIN' },
  { id: 'lec-1', name: 'Leroy Lecturer', email: 'leroy@example.com', role: 'LECTURER' },
  { id: 'tut-1', name: 'Tessa Tutor', email: 'tessa@example.com', role: 'TUTOR' },
  { id: 'stu-1', name: 'Sam Student', email: 'sam@example.com', role: 'STUDENT' },
];

beforeEach(() => {
  vi.clearAllMocks();
  usersApi.getUsers.mockResolvedValue({ success: true, data: USERS });
  usersApi.updateUser.mockResolvedValue({ success: true, data: {} });
});

function changeRoleButtonFor(name) {
  const row = screen.getByText(name).closest('li');
  return within(row).getByRole('button', { name: 'Change role' });
}

test('lists every user with their role, and hides the action on the admin\'s own row', async () => {
  render(<UsersPage />);

  expect(await screen.findByText('Ada Admin')).toBeInTheDocument();
  expect(screen.getByText('Leroy Lecturer')).toBeInTheDocument();
  expect(screen.getByText('Tessa Tutor')).toBeInTheDocument();
  expect(screen.getByText('Sam Student')).toBeInTheDocument();
  expect(screen.getByText('Lecturer (Course Coordinator)')).toBeInTheDocument();
  expect(screen.getByText('(you)')).toBeInTheDocument();

  // Three change-role actions: every row except the signed-in admin's own.
  expect(screen.getAllByRole('button', { name: 'Change role' })).toHaveLength(3);
  expect(screen.getByTitle('You cannot change your own role')).toBeInTheDocument();
});

test('filters users by search text and by role chip', async () => {
  render(<UsersPage />);
  await screen.findByText('Ada Admin');

  fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'sam' } });
  expect(screen.getByText('Sam Student')).toBeInTheDocument();
  expect(screen.queryByText('Leroy Lecturer')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Search users'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /^Tutor \(1\)$/ }));
  expect(screen.getByText('Tessa Tutor')).toBeInTheDocument();
  expect(screen.queryByText('Sam Student')).not.toBeInTheDocument();
});

test('changes a user\'s role, warns about consequences, and refreshes the list', async () => {
  render(<UsersPage />);
  await screen.findByText('Tessa Tutor');

  fireEvent.click(changeRoleButtonFor('Tessa Tutor'));
  expect(screen.getByRole('heading', { name: 'Change role' })).toBeInTheDocument();

  // Unchanged selection cannot be saved.
  expect(screen.getByRole('button', { name: 'Save role' })).toBeDisabled();

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });
  expect(
    screen.getByText(/Admins can manage users, courses and allocations/),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Save role' }));

  await waitFor(() =>
    expect(usersApi.updateUser).toHaveBeenCalledWith('tut-1', { role: 'ADMIN' }),
  );
  // Initial load + refetch after the successful change.
  expect(usersApi.getUsers).toHaveBeenCalledTimes(2);
});

test('surfaces the server conflict message when the change is refused', async () => {
  usersApi.updateUser.mockRejectedValue({
    response: { data: { error: 'At least one administrator account must remain.' } },
  });

  render(<UsersPage />);
  await screen.findByText('Leroy Lecturer');

  fireEvent.click(changeRoleButtonFor('Leroy Lecturer'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'student' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save role' }));

  expect(
    await screen.findByText('At least one administrator account must remain.'),
  ).toBeInTheDocument();
  // No refetch after a failed change.
  expect(usersApi.getUsers).toHaveBeenCalledTimes(1);
});
