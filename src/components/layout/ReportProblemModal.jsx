import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Select, Textarea } from '../ui/Input';
import { reportsApi } from '../../api/reports';

const PAGE_OPTIONS = [
  'Dashboard',
  'Allocation Board',
  'Courses',
  'Tutors',
  'Timesheets',
  'Excusals',
  'Session Swaps',
  'Volunteer Overflow',
  'Reports',
  'My Profile',
  'Other',
];

/**
 * The inbox that receives problem reports. Mirrors ISSUES_EMAIL on the API.
 */
const ISSUES_EMAIL = 'toodle.issues@gmail.com';

export default function ReportProblemModal({ open, onClose, pageName, pathname }) {
  const [selectedPage, setSelectedPage] = useState('');
  const [description, setDescription] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      // Pre-select the page the user was on when they opened the form.
      setSelectedPage(PAGE_OPTIONS.includes(pageName) ? pageName : '');
      setDescription('');
      setBlocking(false);
      setSubmitting(false);
      setSubmitted(false);
      setError('');
    }
  }, [open, pageName]);

  const canSubmit = Boolean(selectedPage) && description.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');

    try {
      await reportsApi.submitProblemReport({
        page: selectedPage,
        description: description.trim(),
        blocking,
        url: pathname,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not send your report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report a problem"
      description="Tell us what went wrong and we'll look into it."
      footer={
        submitted ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>

            <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
              Submit report
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden="true" />

          <h4 className="mt-4 text-base font-bold text-slate-900">Report sent</h4>

          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Thanks — your report has been emailed to the Toodle team at{' '}
            <span className="font-medium text-slate-700">{ISSUES_EMAIL}</span>. We will look into
            it.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Page selector */}
          <Select
            label="Where did it happen?"
            value={selectedPage}
            onChange={(event) => setSelectedPage(event.target.value)}
          >
            <option value="" disabled>
              Select a page
            </option>

            {PAGE_OPTIONS.map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </Select>

          {/* Problem description */}
          <Textarea
            label="What happened?"
            placeholder="Describe what went wrong and what you were trying to do."
            hint={`Reports are sent to the Toodle team at ${ISSUES_EMAIL}.`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
          />

          {/* Blocking issue */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
            <input
              type="checkbox"
              checked={blocking}
              onChange={(event) => setBlocking(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />

            <span>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                This stopped me from completing my task
              </span>

              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                This helps the team identify urgent problems.
              </span>
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
