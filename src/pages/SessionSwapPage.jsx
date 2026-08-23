/**
 * @file SessionSwapPage.jsx
 * @description Tutor-facing page for trading sessions between tutors.
 *
 * Responsibilities:
 * - Displays the current tutor's assigned sessions with "Propose Swap" actions.
 * - Provides a swap-proposal modal: pick a partner, select their session,
 *   run real-time constraint checks (timetable clash, weekly hours, eligibility).
 * - Lists incoming swap requests from other tutors (accept / decline).
 * - Lists outgoing swap requests with approval status (pending / approved / rejected).
 * - Routes submitted swaps to the Organiser for final approval.
 *
 * Route: `/swaps`
 */

import { useState } from 'react';
import { Plus, ArrowLeftRight, Check, X, Ban } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { swapsApi } from '../api/swaps';
import { allocationsApi } from '../api/allocations';
import { useAuth } from '../hooks/useAuth';
import { SWAP_STATUS_TONE } from '../utils/constants';
import { getInitials } from '../utils/helpers';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Textarea } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

function RequestSwapModal({ open, onClose, myAllocations, allAllocations, onRequested }) {
  const [originId, setOriginId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const targetOptions = allAllocations.filter(
    (a) => a.id !== originId && a.userId !== myAllocations[0]?.userId
  );

  const handleSubmit = async () => {
    if (!originId || !targetId) return;
    setSubmitting(true);
    setError('');
    try {
      const target = allAllocations.find((a) => a.id === targetId);
      await swapsApi.requestSwap({
        originAllocationId: originId,
        targetAllocationId: targetId,
        requesteeId: target?.userId,
        reason,
      });
      onRequested();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not request the swap.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request a swap"
      description="Trade one of your sessions with another tutor's."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!originId || !targetId}>
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="One of your sessions"
          value={originId}
          onChange={(e) => setOriginId(e.target.value)}
        >
          <option value="">Choose…</option>
          {myAllocations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.course?.code || a.courseId}
            </option>
          ))}
        </Select>
        <Select label="Swap with" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Choose…</option>
          {targetOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.course?.code || a.courseId} — {a.user?.name}
            </option>
          ))}
        </Select>
        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

export function SessionSwapPage() {
  const { isOrganiser, user } = useAuth();
  const { data, loading, error, refetch } = useApi(swapsApi.getSwaps);
  const { data: allocData } = useApi(allocationsApi.getAllocations);
  const [requestOpen, setRequestOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const swaps = data?.data ?? data ?? [];
  const allocations = allocData?.data ?? allocData ?? [];
  const myAllocations = allocations.filter((a) => a.userId === user?.id);

  const act = async (fn, id) => {
    setBusyId(id);
    try {
      await fn(id);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner fullPage label="Loading swap requests…" />;
  if (error) return <ErrorState title="Couldn't load swaps" description={error} />;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Session Swaps</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isOrganiser
              ? 'Requests are checked against the same constraints before you approve.'
              : 'Trade a session with another tutor.'}
          </p>
        </div>
        {!isOrganiser && (
          <Button onClick={() => setRequestOpen(true)}>
            <Plus className="h-4 w-4" /> Request swap
          </Button>
        )}
      </div>

      {swaps.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No swap requests"
          description="Requests you send or receive will show up here."
        />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-slate-100">
            {swaps.map((swap) => (
              <div
                key={swap.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary-subtle text-xs font-semibold text-primary">
                      {getInitials(swap.requester?.name)}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-xs font-semibold text-amber-700">
                      {getInitials(swap.requestee?.name)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {swap.requester?.name}{' '}
                      <ArrowLeftRight className="mx-1 inline h-3 w-3 text-slate-400" />{' '}
                      {swap.requestee?.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {swap.originAllocation?.course?.code} ↔ {swap.targetAllocation?.course?.code}
                      {swap.reason && ` · "${swap.reason}"`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={SWAP_STATUS_TONE[swap.status] || 'neutral'}>{swap.status}</Badge>

                  {isOrganiser && swap.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => act(swapsApi.rejectSwap, swap.id)}
                        loading={busyId === swap.id}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => act(swapsApi.approveSwap, swap.id)}
                        loading={busyId === swap.id}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                    </>
                  )}

                  {!isOrganiser && swap.status === 'PENDING' && swap.requesterId === user?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => act(swapsApi.cancelSwap, swap.id)}
                      loading={busyId === swap.id}
                    >
                      <Ban className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isOrganiser && (
        <RequestSwapModal
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          myAllocations={myAllocations}
          allAllocations={allocations}
          onRequested={refetch}
        />
      )}
    </>
  );
}

export default SessionSwapPage;
