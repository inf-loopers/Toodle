import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import ProtectedRoute from '../src/components/auth/ProtectedRoute';

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    role: 'admin',
    error: 'This account is closed. Sign out to continue.',
    logout: vi.fn(),
  }),
}));

test('a failed account sync blocks protected screens even when a stale admin role is present', () => {
  render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/users" element={<p>Private users list</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText('This account is closed. Sign out to continue.')).toBeInTheDocument();
  expect(screen.queryByText('Private users list')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Account closed' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Create a new account' })).toHaveAttribute(
    'href',
    '/register-again'
  );
});
