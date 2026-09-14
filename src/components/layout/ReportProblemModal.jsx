import { useEffect, useState } from 'react';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Select, Textarea } from '../ui/Input';

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

export default function ReportProblemModal({ open, onClose }) {
  const [selectedPage, setSelectedPage] = useState('');
  const [description, setDescription] = useState('');
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPage('');
      setDescription('');
      setBlocking(false);
    }
  }, [open]);

  const handleSubmit = () => {
    /*
     * Backend reporting endpoint is not connected yet.
     *
     * When it is ready, the frontend will send something like:
     *
     * {
     *   page: selectedPage,
     *   description,
     *   blocking
     * }
     *
     * The backend should determine the authenticated user
     * and create the report with an OPEN status.
     */
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report a problem"
      description="Tell us what went wrong and we'll look into it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled
            title="Problem reporting will be enabled once the backend is connected."
          >
            Submit report
          </Button>
        </>
      }
    >
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
      </div>
    </Modal>
  );
}
