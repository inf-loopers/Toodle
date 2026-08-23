/**
 * @file ui.test.jsx
 * @description Smoke tests verifying base UI component mounting.
 */

import { render, screen } from '@testing-library/react';
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
  it('renders the landing page without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Toodle - Wits Tutor Management')).toBeInTheDocument();
    expect(screen.getByText(/Empowering Academic Excellence/i)).toBeInTheDocument();
  });
});
