import { useState } from 'react';
import { allocationsApi } from '../api/allocations';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Textarea } from './ui/Input';
import { getApiErrorMessage } from '../utils/apiError';
export default function AllocationSessionsModal({ allocation, sessions, onClose, onSaved }) {
  const [selected, setSelected] = useState(
    allocation.sessionIds?.length ? allocation.sessionIds : sessions.map((s) => s.id)
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await allocationsApi.updateAllocation(allocation.id, {
        sessionIds: selected,
        reason: reason.trim(),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Sessions for ${allocation.user?.name || 'tutor'}`}
      description="Choose the weekly sessions this tutor is responsible for. Allocated hours also include preparation and marking."
      footer={
        <Button
          loading={busy}
          disabled={!selected.length || busy || allocation.isLocked}
          onClick={save}
        >
          Save sessions
        </Button>
      }
    >
      <div className="space-y-3">
        {sessions.map((s) => (
          <label key={s.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={() =>
                setSelected((ids) =>
                  ids.includes(s.id) ? ids.filter((id) => id !== s.id) : [...ids, s.id]
                )
              }
            />
            {s.dayOfWeek} {s.startTime}–{s.endTime} · {s.sessionType}
          </label>
        ))}
        <Textarea
          label="Reason for this change"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {allocation.isLocked && (
          <p>Unlock this allocation on the board before changing its sessions.</p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
