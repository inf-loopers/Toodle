import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import RegisterAgainPage from '../src/pages/RegisterAgainPage';

const mocks = vi.hoisted(() => ({
  auth: {},
  getIdTokenClaims: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  updateDbUser: vi.fn(),
  api: { getAccountClosure: vi.fn(), registerAgain: vi.fn(), getCurrentUser: vi.fn() },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({ getIdTokenClaims: mocks.getIdTokenClaims }),
}));
vi.mock('../src/api/users', () => ({ usersApi: mocks.api }));

beforeEach(() => {
  vi.resetAllMocks();
  const now = Math.floor(Date.now() / 1000);
  mocks.auth = {
    isAuthenticated: true,
    isLoading: false,
    user: { sub: 'google-oauth2|old', email: 'returning@example.test' },
    login: mocks.login,
    logout: mocks.logout,
    updateDbUser: mocks.updateDbUser,
  };
  mocks.api.getAccountClosure.mockResolvedValue({
    data: {
      accountStatus: 'CLOSED',
      canRegisterAgain: true,
      registrationAfter: new Date((now - 120) * 1000).toISOString(),
    },
  });
  mocks.getIdTokenClaims.mockResolvedValue({ __raw: 'verified-by-server', auth_time: now });
  mocks.api.registerAgain.mockResolvedValue({ data: { id: 'new-user' } });
  mocks.api.getCurrentUser.mockResolvedValue({
    data: { id: 'new-user', role: 'STUDENT', onboarding: { complete: false } },
  });
});
function open() {
  render(
    <MemoryRouter initialEntries={['/register-again']}>
      <Routes>
        <Route path="/register-again" element={<RegisterAgainPage />} />
        <Route path="/dashboard" element={<p>Continue to onboarding</p>} />
      </Routes>
    </MemoryRouter>
  );
}
async function fill() {
  const email = await screen.findByLabelText('Type your sign-in email to confirm');
  fireEvent.change(email, { target: { value: 'returning@example.test' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

test('requires consent and matching email before creating a fresh student account', async () => {
  open();
  const input = await screen.findByLabelText('Type your sign-in email to confirm');
  const button = screen.getByRole('button', { name: 'Create new Student account' });
  expect(button).toBeDisabled();
  fireEvent.change(input, { target: { value: 'other@example.test' } });
  fireEvent.click(screen.getByRole('checkbox'));
  expect(button).toBeDisabled();
  fireEvent.change(input, { target: { value: 'returning@example.test' } });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await screen.findByText('Continue to onboarding');
  expect(mocks.api.registerAgain).toHaveBeenCalledWith(
    'returning@example.test',
    'verified-by-server'
  );
  expect(mocks.updateDbUser).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'new-user', role: 'student' })
  );
});

test('requires a new Auth0 login when the session predates closure', async () => {
  mocks.getIdTokenClaims.mockResolvedValue({ __raw: 'old', auth_time: 1 });
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in again to continue' }));
  expect(mocks.login).toHaveBeenCalledWith({
    appState: { returnTo: '/register-again' },
    authorizationParams: {
      prompt: 'login',
      max_age: 0,
      connection: 'google-oauth2',
      login_hint: 'returning@example.test',
    },
  });
  expect(mocks.api.registerAgain).not.toHaveBeenCalled();
});

test('blocks registration while cleanup remains pending', async () => {
  mocks.api.getAccountClosure.mockResolvedValue({
    data: { accountStatus: 'CLOSING', canRegisterAgain: false },
  });
  open();
  expect(await screen.findByRole('status')).toHaveTextContent('Account cleanup is still pending');
  expect(
    screen.queryByRole('button', { name: 'Create new Student account' })
  ).not.toBeInTheDocument();
  expect(mocks.api.registerAgain).not.toHaveBeenCalled();
});

test('a proof rejected by the server requires signing in again', async () => {
  mocks.api.registerAgain.mockRejectedValue({
    response: { status: 401, data: { error: 'Sign in again before creating a new account.' } },
  });
  open();
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Create new Student account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign in again');
  expect(await screen.findByRole('button', { name: 'Sign in again to continue' })).toBeEnabled();
  expect(mocks.updateDbUser).not.toHaveBeenCalled();
});

test('a lost response allows a safe retry and does not automatically repeat the request', async () => {
  mocks.api.registerAgain.mockRejectedValueOnce(new Error('connection lost'));
  open();
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Create new Student account' }));
  await screen.findByRole('alert');
  expect(mocks.api.registerAgain).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Create new Student account' })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create new Student account' }));
  await screen.findByText('Continue to onboarding');
  expect(mocks.api.registerAgain).toHaveBeenCalledTimes(2);
  expect(mocks.api.getAccountClosure).toHaveBeenCalledTimes(1);
});

test('an active account continues to normal onboarding without replacing it', async () => {
  mocks.api.getAccountClosure.mockResolvedValue({ data: { accountStatus: 'ACTIVE' } });
  open();
  await screen.findByText('Continue to onboarding');
  expect(mocks.api.registerAgain).not.toHaveBeenCalled();
});

test('signed-out users start sign-in only after clicking', async () => {
  mocks.auth.isAuthenticated = false;
  mocks.auth.user = null;
  open();
  expect(mocks.login).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in again to continue' }));
  expect(mocks.login).toHaveBeenCalledOnce();
  expect(mocks.api.getAccountClosure).not.toHaveBeenCalled();
});

test('a failed status request displays an error without a retry loop', async () => {
  mocks.api.getAccountClosure.mockRejectedValue({
    response: { data: { error: 'Server unavailable' } },
  });
  open();
  expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
  expect(mocks.api.getAccountClosure).toHaveBeenCalledTimes(1);
  expect(mocks.api.registerAgain).not.toHaveBeenCalled();
});
