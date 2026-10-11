import { CheckCircle2, XCircle, Send, Clock, User, Calendar, ArrowRight } from 'lucide-react';
import { formatShortDate } from '../utils/helpers';
import Badge from './ui/Badge';

/**
 * TimesheetAuditTrail
 *
 * Displays the complete history of actions on a timesheet:
 * - Created (DRAFT)
 * - Submitted (with version number)
 * - Disputed (with reason and the reviewer who disputed)
 * - Re-submitted (with version number)
 * - Approved (with the reviewer who approved)
 *
 * This provides full transparency into the timesheet lifecycle.
 */
const roleLabel = (role) => (role === 'ADMIN' ? 'Administrator' : 'Course Coordinator');

export function TimesheetAuditTrail({ timesheet }) {
  if (!timesheet) {
    return null;
  }

  const snapshots = timesheet.submittedSnapshot || [];
  const auditEvents = [];

  // 1. Created event
  auditEvents.push({
    type: 'created',
    timestamp: timesheet.createdAt,
    user: timesheet.user?.name || 'Tutor',
    role: 'Tutor',
    icon: Clock,
    color: 'slate',
    title: 'Timesheet created',
    description: 'Draft timesheet created',
  });

  // 2. Process each submission snapshot
  snapshots.forEach((snapshot, index) => {
    const version = index + 1;

    // Submission event
    auditEvents.push({
      type: 'submitted',
      timestamp: snapshot.submittedAt,
      user: timesheet.user?.name || 'Tutor',
      role: 'Tutor',
      icon: Send,
      color: 'blue',
      title: `Submitted (v${version})`,
      description: `${Number(snapshot.totalHours || 0)}h logged across ${snapshot.entries?.length || 0} entries`,
      version,
    });

    // Each dispute is stamped onto the version it sent back. The latest
    // version falls back to the timesheet's live dispute fields.
    const isLatest = index === snapshots.length - 1;
    const disputed = snapshot.disputedAt || (isLatest ? timesheet.status === 'DISPUTED' : true);
    if (disputed) {
      const disputedBy = snapshot.disputedBy || (isLatest ? timesheet.disputedBy : null);
      auditEvents.push({
        type: 'disputed',
        timestamp:
          snapshot.disputedAt || (isLatest && timesheet.disputedAt) || snapshot.submittedAt,
        user: disputedBy?.name || 'Course coordinator (not recorded)',
        role: roleLabel(disputedBy?.role),
        icon: XCircle,
        color: 'amber',
        title: `Disputed (v${version})`,
        description:
          snapshot.disputeReason ||
          (isLatest && timesheet.disputeReason) ||
          'Timesheet disputed',
        version,
      });
    }
  });

  // 4. Approval event
  if (timesheet.status === 'APPROVED' && timesheet.approvedAt) {
    auditEvents.push({
      type: 'approved',
      timestamp: timesheet.approvedAt,
      user: timesheet.approvedBy?.name || 'Course coordinator (not recorded)',
      role: roleLabel(timesheet.approvedBy?.role),
      icon: CheckCircle2,
      color: 'green',
      title: 'Approved',
      description: `Timesheet approved after review`,
    });
  }

  // Sort by timestamp
  auditEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const colorClasses = {
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h4 className="mb-4 text-sm font-semibold text-slate-800">Audit trail</h4>

      <div className="space-y-3">
        {auditEvents.map((event, index) => {
          const Icon = event.icon;
          const colors = colorClasses[event.color] || colorClasses.slate;

          return (
            <div key={index} className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${colors.bg}`}
              >
                <Icon className={`h-4 w-4 ${colors.text}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                  {event.version && <Badge tone="neutral">v{event.version}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{event.description}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{event.user}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatShortDate(event.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {index < auditEvents.length - 1 && (
                <div className="absolute left-4 mt-10 h-4 w-0.5 bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Total events:</span>
          <span className="font-medium text-slate-800">{auditEvents.length}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-slate-600">Submissions:</span>
          <span className="font-medium text-slate-800">{snapshots.length}</span>
        </div>
        {snapshots.length > 1 && (
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-600">Disputes:</span>
            <span className="font-medium text-slate-800">{snapshots.length - 1}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimesheetAuditTrail;
