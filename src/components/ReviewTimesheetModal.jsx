import { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  FileText,
  Clock,
  AlertCircle,
  XCircle,
  User,
  Calendar,
  CheckCircle2,
  List,
} from 'lucide-react';

import Modal from './ui/Modal';
import Badge from './ui/Badge';
import { formatShortDate } from '../utils/helpers';
import { TimesheetAuditTrail } from './TimesheetAuditTrail';
import { TimesheetEntryLog } from './TimesheetEntryLog';

/**
 * ReviewTimesheetModal
 *
 * Read-only inspection of the exact submitted timesheet version.
 * Both tutors and organisers see the same frozen snapshot.
 *
 * For DISPUTED timesheets: shows side-by-side comparison
 * (disputed snapshot vs current draft entries).
 */
export function ReviewTimesheetModal({ timesheet, open, onClose }) {
  const [activeTab, setActiveTab] = useState('snapshot');

  useEffect(() => {
    if (!open) {
      setActiveTab('snapshot');
    }
  }, [open]);

  if (!timesheet) {
    return null;
  }

  // Get the latest submission snapshot
  const snapshots = timesheet.submittedSnapshot || [];
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const snapshotVersion = snapshots.length;

  // For disputed timesheets, we have current live entries
  const currentEntries = timesheet.entries || [];
  const isDisputed = timesheet.status === 'DISPUTED';
  const hasSnapshot = latestSnapshot !== null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review timesheet"
      description={
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-500" />
          <span>
            {timesheet.course?.code || 'Timesheet'}
            {timesheet.user?.name ? ` · ${timesheet.user.name}` : ''}
          </span>
        </div>
      }
      footer={
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Close
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Submission info banner */}
        {hasSnapshot && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                <FileText className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {isDisputed ? 'Disputed submission' : 'Submitted version'}
                    {snapshotVersion > 1 && ` · v${snapshotVersion}`}
                  </p>
                  <Badge tone="neutral">Read-only</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted on {formatShortDate(latestSnapshot.submittedAt)} ·{' '}
                  {Number(latestSnapshot.totalHours || 0)}h total
                </p>
                {snapshotVersion > 1 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Re-submission #{snapshotVersion} after dispute
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs for disputed timesheets */}
        {isDisputed && hasSnapshot ? (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('snapshot')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'snapshot'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="mr-2 inline h-4 w-4" />
                Disputed snapshot
              </button>
              <button
                onClick={() => setActiveTab('current')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'current'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="mr-2 inline h-4 w-4" />
                Current draft
              </button>
              <button
                onClick={() => setActiveTab('dispute')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'dispute'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <XCircle className="mr-2 inline h-4 w-4" />
                Dispute info
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'audit'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="mr-2 inline h-4 w-4" />
                Audit trail
              </button>
            </div>

            {activeTab === 'snapshot' ? (
              <SnapshotEntries snapshot={latestSnapshot} courseCode={timesheet.course?.code} />
            ) : activeTab === 'current' ? (
              <CurrentEntries
                entries={currentEntries}
                totalHours={timesheet.totalHours}
                courseCode={timesheet.course?.code}
              />
            ) : activeTab === 'audit' ? (
              <TimesheetAuditTrail timesheet={timesheet} />
            ) : (
              <DisputeInfo timesheet={timesheet} snapshots={snapshots} />
            )}
          </div>
        ) : hasSnapshot && snapshotVersion > 1 ? (
          // Previously disputed but now re-submitted - show tabs with history
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('snapshot')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'snapshot'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="mr-2 inline h-4 w-4" />
                Latest submission
              </button>
              <button
                onClick={() => setActiveTab('dispute')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'dispute'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <XCircle className="mr-2 inline h-4 w-4" />
                Dispute history
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'audit'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="mr-2 inline h-4 w-4" />
                Audit trail
              </button>
            </div>

            {activeTab === 'snapshot' ? (
              <SnapshotEntries snapshot={latestSnapshot} courseCode={timesheet.course?.code} />
            ) : activeTab === 'audit' ? (
              <TimesheetAuditTrail timesheet={timesheet} />
            ) : (
              <DisputeInfo timesheet={timesheet} snapshots={snapshots} />
            )}
          </div>
        ) : hasSnapshot ? (
          // Non-disputed: show snapshot and audit trail tabs
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('snapshot')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'snapshot'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="mr-2 inline h-4 w-4" />
                Submitted version
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'audit'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="mr-2 inline h-4 w-4" />
                Audit trail
              </button>
            </div>

            {activeTab === 'snapshot' ? (
              <SnapshotEntries snapshot={latestSnapshot} courseCode={timesheet.course?.code} />
            ) : (
              <TimesheetAuditTrail timesheet={timesheet} />
            )}
          </div>
        ) : (
          // No snapshot (shouldn't happen for SUBMITTED/APPROVED, but handle gracefully)
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">No submission snapshot</p>
                <p className="mt-1 text-xs text-amber-700">
                  This timesheet hasn't been submitted yet or the snapshot is missing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * SnapshotEntries - Read-only display of submitted snapshot entries
 */
function SnapshotEntries({ snapshot, courseCode }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white">
        <TimesheetEntryLog
          entries={snapshot.entries || []}
          courseCode={courseCode}
          locked
          emptyMessage="No entries in this submission."
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-700">
          Total (submitted): {Number(snapshot.totalHours || 0)}h
        </p>
      </div>
    </div>
  );
}

/**
 * CurrentEntries - Display of current live entries (for disputed timesheets)
 */
function CurrentEntries({ entries, totalHours, courseCode }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white">
        <TimesheetEntryLog
          entries={entries}
          courseCode={courseCode}
          emptyMessage="No entries in current draft."
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-700">
          Total (current): {Number(totalHours || 0)}h
        </p>
      </div>
    </div>
  );
}

/**
 * DisputeInfo - Display dispute information and history
 */
function DisputeInfo({ timesheet, snapshots }) {
  const isDisputed = timesheet.status === 'DISPUTED';
  const disputeReason = timesheet.disputeReason;
  const snapshotVersion = snapshots.length;

  return (
    <div className="space-y-4">
      {/* Current dispute (if DISPUTED status) */}
      {isDisputed && disputeReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
              <XCircle className="h-4 w-4 text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Current dispute</p>
              <p className="mt-1 text-xs text-amber-700">
                Submission v{snapshotVersion} was disputed
              </p>
            </div>
          </div>

          <div className="ml-11 space-y-2">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</p>
              <p className="mt-1 text-sm text-slate-800">{disputeReason}</p>
            </div>

            {timesheet.disputedAt && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatShortDate(timesheet.disputedAt)}</span>
                </div>
                {timesheet.disputedBy?.name && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{timesheet.disputedBy.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispute history (inferred from multiple submission versions) */}
      {snapshotVersion > 1 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Dispute history</p>
              <p className="mt-1 text-xs text-slate-500">
                {snapshotVersion - 1} dispute{snapshotVersion - 1 > 1 ? 's' : ''} recorded
              </p>
            </div>
          </div>

          <div className="ml-11 space-y-3">
            {snapshots.slice(0, -1).map((snapshot, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Submission v{index + 1}</p>
                  <Badge tone="neutral">Disputed</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted on {formatShortDate(snapshot.submittedAt)} ·{' '}
                  {Number(snapshot.totalHours || 0)}h
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Tutor re-submitted as v{index + 2} after corrections
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No disputes */}
      {!isDisputed && snapshotVersion <= 1 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">No disputes</p>
              <p className="mt-1 text-xs text-green-700">This timesheet has never been disputed.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewTimesheetModal;
