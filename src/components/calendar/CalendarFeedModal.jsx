/**
 * @file CalendarFeedModal.jsx
 * @description Subscribe dialog for the per-user read-only .ics feed (Scope B).
 *
 * Responsibilities:
 * - On open, asks the API whether a feed is already connected (the plaintext
 *   token is never re-served, only its hash is stored).
 * - Disconnected: explains the subscription flow and offers a `Connect` action.
 * - Connected with a freshly issued token: shows the read-only feed URL, a
 *   `Copy link` action, `Regenerate` and `Disconnect`.
 * - Connected on a later open (no plaintext available): explains that the URL is
 *   only shown when issued and offers `Regenerate` to reveal a fresh one.
 *
 * Security notes:
 * - The plaintext token exists only in the response to create/rotate, so it is
 *   held in component state and displayed immediately; it is never written to
 *   `localStorage` or any other persistent store.
 * - Built on the shared `Modal`, so focus trapping, Escape/backdrop close and
 *   focus restoration come for free. State resets in an effect keyed on `open`
 *   (reset-on-open), and a failed action never closes the dialog.
 *
 * Expected Usage:
 * ```jsx
 * <CalendarFeedModal open={feedOpen} onClose={() => setFeedOpen(false)} />
 * ```
 */

import { useEffect, useState } from 'react';

import { calendarApi } from '../../api/calendar';
import { buildFeedUrl } from '../../utils/calendar';
import { getApiErrorMessage } from '../../utils/apiError';

import Button from '../ui/Button';
import FormError from '../ui/FormError';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { Input } from '../ui/Input';

const DISCONNECTED_COPY =
  'You have not connected a calendar feed yet. Connect to generate a private, read-only URL you can paste into Google Calendar, Outlook or Apple Calendar.';

const CONNECTED_HIDDEN_COPY =
  'Your feed is connected. For security the URL is shown only at the moment it is issued — regenerate it to reveal a fresh URL and copy it into your calendar app.';

const selectOnFocus = (event) => event.target.select();

export function CalendarFeedModal({ open, onClose }) {
  // Starts true so an opened dialog shows its loading state immediately rather
  // than flashing the disconnected copy before the status fetch settles.
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Reset-on-open: a failed action never closes the dialog, so state is cleared
  // when it opens rather than when it closes, and the current status is fetched.
  useEffect(() => {
    if (!open) return;

    setToken('');
    setConnected(false);
    setCopied(false);
    setError('');
    setLoading(true);

    calendarApi
      .getFeedToken()
      .then((response) => {
        setConnected(Boolean(response?.data?.connected));
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load your subscription status.'));
      })
      .finally(() => setLoading(false));
  }, [open]);

  // The copied confirmation is transient; clear it so the button reads normally.
  useEffect(() => {
    if (!copied) return undefined;

    const timer = setTimeout(() => setCopied(false), 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  const feedUrl = token ? buildFeedUrl(token) : '';

  const createOrRotate = async () => {
    setBusy(true);
    setError('');
    setCopied(false);

    try {
      const response = await calendarApi.createFeedToken();

      setToken(response?.data?.token ?? '');
      setConnected(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not connect your calendar feed.'));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError('');

    try {
      await calendarApi.revokeFeedToken();

      setToken('');
      setConnected(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not disconnect your calendar feed.'));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!feedUrl) return;

    setError('');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(feedUrl);
      } else {
        // Fallback for browsers without the async clipboard API: select a
        // detached textarea and run the legacy copy command.
        const helper = document.createElement('textarea');
        helper.value = feedUrl;
        helper.setAttribute('readonly', '');
        helper.style.position = 'absolute';
        helper.style.left = '-9999px';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        document.body.removeChild(helper);
      }

      setCopied(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not copy the link. Select it and copy manually.'));
    }
  };

  // Block close (header X, backdrop, Escape) while a request is in flight so a
  // half-finished rotate/disconnect cannot be interrupted by the user.
  const handleClose = busy ? () => {} : onClose;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Subscribe to your calendar"
      description="Add your Toodle sessions to Google Calendar, Outlook or Apple Calendar with a private, read-only feed URL."
      footer={
        <>
          {connected && !loading && (
            <Button variant="ghost" onClick={disconnect} disabled={busy}>
              Disconnect
            </Button>
          )}

          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Close
          </Button>

          <Button onClick={createOrRotate} loading={busy} disabled={loading}>
            {connected ? 'Regenerate' : 'Connect'}
          </Button>
        </>
      }
    >
      {loading ? (
        <Spinner label="Checking your subscription…" className="py-6" />
      ) : (
        <div className="space-y-4">
          {feedUrl ? (
            <div>
              <Input label="Your feed URL" readOnly value={feedUrl} onFocus={selectOnFocus} />

              <div className="mt-2 flex items-center gap-3">
                <Button size="sm" variant="secondary" onClick={copyLink}>
                  Copy link
                </Button>

                {copied && (
                  <span role="status" className="text-xs font-medium text-emerald-600">
                    Copied to clipboard
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {connected ? CONNECTED_HIDDEN_COPY : DISCONNECTED_COPY}
            </p>
          )}

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Subscribe with Google Calendar</p>

            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Open Google Calendar in a web browser.</li>
              <li>
                Under <span className="font-medium">Other calendars</span>, click the{' '}
                <span className="font-medium">+</span> and choose{' '}
                <span className="font-medium">From URL</span>.
              </li>
              <li>
                Paste your feed URL and click <span className="font-medium">Add calendar</span>.
              </li>
            </ol>

            <p className="mt-2 text-xs text-slate-400">
              Outlook and Apple Calendar can subscribe to the same URL. Toodle never asks for your
              Google password and stores no third-party credentials.
            </p>
          </div>

          {connected && (
            <p className="text-xs text-amber-600">
              Regenerating replaces this URL — any calendar still subscribed to the old one will
              stop updating.
            </p>
          )}

          <FormError message={error} />
        </div>
      )}
    </Modal>
  );
}

export default CalendarFeedModal;
