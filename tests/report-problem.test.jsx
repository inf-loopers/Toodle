import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportProblemModal from '../src/components/layout/ReportProblemModal';
import { reportsApi } from '../src/api/reports';

vi.mock('../src/api/reports', () => ({
  reportsApi: {
    submitProblemReport: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Report problem modal', () => {
  it('submits the preselected page, description and blocking flag', async () => {
    reportsApi.submitProblemReport.mockResolvedValue({ success: true, data: { submitted: true } });
    const user = userEvent.setup();
    render(
      <ReportProblemModal open onClose={vi.fn()} pageName="Timesheets" pathname="/timesheets" />
    );

    await user.type(screen.getByLabelText(/What happened\?/), 'Page would not load');
    await user.click(screen.getByText('This stopped me from completing my task'));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() =>
      expect(reportsApi.submitProblemReport).toHaveBeenCalledWith({
        page: 'Timesheets',
        description: 'Page would not load',
        blocking: true,
        url: '/timesheets',
      })
    );

    expect(await screen.findByText('Report sent')).toBeInTheDocument();
  });

  it('shows an error message when submission fails', async () => {
    reportsApi.submitProblemReport.mockRejectedValue({
      response: { data: { error: 'Email delivery failed' } },
    });
    const user = userEvent.setup();
    render(
      <ReportProblemModal open onClose={vi.fn()} pageName="Dashboard" pathname="/dashboard" />
    );

    await user.type(screen.getByLabelText(/What happened\?/), 'Dashboard crashed');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email delivery failed');
    expect(screen.queryByText('Report sent')).not.toBeInTheDocument();
  });

  it('keeps submit disabled until a page and description are provided', async () => {
    const user = userEvent.setup();
    render(<ReportProblemModal open onClose={vi.fn()} pageName="Toodle" pathname="/profile" />);

    const submit = screen.getByRole('button', { name: 'Submit report' });
    expect(submit).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Where did it happen?'), 'My Profile');
    await user.type(screen.getByLabelText(/What happened\?/), 'Profile failed to load');

    expect(submit).toBeEnabled();
  });

  it('says the report was not sent and offers an email fallback on a 503 (B03)', async () => {
    reportsApi.submitProblemReport.mockRejectedValue({
      response: {
        status: 503,
        data: { error: 'Your report could not be sent right now. Please try again.' },
      },
    });
    const user = userEvent.setup();
    render(<ReportProblemModal open onClose={vi.fn()} pageName="Courses" pathname="/courses" />);

    await user.type(screen.getByLabelText(/What happened\?/), 'Course list is empty');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be sent');
    expect(screen.getByText(/not sent/)).toBeInTheDocument();
    expect(screen.queryByText('Report sent')).not.toBeInTheDocument();

    // The typed report is kept for a retry ...
    expect(screen.getByLabelText(/What happened\?/)).toHaveValue('Course list is empty');
    // ... and can be sent from the user's own mail app instead.
    const mailto = screen.getByRole('link', { name: /email it to/ }).getAttribute('href');
    expect(mailto).toMatch(/^mailto:toodle\.issues@gmail\.com\?subject=/);
    expect(decodeURIComponent(mailto)).toContain('Course list is empty');
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeEnabled();
  });

  it('does not offer the email fallback for a validation error', async () => {
    reportsApi.submitProblemReport.mockRejectedValue({
      response: { status: 400, data: { error: 'Description is required' } },
    });
    const user = userEvent.setup();
    render(<ReportProblemModal open onClose={vi.fn()} pageName="Courses" pathname="/courses" />);

    await user.type(screen.getByLabelText(/What happened\?/), 'x');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Description is required');
    expect(screen.queryByRole('link', { name: /email it to/ })).not.toBeInTheDocument();
  });
});
