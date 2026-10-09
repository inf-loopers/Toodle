import FeatureHeading from '../components/layout/FeatureHeading';
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { swapsApi } from '../api/swaps';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Select, Textarea } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/EmptyState';

const unwrap = (value) => value?.data ?? value ?? [];
function message(error) {
  const body = error?.response?.data;
  const details = body?.details;
  const warnings = Array.isArray(details) ? details : Object.values(details || {}).flat();
  return [
    body?.error || error?.message || 'Could not update the swap.',
    ...warnings.map((w) => w.message),
  ].join(' ');
}
function describe(slot) {
  return slot
    ? `${slot.course?.code || 'Course'} · ${String(slot.sessionDate).slice(0, 10)} · ${slot.startTime}–${slot.endTime} · ${slot.sessionType}`
    : 'Legacy course allocation';
}
function historyLabel(entry) {
  if (entry.action === 'CREATE') return 'Swap requested';
  if (entry.action === 'RESTORE') return 'Swap reversed';
  if (entry.action === 'APPROVE') return 'Swap approved';
  if (entry.after?.status === 'CANCELLED') return 'Request cancelled';
  if (entry.action === 'REJECT') return 'Request rejected or declined';
  if (entry.after?.requesteeAcceptedAt) return 'Tutor accepted';
  return 'Request updated';
}
function RequestModal({ options, userId, onClose, onSaved, refresh }) {
  const [originId, setOriginId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const origin = options.find((s) => s.id === originId && s.userId === userId);
  const target = options.find((s) => s.id === targetId && s.userId !== userId);
  const payload =
    origin && target
      ? {
          requesterAllocationId: origin.allocationId,
          requesterSessionId: origin.sessionId,
          requesterSessionDate: origin.sessionDate,
          targetAllocationId: target.allocationId,
          targetSessionId: target.sessionId,
          targetSessionDate: target.sessionDate,
        }
      : null;
  const payloadKey = JSON.stringify(payload);
  useEffect(() => {
    let stale = false;
    setPreview(null);
    const proposal = JSON.parse(payloadKey);
    if (!proposal) {
      setChecking(false);
      return;
    }
    setChecking(true);
    swapsApi
      .previewSwap(proposal)
      .then((result) => {
        if (!stale) setPreview({ ...unwrap(result), key: payloadKey });
      })
      .catch((err) => {
        if (!stale) setError(message(err));
      })
      .finally(() => {
        if (!stale) setChecking(false);
      });
    return () => {
      stale = true;
    };
  }, [payloadKey]);
  const eligible = preview?.key === payloadKey && preview?.isValid && !checking;
  const send = async () => {
    if (!eligible || busy) return;
    setBusy(true);
    setError('');
    try {
      await swapsApi.requestSwap({ ...payload, reason });
      onClose();
      await onSaved();
    } catch (err) {
      setError(message(err));
      if ([404, 409].includes(err?.response?.status)) {
        setOriginId('');
        setTargetId('');
        try {
          await refresh();
        } catch (refreshError) {
          setError(message(refreshError));
        }
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Request a swap"
      description="Exchange two dated sessions. Your course assignments stay in place. Times are Africa/Johannesburg."
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!eligible || busy} onClick={send}>
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Your session"
          value={originId}
          onChange={(e) => {
            setError('');
            setOriginId(e.target.value);
            setTargetId('');
          }}
        >
          <option value="">Choose a session…</option>
          {options
            .filter((s) => s.userId === userId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {describe(s)} · {s.hours}h
              </option>
            ))}
        </Select>
        <Select
          label="Other tutor’s session"
          value={targetId}
          onChange={(e) => {
            setError('');
            setTargetId(e.target.value);
          }}
        >
          <option value="">Choose a session…</option>
          {options
            .filter((s) => s.userId !== userId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.user?.name} · {describe(s)} · {s.hours}h
              </option>
            ))}
        </Select>
        <p className="text-xs text-slate-500">
          Available sessions in the next eight weeks. The other tutor must accept, then an organiser
          approves.
        </p>
        {checking && <p role="status">Checking both tutors…</p>}
        {preview?.key === payloadKey && (
          <div aria-live="polite" className="space-y-2">
            <p className={preview.isValid ? 'text-emerald-700' : 'text-rose-700'}>
              {preview.isValid
                ? 'Both tutors can take these sessions.'
                : 'This exchange needs attention.'}
            </p>
            {['requester', 'requestee'].map((side) => (
              <div key={side}>
                <p className="text-sm font-semibold">
                  {side === 'requester' ? 'You' : target?.user?.name || 'Other tutor'}
                </p>
                {(preview[side]?.warnings || []).map((w, i) => (
                  <p key={i} className="text-sm text-rose-700">
                    {w.message}
                  </p>
                ))}
                {(preview[side]?.weeklyHours || []).map((w) => (
                  <p key={w.week} className="text-xs">
                    Week of {w.week}: {w.hours}h planned · {w.remainingHours}h remaining
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
        <Textarea
          label="Reason (optional)"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function SessionSwapPage() {
  const { dbUser: user, isTutor, isStaff } = useAuth();
  const { data, loading, error, refetch } = useApi(swapsApi.getSwaps);
  const { data: choices, refetch: refreshOptions } = useApi(swapsApi.getOptions, {
    immediate: isTutor,
  });
  const [requestOpen, setRequestOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState(null);
  const act = async (operation) => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await operation();
      setDecision(null);
      await refetch();
      if (isTutor) await refreshOptions();
    } catch (err) {
      setActionError(message(err));
    } finally {
      setBusy(false);
    }
  };
  const openRequest = async () => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await refreshOptions();
      setRequestOpen(true);
    } catch (err) {
      setActionError(message(err));
    } finally {
      setBusy(false);
    }
  };
  const showHistory = async (swap) => {
    setHistory({ swap, loading: true });
    try {
      const result = await swapsApi.getHistory(swap.id);
      setHistory({ swap, entries: unwrap(result) });
    } catch (err) {
      setHistory({ swap, error: message(err) });
    }
  };
  if (loading && !data) return <Spinner fullPage label="Loading swap requests…" />;
  if (error && !data) return <ErrorState title="Couldn't load swaps" description={error} />;
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <FeatureHeading className="text-3xl font-bold">Session Swaps</FeatureHeading>
          <p className="mt-2 text-sm text-slate-500">
            Trade one session at a time, with tutor consent and organiser approval.
          </p>
        </div>
        {isTutor && (
          <Button loading={busy} onClick={openRequest}>
            Request swap
          </Button>
        )}
      </div>
      {actionError && (
        <p role="alert" className="mb-4 text-rose-700">
          {actionError}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!unwrap(data).length && <p>No swap requests</p>}
      <div className="space-y-4">
        {unwrap(data).map((swap) => {
          const dated = Boolean(swap.requesterOccurrence && swap.targetOccurrence);
          return (
            <Card key={swap.id}>
              <div className="space-y-3">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">
                    {swap.requester?.name} ↔ {swap.requestee?.name}
                  </p>
                  <Badge tone={swap.status === 'APPROVED' ? 'emerald' : 'neutral'}>
                    {swap.status}
                  </Badge>
                </div>
                <p className="text-sm">
                  {swap.requester?.name} offers: {describe(swap.requesterOccurrence)}
                </p>
                <p className="text-sm">
                  {swap.requestee?.name} offers: {describe(swap.targetOccurrence)}
                </p>
                {swap.reason && <p className="text-sm">Reason: {swap.reason}</p>}
                {!dated && (
                  <p className="text-amber-700">
                    Historical course swap. Pending requests need to be submitted again as dated
                    sessions.
                  </p>
                )}
                {swap.status === 'PENDING' && (
                  <p className="text-sm">
                    {swap.requesteeAcceptedAt
                      ? 'Tutor accepted · awaiting organiser'
                      : 'Awaiting other tutor’s acceptance'}
                  </p>
                )}
                {swap.rejectionReason && <p>Rejection reason: {swap.rejectionReason}</p>}
                {swap.reversalReason && <p>Reversal reason: {swap.reversalReason}</p>}
                <div className="flex flex-wrap gap-2">
                  {isTutor && swap.status === 'PENDING' && swap.requesteeId === user?.id && (
                    <>
                      {dated && !swap.requesteeAcceptedAt && (
                        <Button
                          disabled={busy}
                          onClick={() => act(() => swapsApi.acceptSwap(swap.id))}
                        >
                          Accept swap
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => act(() => swapsApi.declineSwap(swap.id))}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {swap.status === 'PENDING' && swap.requesterId === user?.id && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => act(() => swapsApi.cancelSwap(swap.id))}
                    >
                      Cancel
                    </Button>
                  )}
                  {isStaff && swap.status === 'PENDING' && (
                    <>
                      <Button
                        disabled={busy || !dated || !swap.requesteeAcceptedAt}
                        onClick={() => act(() => swapsApi.approveSwap(swap.id))}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          setReason('');
                          setDecision({ swap, action: 'reject' });
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {isStaff && dated && swap.status === 'APPROVED' && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setReason('');
                        setDecision({ swap, action: 'reverse' });
                      }}
                    >
                      Reverse swap
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => showHistory(swap)}>
                    View history
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {requestOpen && (
        <RequestModal
          options={unwrap(choices)}
          userId={user?.id}
          onClose={() => setRequestOpen(false)}
          onSaved={refetch}
          refresh={refreshOptions}
        />
      )}
      {decision && (
        <Modal
          open
          onClose={busy ? undefined : () => setDecision(null)}
          title={decision.action === 'reject' ? 'Reject swap' : 'Reverse swap'}
          description={
            decision.action === 'reverse'
              ? 'Restore both original responsibilities. Future dates and eligibility will be checked again.'
              : 'Explain your decision to both tutors.'
          }
          footer={
            <Button
              loading={busy}
              disabled={!reason.trim() || busy}
              onClick={() =>
                act(() =>
                  decision.action === 'reject'
                    ? swapsApi.rejectSwap(decision.swap.id, reason.trim())
                    : swapsApi.reverseSwap(decision.swap.id, reason.trim())
                )
              }
            >
              Confirm {decision.action === 'reject' ? 'rejection' : 'reversal'}
            </Button>
          }
        >
          <Textarea
            label="Reason"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {actionError && <p role="alert">{actionError}</p>}
        </Modal>
      )}
      {history && (
        <Modal open onClose={() => setHistory(null)} title="Swap history">
          {history.loading ? (
            <p>Loading history…</p>
          ) : history.error ? (
            <p role="alert">{history.error}</p>
          ) : (
            <ol className="space-y-3">
              {history.entries.map((entry) => (
                <li key={entry.id}>
                  <p>
                    {historyLabel(entry)} · {entry.user?.name || 'Recorded user'}
                  </p>
                  <p className="text-sm">
                    {new Date(entry.createdAt).toLocaleString('en-ZA', {
                      timeZone: 'Africa/Johannesburg',
                    })}{' '}
                    · {entry.after?.status}
                  </p>
                  {(entry.after?.rejectionReason || entry.after?.reversalReason) && (
                    <p>{entry.after.rejectionReason || entry.after.reversalReason}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Modal>
      )}
    </>
  );
}

export default SessionSwapPage;
