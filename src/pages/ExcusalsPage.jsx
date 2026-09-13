/**
 * @file ExcusalsPage.jsx
 * @description Tutor and organiser workflow for excusal requests.
 *
 * Responsibilities:
 * - Tutors can create and track excusal requests.
 * - Organisers can review pending excusal requests.
 * - Displays pending, approved and declined states.
 *
 * Route: `/excusals`
 */

import { useEffect, useState } from 'react';
import { CalendarX, Plus, Check, X } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { excusalsApi } from '../api/excusals';
import { swapsApi } from '../api/swaps';
import { EXCUSAL_STATUS_TONE } from '../utils/constants';

import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input, Textarea } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
}

function RequestExcusalModal({ open, onClose, allocations, onRequested }) {
  const [allocationId, setAllocationId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setAllocationId('');
      setSessionDate('');
      setReason('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!allocationId || !sessionDate || !reason.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      await excusalsApi.requestExcusal({
        allocationId,
        sessionDate: new Date(sessionDate).toISOString(),
        reason: reason.trim(),
      });

      await onRequested();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit the excusal request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request an excusal"
      description="Request to be excused from one of your allocated sessions."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!allocationId || !sessionDate || !reason.trim()}
          >
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Course"
          value={allocationId}
          onChange={(e) => setAllocationId(e.target.value)}
        >
          <option value="">Choose an active allocation…</option>

          {allocations.map((allocation) => (
            <option key={allocation.id} value={allocation.id}>
              {allocation.course?.code || allocation.courseId}
              {allocation.course?.name ? ` — ${allocation.course.name}` : ''}
            </option>
          ))}
        </Select>

        <Input
          label="Session date and time"
          type="datetime-local"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
        />

        <Textarea
          label="Reason"
          placeholder="Explain why you need to be excused from this session."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function DeclineExcusalModal({ excusal, onClose, onDeclined }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!excusal) {
      setReason('');
      setError('');
    }
  }, [excusal]);

  const handleDecline = async () => {
    if (!excusal) return;

    setSubmitting(true);
    setError('');

    try {
      await excusalsApi.declineExcusal(excusal.id, reason.trim() || undefined);
      await onDeclined();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not decline the excusal.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={Boolean(excusal)}
      onClose={onClose}
      title="Decline excusal"
      description="You may provide a reason for declining this request."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button variant="danger" onClick={handleDecline} loading={submitting}>
            Decline request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Textarea
          label="Decline reason (optional)"
          placeholder="Explain why the request is being declined."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function ExcusalsPage() {
  const { dbUser: user, role } = useAuth();

  const isOrganiser = role?.toUpperCase() === 'ORGANISER';
  const isTutor = role?.toUpperCase() === 'TUTOR';

  const { data, loading, error, refetch } = useApi(excusalsApi.getExcusals);

  const { data: allocationData, error: allocationError } = useApi(swapsApi.getOptions, {
    immediate: isTutor,
  });

  const [requestOpen, setRequestOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const excusals = data?.data ?? data ?? [];
  const allocations = allocationData?.data ?? allocationData ?? [];

  const myActiveAllocations = allocations.filter(
    (allocation) => allocation.userId === user?.id && allocation.status === 'ACTIVE'
  );

  const approve = async (id) => {
    setBusyId(id);
    setActionError('');

    try {
      await excusalsApi.approveExcusal(id);
      await refetch();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not approve the excusal request.'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <Spinner fullPage label="Loading excusal requests…" />;
  }

  if (error) {
    return <ErrorState title="Couldn't load excusals" description={error} />;
  }

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Excusals</h1>

          <p className="mt-2 text-sm text-slate-500">
            {isOrganiser
              ? 'Review and manage tutor excusal requests.'
              : 'Request an excusal and track the status of your requests.'}
          </p>
        </div>

        {isTutor && (
          <Button onClick={() => setRequestOpen(true)} disabled={myActiveAllocations.length === 0}>
            <Plus className="h-4 w-4" />
            Request excusal
          </Button>
        )}
      </div>

      {(actionError || allocationError) && (
        <p role="alert" className="mb-4 text-sm text-rose-600">
          {actionError || allocationError}
        </p>
      )}

      {isTutor && myActiveAllocations.length === 0 && (
        <p className="mb-4 text-sm text-slate-500">
          You need an active allocation before you can request an excusal.
        </p>
      )}

      {excusals.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No excusal requests"
          description={
            isTutor
              ? 'Your excusal requests will appear here.'
              : 'Tutor excusal requests will appear here.'
          }
        />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-slate-100">
            {excusals.map((excusal) => (
              <div
                key={excusal.id}
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-800">
                      {excusal.allocation?.course?.code || 'Course'}
                    </p>

                    <Badge tone={EXCUSAL_STATUS_TONE[excusal.status] || 'neutral'}>
                      {excusal.status}
                    </Badge>
                  </div>

                  {excusal.allocation?.course?.name && (
                    <p className="mt-1 text-sm text-slate-500">{excusal.allocation.course.name}</p>
                  )}

                  {isOrganiser && (
                    <p className="mt-1 text-sm text-slate-600">
                      {excusal.user?.name || excusal.user?.email || 'Tutor'}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-400">
                    Session: {new Date(excusal.sessionDate).toLocaleString()}
                  </p>

                  {excusal.reason && (
                    <p className="mt-2 text-sm text-slate-600">{excusal.reason}</p>
                  )}

                  {excusal.reviewedBy && (
                    <p className="mt-2 text-xs text-slate-400">
                      Reviewed by {excusal.reviewedBy.name}
                      {excusal.reviewedAt
                        ? ` · ${new Date(excusal.reviewedAt).toLocaleString()}`
                        : ''}
                    </p>
                  )}
                </div>

                {isOrganiser && excusal.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDeclineTarget(excusal)}
                      disabled={busyId === excusal.id}
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => approve(excusal.id)}
                      loading={busyId === excusal.id}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {isTutor && (
        <RequestExcusalModal
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          allocations={myActiveAllocations}
          onRequested={refetch}
        />
      )}

      {isOrganiser && (
        <DeclineExcusalModal
          excusal={declineTarget}
          onClose={() => setDeclineTarget(null)}
          onDeclined={refetch}
        />
      )}
    </>
  );
}

export default ExcusalsPage;
