import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import WelcomeIntro from '../src/components/auth/WelcomeIntro';
import LandingPage from '../src/pages/LandingPage';

const auth = vi.hoisted(() => ({ isAuthenticated: false, isLoading: false, login: vi.fn() }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));

beforeEach(() => {
  sessionStorage.clear();
  auth.isAuthenticated = false;
  auth.login.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Public welcome sequence', () => {
  it('reveals the original landing footer with sign-in and keeps support out of the intro tab order', async () => {
    vi.useFakeTimers();
    let view;
    await act(async () => {
      view = render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );
    });
    expect(screen.queryByRole('link', { name: 'Contact Support' })).not.toBeInTheDocument();
    expect(document.querySelector('.welcome-footer')).toHaveAttribute('inert');
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('link', { name: 'Contact Support' })).toHaveAttribute(
      'href',
      'mailto:toodle.issues@gmail.com'
    );
    expect(screen.getByText('Infinite Loopers')).toBeInTheDocument();
    expect(document.querySelector('.welcome-footer')).not.toHaveAttribute('inert');
    view.unmount();
    await act(async () =>
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      )
    );
    expect(screen.getByRole('link', { name: 'Contact Support' })).toBeInTheDocument();
  });
  it('plays once, finishes, and shows the interface immediately on subsequent visits', async () => {
    vi.useFakeTimers();
    let view;
    await act(async () => {
      view = render(
        <WelcomeIntro>
          <button>Sign in</button>
        </WelcomeIntro>
      );
    });
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip animation' })).not.toBeInTheDocument();
    expect(document.querySelector('.welcome-intro')).toHaveClass('is-playing');
    expect(document.querySelector('canvas')).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(document.querySelector('.welcome-intro')).toHaveClass('is-playing');
    act(() => vi.advanceTimersByTime(999));
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    view.unmount();
    await act(async () =>
      render(
        <WelcomeIntro>
          <button>Sign in</button>
        </WelcomeIntro>
      )
    );
    expect(screen.queryByRole('button', { name: 'Skip animation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
  it('lets keyboard users sign in through the existing Auth0 action after the introduction', async () => {
    vi.useFakeTimers();
    await act(async () =>
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      )
    );
    act(() => vi.advanceTimersByTime(2000));
    vi.useRealTimers();
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveFocus();
    await user.tab();
    const signIn = screen.getByRole('button', { name: 'Sign in or sign up', exact: true });
    expect(signIn).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(auth.login).toHaveBeenCalledWith({ appState: { returnTo: '/dashboard' } });
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });
  it('respects reduced-motion preferences', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    await act(async () =>
      render(
        <WelcomeIntro>
          <button>Sign in</button>
        </WelcomeIntro>
      )
    );
    expect(screen.queryByRole('button', { name: 'Skip animation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(document.querySelector('.welcome-intro')).toHaveClass('is-ready');
  });
  it('stops immediately when reduced motion is enabled during the introduction', async () => {
    await act(async () =>
      render(
        <WelcomeIntro>
          <button data-welcome-signin>Sign in</button>
        </WelcomeIntro>
      )
    );
    const media = window.matchMedia.mock.results.at(-1).value;
    const onChange = media.addEventListener.mock.calls.find(([event]) => event === 'change')[1];
    act(() => onChange({ matches: true }));
    expect(screen.queryByRole('button', { name: 'Skip animation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(document.querySelector('.welcome-intro')).toHaveClass('is-ready');
  });
  it('sends authenticated visitors directly to the dashboard without mounting the animation', () => {
    auth.isAuthenticated = true;
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<p>Existing dashboard</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Existing dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip animation' })).not.toBeInTheDocument();
    expect(sessionStorage.getItem('toodle.welcomePlayed')).toBeNull();
  });
});
