import { useState } from 'react';
import { tutorsApi } from '../api/tutors';
import Button from './ui/Button';
import { Input } from './ui/Input';

export default function AllocationMarkVerification({
  tutor,
  course,
  disabled,
  onSaved,
  onBusyChange,
}) {
  const recorded = tutor.tutorMarks?.find((item) => item.courseId === course.id);
  const [mark, setMark] = useState(recorded?.mark ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid =
    mark !== '' && Number.isInteger(Number(mark)) && Number(mark) >= 0 && Number(mark) <= 100;

  const save = async () => {
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      const response = await tutorsApi.addOrUpdateMark(tutor.id, {
        courseId: course.id,
        mark: Number(mark),
      });
      onSaved(response?.data ?? response);
      setConfirmed(false);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not save the mark.');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold">Course mark verification</p>
      <p className="text-sm">
        {recorded ? `Recorded mark: ${recorded.mark}% (${recorded.status})` : 'No mark recorded.'}{' '}
        Minimum: {course.minMarkRequired}%.
      </p>
      <p className="text-xs text-slate-500">
        Check school records or an official transcript, then record the verified mark here. An
        application is not required for an existing tutor. Your verifier identity and review time
        are saved.
      </p>
      <Input
        label="Verified course mark (%)"
        type="number"
        min={0}
        max={100}
        step={1}
        value={mark}
        disabled={busy || disabled}
        onChange={(event) => {
          setMark(event.target.value);
          setConfirmed(false);
        }}
      />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy || disabled}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I checked this mark against an official academic record.
      </label>
      <Button
        variant="secondary"
        loading={busy}
        disabled={disabled || !valid || !confirmed}
        onClick={save}
      >
        Save verified mark
      </Button>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </section>
  );
}
