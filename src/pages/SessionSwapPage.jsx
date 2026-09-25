/**
 * @file SessionSwapPage.jsx
 * @description Tutor-facing page for trading sessions between tutors.
 *
 * Responsibilities:
 * - Lets tutors propose trades using their active allocations and partner options.
 * - Displays incoming/outgoing requests and persisted validation warnings.
 * - Lets staff approve/reject and requesters cancel pending swaps.
 * - Surfaces constraint failures returned by the API.
 *
 * Route: `/swaps`
 */

import { useState } from 'react';
import { Plus, ArrowLeftRight, Check, X, Ban } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { swapsApi } from '../api/swaps';
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

function swapErrorMessage(err) {
  const body = err?.response?.data;
  const details = body?.details;
  const warnings = details
    ? (Array.isArray(details)
        ? details
        : Object.entries(details).flatMap(([side, entries]) =>
            (Array.isArray(entries) ? entries : []).map((warning) => ({
              ...warning,
              message: `${side === 'requester' ? 'Requesting tutor' : 'Other tutor'}: ${warning.message}`,
            }))
          )
      )
        .map((warning) => warning.message)
        .join(' ')
    : '';
  return [body?.error || body?.message || err.message || 'Could not update the swap.', warnings]
    .filter(Boolean)
    .join(' ');
}

function RequestSwapModal({
  open,
  onClose,
  myAllocations,
  allAllocations,
  onRequested,
  onRefreshOptions,
}) {
  const [originId, setOriginId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const targetOptions = allAllocations.filter(
    (a) =>
      a.status === 'ACTIVE' &&
      a.userId !== myAllocations[0]?.userId &&
      a.courseId !== myAllocations.find((origin) => origin.id === originId)?.courseId
  );

  const handleSubmit = async () => {
    if (
      submitting ||
      !myAllocations.some((a) => a.id === originId) ||
      !targetOptions.some((a) => a.id === targetId)
    )
      return;
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
      onClose();
      await onRequested();
    } catch (err) {
      setError(swapErrorMessage(err));
      if ([404, 409].includes(err?.response?.status)) {
        setOriginId('');
        setTargetId('');
        try {
          await onRefreshOptions();
          setError(
            `${swapErrorMessage(err)} Choices refreshed; please select your allocations again.`
          );
        } catch {
          setError(
            `${swapErrorMessage(err)} Could not refresh choices. Close this form and try again.`
          );
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Request a swap"
      description="Exchange entire course allocations, including all their sessions and weekly hours. The other tutor must accept, then a course coordinator must approve."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
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
          label="Your course allocation"
          value={originId}
          onChange={(e) => {
            setOriginId(e.target.value);
            setTargetId('');
          }}
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
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {myAllocations.length === 0 && (
          <p>You need an active course allocation to request a swap.</p>
        )}
        {originId && targetOptions.length === 0 && (
          <p>No other course allocations are available to swap.</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function SessionSwapPage() {
  const { dbUser: user, isStaff, isTutor } = useAuth();
  const { data, loading, error, refetch } = useApi(swapsApi.getSwaps);
  const {
    data: allocData,
    error: optionsError,
    refetch: refetchOptions,
  } = useApi(swapsApi.getOptions, { immediate: isTutor });
  const [requestOpen, setRequestOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [opening, setOpening] = useState(false);

  const openRequest = async () => {
    if (opening) return;
    setOpening(true);
    setActionError('');
    try {
      await refetchOptions();
      setRequestOpen(true);
    } catch (err) {
      setActionError(swapErrorMessage(err));
    } finally {
      setOpening(false);
    }
  };

  const swaps = data?.data ?? data ?? [];
  const allocations = allocData?.data ?? allocData ?? [];
  const myAllocations = allocations.filter((a) => a.userId === user?.id && a.status === 'ACTIVE');

  const act = async (fn, id) => {
    if (busyId) return;
    setBusyId(id);
    setActionError('');
    try {
      await fn(id);
      await refetch();
      if (isTutor) await refetchOptions();
    } catch (err) {
      setActionError(swapErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <Spinner fullPage label="Loading swap requests…" />;
  if (error && !data) return <ErrorState title="Couldn't load swaps" description={error} />;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Session Swaps</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isStaff
              ? 'Requests are checked against the same constraints before you approve.'
              : 'Exchange course allocations with another tutor, subject to coordinator approval.'}
          </p>
        </div>
        {isTutor && (
          <Button onClick={openRequest} loading={opening}>
            <Plus className="h-4 w-4" /> Request swap
          </Button>
        )}
      </div>

      {(actionError || optionsError || error) && (
        <p role="alert" className="mb-4 text-sm text-rose-600">
          {actionError || optionsError || error}
        </p>
      )}

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
                      {swap.requesterAllocation?.course?.code} ↔{' '}
                      {swap.targetAllocation?.course?.code}
                      {swap.reason && ` · "${swap.reason}"`}
                    </p>
                    {Object.entries(swap.validationWarnings || {}).flatMap(([side, warnings]) =>
                      (Array.isArray(warnings) ? warnings : []).map((warning, index) => (
                        <p key={`${side}-${index}`} className="mt-1 text-xs text-amber-700">
                          {side === 'requester' ? swap.requester?.name : swap.requestee?.name}:{' '}
                          {warning.message}
                        </p>
                      ))
                    )}
                    {swap.rejectionReason && (
                      <p className="mt-1 text-xs text-rose-600">
                        Rejection reason: {swap.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={SWAP_STATUS_TONE[swap.status] || 'neutral'}>{swap.status}</Badge>
                  {swap.status === 'PENDING' && (
                    <span className="text-xs text-slate-500">
                      {swap.requesteeAcceptedAt
                        ? 'Tutor accepted · awaiting coordinator'
                        : 'Awaiting other tutor’s acceptance'}
                    </span>
                  )}
                  {isTutor && swap.status === 'PENDING' && swap.requesteeId === user?.id && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={Boolean(busyId)}
                        onClick={() => act(swapsApi.declineSwap, swap.id)}
                      >
                        Decline
                      </Button>
                      {!swap.requesteeAcceptedAt && (
                        <Button
                          size="sm"
                          disabled={Boolean(busyId)}
                          onClick={() => act(swapsApi.acceptSwap, swap.id)}
                        >
                          Accept swap
                        </Button>
                      )}
                    </>
                  )}

                  {isStaff && swap.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => act(swapsApi.rejectSwap, swap.id)}
                        loading={busyId === swap.id}
                        disabled={Boolean(busyId)}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => act(swapsApi.approveSwap, swap.id)}
                        loading={busyId === swap.id}
                        disabled={Boolean(busyId) || !swap.requesteeAcceptedAt}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                    </>
                  )}

                  {!isStaff && swap.status === 'PENDING' && swap.requesterId === user?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => act(swapsApi.cancelSwap, swap.id)}
                      loading={busyId === swap.id}
                      disabled={Boolean(busyId)}
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

      {isTutor && requestOpen && (
        <RequestSwapModal
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          myAllocations={myAllocations}
          allAllocations={allocations}
          onRequested={refetch}
          onRefreshOptions={refetchOptions}
        />
      )}
    </>
  );
}

export default SessionSwapPage;
