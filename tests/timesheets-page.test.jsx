import { MemoryRouter } from 'react-router-dom';
/**
 * @file timesheets-page.test.jsx
 * @description Tutor pay-rate display on the Timesheets page: the tutor's
 * own current rate near the header, stored approval/payment amounts, and
 * the rate-changed note when the tutor's current rate differs from history.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
vi.mock('../src/api/swaps', () => ({
  swapsApi: { getCoverage: vi.fn(async () => ({ data: [] })) },
}));
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

  it('shows the approved amount and total for an approved timesheet', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Approved at R150.00\/hr · R750.00 total/)).toBeInTheDocument();
  });

  it("notes when the tutor's rate has changed since approval", async () => {
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

    await screen.findByText(/Approved at R150.00/);
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
    expect(screen.queryByText(/Approved at/)).not.toBeInTheDocument();
  });
});

describe('Timesheets page — tutor pay rate (staff view)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ dbUser: { id: 'admin-1' }, isStaff: true });
  });

  it('shows the approved amount without a "your rate" header for staff', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <TimesheetsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Approved at R150.00\/hr · R750.00 total/)).toBeInTheDocument();
    expect(screen.queryByText(/Your current rate/)).not.toBeInTheDocument();
    expect(ratesApi.getCurrentRate).not.toHaveBeenCalled();
  });
});

describe('Timesheets numeric integrity', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ dbUser: tutor, isStaff: false });
    timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet()] });
  });

  it('preserves data: null in the successful rate envelope', async () => {
    ratesApi.getCurrentRate.mockResolvedValue({ success: true, data: null });
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Pay rate not configured/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN|rate has since changed/)).not.toBeInTheDocument();
  });

  it.each(['garbage', '', null, undefined, Number.MIN_VALUE, Infinity, -10, 150.123, 100001])(
    'reports an invalid rate without rendering it: %s',
    async (rate) => {
      ratesApi.getCurrentRate.mockResolvedValue({ data: { rate } });
      render(
        <MemoryRouter>
          <TimesheetsPage />
        </MemoryRouter>
      );
      expect(await screen.findByText(/Your pay rate is invalid/)).toBeInTheDocument();
      expect(screen.queryByText(/NaN|Infinity|rate has since changed/)).not.toBeInTheDocument();
    }
  );

  it('distinguishes a failed lookup from an unconfigured rate', async () => {
    ratesApi.getCurrentRate.mockRejectedValue(new Error('Network unavailable'));
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Could not load your pay rate/)).toBeInTheDocument();
    expect(screen.queryByText(/Pay rate not configured/)).not.toBeInTheDocument();
  });

  it('accepts the decimal string returned by Prisma', async () => {
    ratesApi.getCurrentRate.mockResolvedValue({ data: { rate: '200.50' } });
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Your current rate: R200.50/hr')).toBeInTheDocument();
  });

  it.each([Number.MIN_VALUE, 0, 0.001, -2, 41, Infinity, 'bad', '', null])(
    'flags unusable allocated hours for staff: %s',
    async (hoursPerWeek) => {
      useAuth.mockReturnValue({ dbUser: { id: 'admin-1' }, isStaff: true });
      allocationsApi.getAllocations.mockResolvedValue({
        data: [{ userId: tutor.id, courseId: course.id, status: 'ACTIVE', hoursPerWeek }],
      });
      render(
        <MemoryRouter>
          <TimesheetsPage />
        </MemoryRouter>
      );
      expect(await screen.findByText(/Allocated hours are invalid/)).toBeInTheDocument();
      expect(screen.getByText('5h logged')).toBeInTheDocument();
      expect(screen.queryByText(/5e-324|NaN|Infinity|h allocated/)).not.toBeInTheDocument();
    }
  );

  it('matches tutor and course when comparing fractional allocated hours', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'admin-1' }, isStaff: true });
    allocationsApi.getAllocations.mockResolvedValue({
      data: [
        { userId: 'other', courseId: course.id, status: 'ACTIVE', hoursPerWeek: 10 },
        { userId: tutor.id, courseId: course.id, status: 'PENDING', hoursPerWeek: 20 },
        { userId: tutor.id, courseId: course.id, status: 'ACTIVE', hoursPerWeek: '1.50' },
      ],
    });
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('5h / 1.5h allocated')).toBeInTheDocument();
  });

  it('only calls an amount paid when the timesheet is PAID', async () => {
    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [approvedTimesheet({ status: 'PAID' })],
    });
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Paid at R150.00\/hr · R750.00 total/)).toBeInTheDocument();
  });
  it('displays a minute-based allocation without treating repeating fractions as invalid', async () => {
    allocationsApi.getAllocations.mockResolvedValue({
      data: [{ userId: tutor.id, courseId: course.id, status: 'ACTIVE', hoursPerWeek: 50 / 60 }],
    });
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('5h / 0.83h allocated')).toBeInTheDocument();
    expect(screen.queryByText(/Allocated hours are invalid/)).not.toBeInTheDocument();
  });

  it.each([0.01, 100000])('displays a valid rate boundary: %s', async (rate) => {
    ratesApi.getCurrentRate.mockResolvedValue({ data: { rate } });
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(
      await screen.findByText(`Your current rate: R${rate.toFixed(2)}/hr`)
    ).toBeInTheDocument();
  });

  it.each(['bad', Number.MIN_VALUE, 150.123])(
    'does not calculate payment from an invalid stored applied rate: %s',
    async (appliedRate) => {
      timesheetsApi.getTimesheets.mockResolvedValue({ data: [approvedTimesheet({ appliedRate })] });
      render(
        <MemoryRouter>
          <TimesheetsPage />
        </MemoryRouter>
      );
      await screen.findByText('COMS3011A');
      expect(screen.queryByText(/Approved at|Paid at|NaN|Infinity/)).not.toBeInTheDocument();
    }
  );

  it('calculates historical payment from Decimal strings and the stored rate', async () => {
    ratesApi.getCurrentRate.mockResolvedValue({
      data: { rate: '220.50', effectiveFrom: '2026-09-01' },
    });
    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [approvedTimesheet({ status: 'PAID', totalHours: '1.50', appliedRate: '150.25' })],
    });
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Paid at R150.25\/hr · R225.38 total/)).toBeInTheDocument();
    expect(await screen.findByText(/rate has since changed to R220.50\/hr/)).toBeInTheDocument();
  });

  it('shows loading until the rate request completes', async () => {
    let resolveRate;
    ratesApi.getCurrentRate.mockReturnValue(
      new Promise((resolve) => {
        resolveRate = resolve;
      })
    );
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Loading your pay rate…')).toBeInTheDocument();
    expect(screen.queryByText(/Pay rate not configured/)).not.toBeInTheDocument();
    await act(async () => {
      resolveRate({ data: { rate: 150 } });
    });
    expect(screen.getByText('Your current rate: R150.00/hr')).toBeInTheDocument();
  });

  it('ignores an old rate response when the signed-in tutor changes', async () => {
    let resolveOldRate;
    ratesApi.getCurrentRate.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldRate = resolve;
      })
    );
    const view = render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    await screen.findByText('Loading your pay rate…');
    useAuth.mockReturnValue({ dbUser: { id: 'tutor-2' }, isStaff: false });
    ratesApi.getCurrentRate.mockResolvedValue({ data: { rate: 220 } });
    view.rerender(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Your current rate: R220.00/hr')).toBeInTheDocument();
    await act(async () => {
      resolveOldRate({ data: { rate: 150 } });
    });
    expect(screen.getByText('Your current rate: R220.00/hr')).toBeInTheDocument();
    expect(screen.queryByText('Your current rate: R150.00/hr')).not.toBeInTheDocument();
  });

  it('keeps a submitted timesheet reviewable after approval fails for a missing rate', async () => {
    useAuth.mockReturnValue({ dbUser: { id: 'admin-1' }, isStaff: true });
    timesheetsApi.getTimesheets.mockResolvedValue({
      data: [approvedTimesheet({ status: 'SUBMITTED', appliedRate: null })],
    });
    const message =
      'This tutor has no pay rate configured yet — set one before approving their timesheet';
    timesheetsApi.approveTimesheet.mockRejectedValue({ response: { data: { error: message } } });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TimesheetsPage />
      </MemoryRouter>
    );
    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled());
    expect(screen.getAllByText('SUBMITTED')).toHaveLength(2);
    expect(timesheetsApi.getTimesheets).toHaveBeenCalledTimes(1);
  });
});
