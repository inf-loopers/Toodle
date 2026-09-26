/**
 * @file AvailabilityEditor.jsx
 * @description Shared weekly availability slot editor.
 *
 * Used by both the Profile page and the first-time Onboarding flow. Owns the
 * slot list state and the save action; the parent only supplies the current
 * slots and performs the API call.
 *
 * Endpoint Connections:
 * - `PUT /tutors/:id/availability` (via the `onSave` callback)
 */

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

import { DAYS_OF_WEEK } from '../../utils/constants';
import { formatDay } from '../../utils/helpers';

import Card, { CardBody, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { Input, Select } from '../ui/Input';

const NEW_SLOT = { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' };

/**
 * @param {object} props
 * @param {Array<{dayOfWeek: string, startTime: string, endTime: string}>} props.initialSlots
 * @param {(slots: object[]) => Promise<void>} props.onSave
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {string} [props.saveLabel]
 */
export function AvailabilityEditor({
  initialSlots = [],
  onSave,
  title = 'Availability',
  description = "When you're free to tutor. Add and save time slots covering all sessions you can attend.",
  saveLabel = 'Save availability',
}) {
  const [slots, setSlots] = useState(initialSlots.length ? initialSlots : []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Resync when the parent reloads the profile (e.g. after saving elsewhere).
  // An empty record starts empty — no invented default slot.
  const initialKey = JSON.stringify(initialSlots);
  useEffect(() => {
    setSlots(initialSlots.length ? initialSlots : []);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const addSlot = () => {
    setSaved(false);
    setSlots((current) => [...current, { ...NEW_SLOT }]);
  };

  const updateSlot = (index, field, value) => {
    setSaved(false);
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              [field]: value,
            }
          : slot
      )
    );
  };

  const removeSlot = (index) => {
    setSaved(false);
    setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await onSave(slots);
      setSaved(true);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || 'Could not save availability.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <Button variant="secondary" size="sm" onClick={addSlot}>
            <Plus className="h-3.5 w-3.5" />
            Add slot
          </Button>
        }
      />

      <CardBody className="space-y-3">
        {slots.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No free-time windows yet. Add at least one slot and save it.
          </p>
        )}

        {slots.map((slot, index) => (
          <div
            key={`${slot.dayOfWeek}-${index}`}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <Select
              label="Day"
              value={slot.dayOfWeek}
              onChange={(event) => updateSlot(index, 'dayOfWeek', event.target.value)}
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {formatDay(day)}
                </option>
              ))}
            </Select>

            <Input
              label="From"
              type="time"
              value={slot.startTime}
              onChange={(event) => updateSlot(index, 'startTime', event.target.value)}
            />

            <Input
              label="To"
              type="time"
              value={slot.endTime}
              onChange={(event) => updateSlot(index, 'endTime', event.target.value)}
            />

            <button
              type="button"
              onClick={() => removeSlot(index)}
              className="mb-0.5 rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              aria-label="Remove availability slot"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button onClick={handleSave} loading={saving} disabled={slots.length === 0}>
            <Save className="h-4 w-4" />
            {saveLabel}
          </Button>

          {saved && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Availability saved.
            </p>
          )}

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

export default AvailabilityEditor;
