import { MemoryRouter } from 'react-router-dom';
/**
 * @file timesheets-page.test.jsx
 * @description Tutor pay-rate display on the Timesheets page: the tutor's
 * own current rate near the header, the "paid at" figure stamped on each
 * approved timesheet, and the rate-changed note when the tutor's rate has
 * since moved on from what a timesheet was actually paid at.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimesheetsPage from '../src/pages/TimesheetsPage';
import { timesheetsApi } from '../src/api/timesheets';
import { allocationsApi } from '../src/api/allocations';
import { ratesApi } from '../src/api/rates';
import { useAuth } from '../src/hooks/useAuth';

vi.mock('../src/api/timesheets', () => ({
  timesheetsApi: {
    getTimesheets: vi.fn(),
    approveTimesheet: vi.fn(),
    submitTimesheet: vi.fn(),
    disputeTimesheet: vi.fn(),
    addEntry: vi.fn(),
    deleteEntry: vi.fn(),
    getTimesheet: vi.fn(),
    createTimesheet: vi.fn(),
  },
}));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));
vi.mock('../src/api/rates', () => ({ ratesApi: { getCurrentRate: vi.fn() } }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));

const tutor = { id: 'tutor-1', name: 'Tebogo Tutor' };
const course = { id: 'c1', code: 'COMS3011A', name: 'SDP' };

function approvedTimesheet(overrides = {}) {
  return {
    id: 'ts-1',
    userId: 'tutor-1',
    courseId: 'c1',
    weekStartDate: '2026-08-17',
    status: 'APPROVED',
    totalHours: 5,
    course,
    user: tutor,
    appliedRate: 150,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
  ratesApi.getCurrentRate.mockResolvedValue({ data: null });
});

describe('Timesheets page — tutor pay rate (tutor view)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ dbUser: tutor, isStaff: false });
  });

  it("shows the tutor's current rate near the page header", async () => {
    ratesApi.getCurrentRate.mockResolvedValue({
      data: { rate: 200, effectiveFrom: '2026-09-01' },
    });
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [] });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Your current rate: R200.00/hr')).toBeInTheDocument();
  });

  it('shows the paid-at amount and total for an approved timesheet', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Paid at R150.00\/hr · R750.00 total/)).toBeInTheDocument();
  });

  it("notes when the tutor's rate has since changed from what the timesheet was paid at", async () => {
    ratesApi.getCurrentRate.mockResolvedValue({
      data: { rate: 220, effectiveFrom: '2026-09-15' },
    });
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Your rate has since changed to R220.00\/hr/)
    ).toBeInTheDocument();
  });

  it('does not show a rate-changed note when the current rate matches the applied rate', async () => {
    ratesApi.getCurrentRate.mockResolvedValue({
      data: { rate: 150, effectiveFrom: '2026-01-01' },
    });
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    await screen.findByText(/Paid at R150.00/);
    expect(screen.queryByText(/rate has since changed/)).not.toBeInTheDocument();
  });

  it('renders nothing extra for a legacy approved timesheet with no stored appliedRate', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [approvedTimesheet({ appliedRate: null })],
    });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    await screen.findByText('COMS3011A');
    expect(screen.queryByText(/Paid at/)).not.toBeInTheDocument();
  });
});

describe('Timesheets page — tutor pay rate (staff view)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ dbUser: { id: 'admin-1' }, isStaff: true });
  });

  it('shows the paid-at amount on an approved timesheet without a "your rate" header line', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Paid at R150.00\/hr · R750.00 total/)).toBeInTheDocument();
    expect(screen.queryByText(/Your current rate/)).not.toBeInTheDocument();
    expect(ratesApi.getCurrentRate).not.toHaveBeenCalled();
  });
});
