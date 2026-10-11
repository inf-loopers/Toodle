import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AccountClosurePanel from '../src/components/AccountClosurePanel';

const { usersApi } = vi.hoisted(() => ({
  usersApi: { getAccountClosure: vi.fn(), closeCurrentAccount: vi.fn() },
}));
vi.mock('../src/api/users', () => ({ usersApi }));
const logout = vi.fn();
const active = { accountStatus: 'ACTIVE', canClose: true, blockers: [] };
const closed = { accountStatus: 'CLOSED', cleanupPending: false, signInRemovalPending: false };

beforeEach(() => {
  vi.resetAllMocks();
  usersApi.getAccountClosure.mockResolvedValue({ data: active });
  usersApi.closeCurrentAccount.mockResolvedValue({ data: closed });
});

async function open() {
  render(
    <MemoryRouter>
      <AccountClosurePanel email="ada@example.test" logout={logout} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close account' }));
  const dialog = screen.getByRole('dialog', { name: 'Close your account?' });
  await waitFor(() =>
    expect(within(dialog).queryByText('Checking outstanding work…')).not.toBeInTheDocument()
  );
  return dialog;
}
function confirm(dialog) {
  fireEvent.change(within(dialog).getByLabelText(/Type your email/), {
    target: { value: 'ada@example.test' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close permanently' }));
}

test('discloses retained history and requires confirmation after the preflight check', async () => {
  const dialog = await open();
  expect(
    within(dialog).getByText(/Historical records and their existing snapshots/)
  ).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'Close permanently' })).toBeDisabled();
  confirm(dialog);
  await screen.findByRole('dialog', { name: 'Account access closed' });
  expect(usersApi.closeCurrentAccount).toHaveBeenCalledWith('ada@example.test');
  expect(logout).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(logout).toHaveBeenCalledTimes(1);
});

test('shows actionable blockers and prevents closure while outstanding work remains', async () => {
  usersApi.getAccountClosure.mockResolvedValue({
    data: {
      ...active,
      canClose: false,
      blockers: [{ code: 'WORK', message: 'Resolve your upcoming swap duties.', href: '/swaps' }],
    },
  });
  const dialog = await open();
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Resolve your upcoming swap duties.');
  expect(within(dialog).getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/swaps');
  confirm(dialog);
  expect(usersApi.closeCurrentAccount).not.toHaveBeenCalled();
});

test('reports pending provider removal honestly while explaining that access is blocked', async () => {
  usersApi.closeCurrentAccount.mockResolvedValue({
    data: { accountStatus: 'CLOSING', cleanupPending: true, signInRemovalPending: true },
  });
  confirm(await open());
  const dialog = await screen.findByRole('dialog', { name: 'Account access closed' });
  expect(within(dialog).getByRole('status')).toHaveTextContent('Sign-in removal is pending.');
  expect(within(dialog).getByRole('status')).toHaveTextContent('account stays closed');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('dialog', { name: 'Account access closed' })).toBeInTheDocument();
});

test('recovers a lost success response by checking durable status before offering a retry', async () => {
  const dialog = await open();
  usersApi.closeCurrentAccount.mockRejectedValue(new Error('Network lost'));
  usersApi.getAccountClosure.mockResolvedValue({ data: closed });
  confirm(dialog);
  await screen.findByRole('dialog', { name: 'Account access closed' });
  expect(logout).not.toHaveBeenCalled();
});

test('keeps confirmation input after a failed request and does not claim closure', async () => {
  const dialog = await open();
  usersApi.closeCurrentAccount.mockRejectedValue({
    response: { data: { error: 'Resolve your timesheets first.' } },
  });
  confirm(dialog);
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Resolve your timesheets first.'
  );
  expect(within(dialog).getByLabelText(/Type your email/)).toHaveValue('ada@example.test');
  expect(logout).not.toHaveBeenCalled();
});

test('cannot submit when the preflight request fails', async () => {
  usersApi.getAccountClosure.mockRejectedValue(new Error('Unavailable'));
  const dialog = await open();
  confirm(dialog);
  expect(usersApi.closeCurrentAccount).not.toHaveBeenCalled();
  expect(within(dialog).getByRole('button', { name: 'Close permanently' })).toBeDisabled();
});

test('shows persisted closure status when a previous request already closed the account', async () => {
  usersApi.getAccountClosure.mockResolvedValue({ data: closed });
  render(
    <MemoryRouter>
      <AccountClosurePanel email="ada@example.test" logout={logout} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close account' }));
  await screen.findByRole('dialog', { name: 'Account access closed' });
  expect(usersApi.closeCurrentAccount).not.toHaveBeenCalled();
});
