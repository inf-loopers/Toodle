/**
 * @file dashboard-tutor-profile.test.jsx
 * @description Guards the B07 request-dedup on the tutor dashboard: the DB
 * profile (availability, maxHoursPerWeek) is already synced once at login by
 * AuthProvider and exposed via useAuth().dbUser, so the dashboard must reuse
 * it rather than issuing a redundant GET /users/me on every load.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../src/pages/DashboardPage';
import { allocationsApi } from '../src/api/allocations';
import { timesheetsApi } from '../src/api/timesheets';
import { swapsApi } from '../src/api/swaps';
import { usersApi } from '../src/api/users';

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Tina Tutor' },
    role: 'tutor',
    isStaff: false,
    dbUser: { maxHoursPerWeek: 20, availability: [] },
  }),
}));
vi.mock('../src/components/auth/LogoutButton', () => ({ default: () => null }));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));
vi.mock('../src/api/timesheets', () => ({ timesheetsApi: { getTimesheets: vi.fn() } }));
vi.mock('../src/api/swaps', () => ({
  swapsApi: { getSwaps: vi.fn(), getCoverage: vi.fn(), getWorkload: vi.fn() },
}));
vi.mock('../src/api/users', () => ({ usersApi: { getCurrentUser: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
  timesheetsApi.getTimesheets.mockResolvedValue({ data: [] });
  swapsApi.getSwaps.mockResolvedValue({ data: [] });
  swapsApi.getCoverage.mockResolvedValue({ data: [] });
  swapsApi.getWorkload.mockResolvedValue({ data: {} });
});

describe('Tutor dashboard profile sourcing (B07)', () => {
  it('reuses the auth-context profile instead of refetching /users/me', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // maxHoursPerWeek (20) from dbUser drives the Weekly Hours stat.
    expect(await screen.findByText('0h / 20h')).toBeInTheDocument();
    // Empty availability from dbUser renders the empty-state copy.
    expect(
      await screen.findByText(
        'No availability submitted yet. Add your available times on your profile.'
      )
    ).toBeInTheDocument();

    // The redundant profile request must not be issued.
    expect(usersApi.getCurrentUser).not.toHaveBeenCalled();
  });
});
