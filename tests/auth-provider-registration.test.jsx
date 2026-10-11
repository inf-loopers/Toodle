import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import AuthProvider from '../src/context/AuthProvider';
import { useAuthContext } from '../src/context/AuthContext';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn().mockResolvedValue('token'),
  getClaims: vi.fn(),
  login: vi.fn(),
  user: { sub: 'google-oauth2|returning' },
  syncUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    isLoading: false,
    getAccessTokenSilently: mocks.getToken,
    getIdTokenClaims: mocks.getClaims,
    loginWithRedirect: mocks.login,
    user: mocks.user,
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.getToken.mockResolvedValue('token');
  mocks.getClaims.mockResolvedValue({ __raw: 'signed-id-proof' });
  mocks.syncUser.mockResolvedValue({ data: { id: 'new-user' } });
  mocks.getCurrentUser.mockResolvedValue({ data: { id: 'new-user', role: 'STUDENT' } });
});
vi.mock('../src/api/users', () => ({
  usersApi: { syncUser: mocks.syncUser, getCurrentUser: mocks.getCurrentUser },
}));
function Handoff() {
  const { syncError, dbUser, updateDbUser } = useAuthContext();
  return (
    <>
      <p>{syncError || dbUser?.role || 'Loading'}</p>
      <button onClick={() => updateDbUser({ id: 'new', role: 'student' })}>
        Finish registration
      </button>
    </>
  );
}
test('successful explicit registration clears the closed-account sync error and sets the new profile', async () => {
  mocks.syncUser.mockRejectedValue({
    response: { status: 403, data: { error: 'This account is closed. Sign out to continue.' } },
  });
  render(
    <AuthProvider>
      <Handoff />
    </AuthProvider>
  );
  await screen.findByText('This account is closed. Sign out to continue.');
  fireEvent.click(screen.getByRole('button', { name: 'Finish registration' }));
  expect(await screen.findByText('student')).toBeInTheDocument();
  expect(
    screen.queryByText('This account is closed. Sign out to continue.')
  ).not.toBeInTheDocument();
  expect(mocks.syncUser).toHaveBeenCalledTimes(1);
});

const freshLoginRequired = {
  response: {
    status: 403,
    data: {
      error: 'Please sign in again to start a fresh account.',
      details: { code: 'FRESH_SIGN_IN_REQUIRED' },
    },
  },
};

test('normal sign-in sends verified ID proof and loads the new student without a manual recovery page', async () => {
  render(
    <AuthProvider>
      <Handoff />
    </AuthProvider>
  );
  expect(await screen.findByText('student')).toBeInTheDocument();
  expect(mocks.syncUser).toHaveBeenCalledWith({ idToken: 'signed-id-proof' });
  expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
  expect(mocks.login).not.toHaveBeenCalled();
});

test('a stale browser session reauthenticates once, then normal sign-in succeeds', async () => {
  mocks.syncUser.mockRejectedValueOnce(freshLoginRequired);
  const first = render(
    <AuthProvider>
      <Handoff />
    </AuthProvider>
  );
  await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
  expect(mocks.login).toHaveBeenCalledWith({
    appState: { returnTo: '/dashboard' },
    authorizationParams: { prompt: 'login', max_age: 0, connection: 'google-oauth2' },
  });
  expect(
    screen.queryByText('Please sign in again to start a fresh account.')
  ).not.toBeInTheDocument();
  expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  first.unmount();
  render(
    <AuthProvider>
      <Handoff />
    </AuthProvider>
  );
  expect(await screen.findByText('student')).toBeInTheDocument();
  expect(mocks.login).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem('toodle:account-return-login')).toBeNull();
});

test('a rejected reauthentication cannot cause an infinite redirect loop', async () => {
  sessionStorage.setItem(
    'toodle:account-return-login',
    JSON.stringify({ subject: mocks.user.sub, at: Date.now() })
  );
  mocks.syncUser.mockRejectedValue(freshLoginRequired);
  render(
    <AuthProvider>
      <Handoff />
    </AuthProvider>
  );
  await screen.findByText('Could not confirm your new sign-in. Please sign out and sign in again.');
  expect(mocks.login).not.toHaveBeenCalled();
  expect(mocks.syncUser).toHaveBeenCalledOnce();
});
