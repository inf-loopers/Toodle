import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  it('navigates from another page to the dashboard when the logo is activated by keyboard', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/courses']}>
        <Navbar title="Courses" />
        <Routes>
          <Route path="/courses" element={<p>Course content</p>} />
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
        </Routes>
      </MemoryRouter>
    );
    const logo = screen.getByRole('link', { name: 'Toodle dashboard' });
    expect(logo).toHaveAttribute('href', '/dashboard');
    await user.tab();
    await user.tab();
    expect(logo).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('Course content')).not.toBeInTheDocument();
  });
  it('opens by keyboard and restores focus to its named trigger on Escape', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Navbar title="Dashboard" />
      </MemoryRouter>
    );
    const trigger = screen.getByRole('button', { name: 'Account menu for Test User' });
    trigger.focus();
    await user.keyboard('{Enter}{Tab}');
    expect(screen.getByRole('menuitem', { name: 'My Profile' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
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

describe('Navbar branding and global search', () => {
  it('renders exactly one dashboard logo link and the global search entry', () => {
    render(
      <MemoryRouter>
        <Navbar title="Dashboard" />
      </MemoryRouter>
    );

    // Regression: github/main rendered <AppLogo> twice (a bad-merge artifact),
    // so the live dashboard showed two logos. The navbar must expose a single
    // dashboard logo link.
    expect(screen.getAllByRole('link', { name: 'Toodle dashboard' })).toHaveLength(1);
    // C05: the global search entry point lives in the navbar right section.
    expect(screen.getByRole('button', { name: 'Global search' })).toBeInTheDocument();
  });
});
