import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from '../src/components/layout/Navbar';

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: { name: 'Test User', email: 'test@example.com' },
    logout,
  }),
}));

vi.mock('../src/components/layout/NotificationBell', () => ({ default: () => null }));

async function openProfileMenu() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Navbar title="Dashboard" />
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: /Test User/ }));
  return user;
}

describe('Profile dropdown sign out', () => {
  beforeEach(() => {
    logout.mockReset();
  });

  it('logs out through Auth0 on the first click and returns to the landing page', async () => {
    logout.mockReturnValue(new Promise(() => {}));
    const user = await openProfileMenu();
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: window.location.origin },
    });
    expect(screen.getByRole('menuitem', { name: /Signing out/ })).toBeDisabled();
  });

  it('shows a failure and allows the user to retry', async () => {
    logout.mockRejectedValueOnce(new Error('Logout failed')).mockResolvedValueOnce();
    const user = await openProfileMenu();
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign out');
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
