/**
 * @file ui.test.jsx
 * @description Smoke tests verifying base UI component mounting.
 */

import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock Auth0 to avoid provider dependency in unit tests
vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: ({ children }) => children,
  useAuth0: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
    getAccessTokenSilently: vi.fn(),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  }),
}));

import App from '../src/App';

describe('App Smoke Test', () => {
  it('renders the landing page without crashing', async () => {
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    sessionStorage.setItem('toodle.welcomePlayed', 'true');
    await act(async () =>
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign in or sign up', exact: true })
    ).toBeInTheDocument();
    canvas.mockRestore();
    sessionStorage.removeItem('toodle.welcomePlayed');
  });
});
