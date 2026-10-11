import { useState, useEffect } from 'react';
import { CheckCircle2, User, Calendar, Clock, Eye } from 'lucide-react';

import Modal from './ui/Modal';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { formatShortDate } from '../utils/helpers';

/**
 * ApproveConfirmationModal
 *
 * Explicit confirmation dialog for organisers before approving a timesheet.
 * Shows exactly what will be approved and requires explicit acknowledgment.
 */
export function ApproveConfirmationModal({ timesheet, open, onClose, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setApproving(false);
    }
  }, [open]);

  if (!timesheet) {
    return null;
  }

  const entries = timesheet.entries || [];
  const totalHours = Number(timesheet.totalHours || 0);
  const entryCount = entries.length;
  const snapshotVersion = timesheet.submittedSnapshot?.length || 1;

  const handleApprove = async () => {
    if (!confirmed) return;

    setApproving(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve timesheet"
      description="Review and confirm before approval"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={approving}>
            Cancel
          </Button>
          <Button onClick={handleApprove} loading={approving} disabled={!confirmed}>
            <CheckCircle2 className="h-4 w-4" />
            Approve timesheet
          </Button>
        </>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Review info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                You are approving the submitted version
              </p>
              <p className="mt-1 text-xs text-blue-700">
                This approval confirms you have reviewed the exact submitted version and verified
                the hours are accurate.
              </p>
            </div>
          </div>
        </div>

        {/* Approval details */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-800">Approval details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Tutor:</span>
              <span className="font-medium text-slate-800">
                {timesheet.user?.name || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Course:</span>
              <span className="font-medium text-slate-800">
                {timesheet.course?.code || 'General'}
                {timesheet.course?.name ? ` — ${timesheet.course.name}` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Week:</span>
              <span className="font-medium text-slate-800">
                {formatShortDate(timesheet.weekStartDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total hours:</span>
              <span className="font-medium text-slate-800">{totalHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Entries:</span>
              <span className="font-medium text-slate-800">{entryCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Submission version:</span>
              <Badge tone="neutral">v{snapshotVersion}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Submitted on:</span>
              <span className="font-medium text-slate-800">
                {timesheet.submittedAt ? formatShortDate(timesheet.submittedAt) : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            <span className="text-sm text-slate-700">
              I confirm that I have reviewed the submitted timesheet and approve the hours as
              accurate and complete.
            </span>
          </label>
        </div>

        {/* Signature block */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
              <User className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Approved by
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {timesheet.approverName || 'Organiser'}
              </p>
              <p className="text-xs text-slate-500">
                {timesheet.approverRole || 'Course Coordinator'}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatShortDate(new Date().toISOString())}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ApproveConfirmationModal;
