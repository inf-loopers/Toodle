import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProfilePage from '../src/pages/ProfilePage';

const { auth, usersApi, tutorsApi } = vi.hoisted(() => ({
  auth: {
    user: { name: 'Ada Admin', email: 'ada@example.com' },
    dbUser: { id: 'u1', name: 'Ada Admin', email: 'ada@example.com', role: 'ADMIN' },
    role: 'admin',
    updateDbUser: vi.fn(),
    logout: vi.fn(),
  },
  usersApi: {
    getCurrentUser: vi.fn(),
    deleteCurrentUser: vi.fn(),
    updateUser: vi.fn(),
    updateAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
  },
  tutorsApi: { setAvailability: vi.fn() },
}));

vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../src/api/users', () => ({ usersApi }));
vi.mock('../src/api/tutors', () => ({ tutorsApi }));

const PROFILE = {
  success: true,
  data: { id: 'u1', name: 'Ada Admin', email: 'ada@example.com', role: 'ADMIN' },
};

beforeEach(() => {
  vi.clearAllMocks();
  usersApi.getCurrentUser.mockResolvedValue(PROFILE);
  usersApi.deleteCurrentUser.mockResolvedValue({ success: true });
});

async function openDeleteDialog() {
  fireEvent.click(await screen.findByRole('button', { name: /Delete account/i }));
  return screen.getByRole('dialog', { name: 'Delete your account?' });
}

test('shows a danger zone that opens the deletion confirmation dialog', async () => {
  render(<ProfilePage />);

  expect(await screen.findByRole('button', { name: /Delete account/i })).toBeInTheDocument();

  const dialog = await openDeleteDialog();
  expect(
    within(dialog).getByText(/Your account and Auth0 sign-in are deleted/i)
  ).toBeInTheDocument();
  // The destructive action is locked until the email is confirmed.
  expect(within(dialog).getByRole('button', { name: /Delete permanently/i })).toBeDisabled();
});

test('deletes the account then signs out once the email is confirmed', async () => {
  render(<ProfilePage />);
  const dialog = await openDeleteDialog();

  fireEvent.change(within(dialog).getByLabelText(/Type your email/i), {
    target: { value: 'ada@example.com' },
  });

  const confirm = within(dialog).getByRole('button', { name: /Delete permanently/i });
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);

  await waitFor(() => expect(usersApi.deleteCurrentUser).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
});

test('surfaces the failure and keeps the dialog open without signing out', async () => {
  usersApi.deleteCurrentUser.mockRejectedValueOnce({
    response: { data: { error: 'Account closure is temporarily unavailable.' } },
  });

  render(<ProfilePage />);
  const dialog = await openDeleteDialog();

  fireEvent.change(within(dialog).getByLabelText(/Type your email/i), {
    target: { value: 'ada@example.com' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: /Delete permanently/i }));

  const alert = await within(dialog).findByRole('alert');
  expect(alert).toHaveTextContent('Account closure is temporarily unavailable.');
  expect(auth.logout).not.toHaveBeenCalled();
  // The dialog is still present so the user can retry.
  expect(screen.getByRole('dialog', { name: 'Delete your account?' })).toBeInTheDocument();
});
