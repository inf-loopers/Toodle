import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WelcomeSignIn from '../src/components/auth/WelcomeSignIn';

const auth = vi.hoisted(() => ({ isLoading: false, login: vi.fn() }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));

function renderSignIn(returnTo) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/login', ...(returnTo ? { state: { from: returnTo } } : {}) }]}
    >
      <WelcomeSignIn />
    </MemoryRouter>
  );
}

beforeEach(() => {
  auth.isLoading = false;
  auth.login.mockReset().mockResolvedValue(undefined);
});

describe('Welcome sign-in through existing Auth0 authentication', () => {
  it('lets a keyboard user open hosted sign-in without entering an email', async () => {
    const user = userEvent.setup();
    renderSignIn();
    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Sign in or sign up', exact: true })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(auth.login).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/dashboard' },
    });
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('passes a trimmed email hint and preserves a requested protected destination', async () => {
    renderSignIn('/courses/course-123');
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: ' tutor@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in or sign up', exact: true }));
    expect(auth.login).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/courses/course-123' },
      authorizationParams: { login_hint: 'tutor@example.com' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in or sign up', exact: true })).toBeEnabled()
    );
  });

  it('opens the existing Google connection without sending an email hint', async () => {
    renderSignIn('/profile');
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'tutor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(auth.login).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/profile' },
      authorizationParams: { connection: 'google-oauth2' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
    );
  });

  it('opens hosted account creation and carries the optional email hint', async () => {
    renderSignIn();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'new-tutor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(auth.login).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/dashboard' },
      authorizationParams: { screen_hint: 'signup', login_hint: 'new-tutor@example.com' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create an account' })).toBeEnabled()
    );
  });

  it('shows a failed redirect, preserves the email, and lets the user retry', async () => {
    auth.login.mockRejectedValueOnce(new Error('The sign-in service is unavailable.'));
    renderSignIn();
    const email = screen.getByRole('textbox', { name: 'Email address' });
    const submit = screen.getByRole('button', { name: 'Sign in or sign up', exact: true });
    fireEvent.change(email, { target: { value: 'tutor@example.com' } });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i);
    expect(email).toHaveValue('tutor@example.com');
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(auth.login).toHaveBeenCalledTimes(2));
    expect(auth.login.mock.calls[1][0]).toEqual({
      appState: { returnTo: '/dashboard' },
      authorizationParams: { login_hint: 'tutor@example.com' },
    });
    await waitFor(() => expect(submit).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an understandable fallback when Google redirect fails without a message', async () => {
    auth.login.mockRejectedValueOnce(undefined);
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(/Google sign-in/i);
    expect(error).toHaveTextContent(/try again/i);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });

  it('prevents duplicate redirects and competing methods while a redirect is pending', async () => {
    let resolveLogin;
    auth.login.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
    );
    renderSignIn();
    const submit = screen.getByRole('button', { name: 'Sign in or sign up', exact: true });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create an account' })).toBeDisabled();
    await act(async () => resolveLogin());
    expect(submit).toBeEnabled();
  });

  it('keeps authentication actions disabled while Auth0 is initializing', () => {
    auth.isLoading = true;
    renderSignIn();
    const actions = [
      screen.getByRole('button', { name: 'Sign in or sign up', exact: true }),
      screen.getByRole('button', { name: 'Continue with Google' }),
      screen.getByRole('button', { name: 'Create an account' }),
    ];
    for (const action of actions) {
      expect(action).toBeDisabled();
      fireEvent.click(action);
    }
    expect(auth.login).not.toHaveBeenCalled();
  });
});
