/**
 * @file calendar-feed-modal.test.jsx
 * @description Subscribe-modal (Scope B) behaviour against a mocked calendar API.
 *
 * The plaintext feed token exists only in the response to create/rotate, so the
 * modal must reveal it immediately after connecting and never re-serve it on a
 * later open. Asserted: connect shows a feed URL carrying the issued token plus
 * the Google Calendar instructions, `Copy link` writes that URL to the clipboard
 * and confirms, `Regenerate` replaces the displayed URL, `Disconnect` returns to
 * the connect state, an API failure renders a FormError and leaves the dialog
 * open, and the dialog is reachable by its accessible name.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CalendarFeedModal } from '../src/components/calendar/CalendarFeedModal';

// The modal reads the calendar API and, through `buildFeedUrl`, the API client's
// base URL. A mutable client mock keeps the base relative so the built feed URL
// is `${window.location.origin}/api/v1/calendar/feed/<token>`.
const { calendarApi, mockClient } = vi.hoisted(() => ({
  calendarApi: {
    getMyEvents: vi.fn(),
    getFeedToken: vi.fn(),
    createFeedToken: vi.fn(),
    revokeFeedToken: vi.fn(),
  },
  mockClient: { defaults: { baseURL: '/api/v1' } },
}));

vi.mock('../src/api/calendar', () => ({ calendarApi, default: calendarApi }));
vi.mock('../src/api/client', () => ({ default: mockClient }));

const LOADING_LABEL = 'Checking your subscription…';
const DISCONNECTED_HINT = /You have not connected a calendar feed yet/;

const feedUrlFor = (token) => `${window.location.origin}/api/v1/calendar/feed/${token}`;

// Opens the modal in a settled (non-loading) state and returns the onClose spy.
async function openModal({ connected = false } = {}) {
  const onClose = vi.fn();

  calendarApi.getFeedToken.mockResolvedValue({ data: { connected } });
  render(<CalendarFeedModal open onClose={onClose} />);
  await waitFor(() => expect(screen.queryByText(LOADING_LABEL)).not.toBeInTheDocument());

  return onClose;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.defaults.baseURL = '/api/v1';
  calendarApi.getFeedToken.mockResolvedValue({ data: { connected: false } });

  // jsdom has no async clipboard; install a spy the component's optional-chain
  // guard (`navigator.clipboard?.writeText`) will pick up.
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

describe('CalendarFeedModal', () => {
  it('is reachable as a dialog named by its title', async () => {
    await openModal();

    expect(screen.getByRole('dialog', { name: 'Subscribe to your calendar' })).toBeInTheDocument();
  });

  it('connects and reveals a feed URL containing the issued token', async () => {
    calendarApi.createFeedToken.mockResolvedValue({ data: { token: 'first-token' } });
    const user = userEvent.setup();
    await openModal({ connected: false });

    // Before connecting: the disconnected copy and the Google instructions show.
    expect(screen.getByText(DISCONNECTED_HINT)).toBeInTheDocument();
    expect(screen.getByText('Subscribe with Google Calendar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Your feed URL')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Connect' }));

    const urlInput = await screen.findByLabelText('Your feed URL');
    expect(urlInput).toHaveValue(feedUrlFor('first-token'));
    expect(urlInput.value).toContain('first-token');
  });

  it('copies the feed URL to the clipboard and confirms', async () => {
    calendarApi.createFeedToken.mockResolvedValue({ data: { token: 'copy-token' } });
    const user = userEvent.setup();

    // userEvent.setup() installs its own clipboard stub, so replace it with a
    // spy AFTER setup (and before the click) to assert on the copied URL.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    await openModal({ connected: false });
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    await screen.findByLabelText('Your feed URL');

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith(feedUrlFor('copy-token'));
    expect(await screen.findByRole('status')).toHaveTextContent('Copied to clipboard');
  });

  it('regenerates to a fresh URL, replacing the old one', async () => {
    calendarApi.createFeedToken
      .mockResolvedValueOnce({ data: { token: 'first-token' } })
      .mockResolvedValueOnce({ data: { token: 'second-token' } });
    const user = userEvent.setup();
    await openModal({ connected: false });

    await user.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByLabelText('Your feed URL')).toHaveValue(feedUrlFor('first-token'));

    // Once connected the primary action becomes "Regenerate".
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(await screen.findByLabelText('Your feed URL')).toHaveValue(feedUrlFor('second-token'));
    expect(calendarApi.createFeedToken).toHaveBeenCalledTimes(2);
  });

  it('disconnects and returns to the connect state', async () => {
    calendarApi.createFeedToken.mockResolvedValue({ data: { token: 'first-token' } });
    calendarApi.revokeFeedToken.mockResolvedValue({ data: { connected: false } });
    const user = userEvent.setup();
    await openModal({ connected: false });

    await user.click(screen.getByRole('button', { name: 'Connect' }));
    await screen.findByLabelText('Your feed URL');

    await user.click(screen.getByRole('button', { name: 'Disconnect' }));

    await waitFor(() => expect(screen.queryByLabelText('Your feed URL')).not.toBeInTheDocument());
    expect(calendarApi.revokeFeedToken).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
    expect(screen.getByText(DISCONNECTED_HINT)).toBeInTheDocument();
  });

  it('surfaces an API failure and keeps the dialog open', async () => {
    calendarApi.createFeedToken.mockRejectedValueOnce({
      response: { data: { error: 'Feed service unavailable' } },
    });
    const user = userEvent.setup();
    const onClose = await openModal({ connected: false });

    await user.click(screen.getByRole('button', { name: 'Connect' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Feed service unavailable');
    expect(screen.getByRole('dialog', { name: 'Subscribe to your calendar' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the connected-but-hidden state when reopened without a plaintext token', async () => {
    await openModal({ connected: true });

    // No plaintext token is available on a later open, so only status + actions.
    expect(screen.getByText(/Your feed is connected/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Your feed URL')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
  });
});
