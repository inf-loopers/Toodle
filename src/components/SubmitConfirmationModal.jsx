import { useState, useEffect } from 'react';
import {
  Send,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';

import Modal from './ui/Modal';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { formatShortDate } from '../utils/helpers';

/**
 * SubmitConfirmationModal
 *
 * Explicit confirmation dialog for tutors before submitting a timesheet.
 * Shows exactly what will be submitted and requires explicit acknowledgment.
 */
export function SubmitConfirmationModal({
  timesheet,
  open,
  onClose,
  onConfirm,
  isResubmission = false,
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setSubmitting(false);
      setShowSuccess(false);
    }
  }, [open]);

  if (!timesheet) {
    return null;
  }

  const entries = timesheet.entries || [];
  const totalHours = Number(timesheet.totalHours || 0);
  const entryCount = entries.length;
  const snapshotVersion = (timesheet.submittedSnapshot?.length || 0) + 1;

  // Compute comparison between disputed snapshot and current entries
  const snapshots = timesheet.submittedSnapshot || [];
  const disputedSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const disputedEntries = disputedSnapshot?.entries || [];
  const disputedHours = Number(disputedSnapshot?.totalHours || 0);
  const disputedCount = disputedEntries.length;

  // Calculate changes
  const hoursDiff = totalHours - disputedHours;
  const entriesDiff = entryCount - disputedCount;
  const hasChanges = hoursDiff !== 0 || entriesDiff !== 0;

  const handleSubmit = async () => {
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await onConfirm();
      setShowSuccess(true);
      // Close after showing success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isResubmission ? 'Re-submit timesheet' : 'Submit timesheet'}
      description="Review and confirm before submission"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!confirmed}>
            <Send className="h-4 w-4" />
            {isResubmission ? 'Re-submit' : 'Submit'} timesheet
          </Button>
        </>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Success state */}
        {showSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-200">
                <CheckCircle2 className="h-6 w-6 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-green-800">
                  {isResubmission ? 'Re-submitted successfully!' : 'Submitted successfully!'}
                </p>
                {isResubmission && hasChanges && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="font-medium text-green-700">Your corrections:</p>
                    <div className="rounded-lg bg-white p-3">
                      {hoursDiff !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Hours changed:</span>
                          <span className="font-medium text-slate-800">
                            {disputedHours}h → {totalHours}h ({hoursDiff > 0 ? '+' : ''}
                            {hoursDiff}h)
                          </span>
                        </div>
                      )}
                      {entriesDiff !== 0 && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-slate-600">Entries changed:</span>
                          <span className="font-medium text-slate-800">
                            {disputedCount} → {entryCount} ({entriesDiff > 0 ? '+' : ''}
                            {entriesDiff})
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-green-700">
                      Your timesheet is now under review. You'll be notified once it's approved or
                      if further changes are needed.
                    </p>
                  </div>
                )}
                {!isResubmission && (
                  <p className="mt-2 text-sm text-green-700">
                    Your timesheet is now under review. You'll be notified once it's approved.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning banner */}
        {!showSuccess && (
          <>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Important: Submitted timesheets cannot be edited
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Once submitted, this exact version will be preserved for review. You can only
                    make changes if the timesheet is disputed and returned to you.
                  </p>
                </div>
              </div>
            </div>

            {/* Submission details */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Submission details</h4>
              <div className="space-y-2 text-sm">
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
                {isResubmission && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Submission version:</span>
                    <Badge tone="neutral">v{snapshotVersion}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Comparison summary for re-submissions */}
            {isResubmission && hasChanges && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <ArrowRight className="h-4 w-4" />
                  Changes from disputed version
                </h4>
                <div className="space-y-2 text-sm">
                  {hoursDiff !== 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Total hours:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{disputedHours}h</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="font-medium text-slate-800">{totalHours}h</span>
                        <Badge tone={hoursDiff > 0 ? 'positive' : 'negative'}>
                          {hoursDiff > 0 ? '+' : ''}
                          {hoursDiff}h
                        </Badge>
                      </div>
                    </div>
                  )}
                  {entriesDiff !== 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Entries:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{disputedCount}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="font-medium text-slate-800">{entryCount}</span>
                        <Badge tone={entriesDiff > 0 ? 'positive' : 'negative'}>
                          {entriesDiff > 0 ? '+' : ''}
                          {entriesDiff}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-blue-700">
                  Your corrections have been applied. Review the changes above before re-submitting.
                </p>
              </div>
            )}

            {isResubmission && !hasChanges && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">No changes detected</p>
                    <p className="mt-1 text-xs text-amber-700">
                      You're re-submitting the same hours and entries that were disputed. Consider
                      reviewing the dispute reason and making corrections before re-submitting.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  I confirm that the hours logged are accurate and complete to the best of my
                  knowledge.
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
                    Submitted by
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {timesheet.user?.name || 'Tutor'}
                  </p>
                  <p className="text-xs text-slate-500">Tutor</p>
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
          </>
        )}
      </div>
    </Modal>
  );
}

export default SubmitConfirmationModal;
