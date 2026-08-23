/**
 * @file ProfilePage.jsx
 * @description Tutor availability and personal capacity settings view.
 *
 * Responsibilities:
 * - Displays tutor account details (name, student number, email).
 * - Maximum weekly tutoring hours configuration input (e.g. 10 hours/week limit).
 * - Interactive weekly availability matrix (Monday to Friday time blocks):
 *   - Allows tutors to toggle time windows where they are available vs. busy.
 *   - Saves availability slots to the backend API (`PUT /tutors/:id/availability`).
 * - Provides immediate visual feedback upon saving.
 *
 * Role: Tutor / Organiser
 * Route: `/profile`
 * Endpoint Connections: `GET /auth/me`, `PUT /tutors/:id/availability`, `PATCH /users/:id`
 */
import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, User } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { usersApi } from '../api/users';
import { tutorsApi } from '../api/tutors';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS, DAYS_OF_WEEK, ROLES } from '../utils/constants';
import { getInitials, formatDay } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { Input, Select } from '../components/ui/Input';
import { ErrorState } from '../components/ui/EmptyState';

export function ProfilePage() {
  const { user, role, isTutor } = useAuth();
  const { data: currentUser, loading, error, refetch } = useApi(usersApi.getCurrentUser);
  const [maxHours, setMaxHours] = useState(10);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState([{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' }]);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const profile = currentUser?.data ?? currentUser;

  useEffect(() => {
    if (profile?.maxHoursPerWeek) setMaxHours(profile.maxHoursPerWeek);
    if (profile?.availability?.length) {
      setSlots(profile.availability.map((a) => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime })));
    }
  }, [profile]);

  if (loading) return <Spinner fullPage label="Loading your profile…" />;
  if (error) return <ErrorState title="Couldn't load your profile" description={error} />;

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      await usersApi.updateUser(profile.id, { maxHoursPerWeek: Number(maxHours) });
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateSlot = (idx, key, value) => {
    setSlots((s) => s.map((slot, i) => (i === idx ? { ...slot, [key]: value } : slot)));
  };

  const addSlot = () => setSlots((s) => [...s, { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00' }]);
  const removeSlot = (idx) => setSlots((s) => s.filter((_, i) => i !== idx));

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      await tutorsApi.setAvailability(profile.id, slots);
      refetch();
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="mt-2 text-sm text-slate-500">Your details and how you're set up on Toodle.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-subtle text-2xl font-bold text-primary">
              {getInitials(profile?.name || user?.name)}
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{profile?.name || user?.name}</h2>
            <p className="text-sm text-slate-400">{profile?.email || user?.email}</p>
            <Badge tone="primary" className="mt-3">{ROLE_LABELS[role]}</Badge>
            {profile?.studentNumber && (
              <p className="mt-4 text-xs text-slate-400">Student number: {profile.studentNumber}</p>
            )}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Weekly hours cap" description="The maximum hours you can be allocated per week." />
            <CardBody className="flex items-end gap-3">
              <Input type="number" min={1} max={40} value={maxHours} onChange={(e) => setMaxHours(e.target.value)} className="max-w-32" />
              <Button onClick={handleSaveHours} loading={saving}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </CardBody>
          </Card>

          {isTutor && (
            <Card>
              <CardHeader
                title="Availability"
                description="When you're already busy — used to catch timetable clashes."
                action={
                  <Button size="sm" variant="secondary" onClick={addSlot}>
                    <Plus className="h-3.5 w-3.5" /> Add slot
                  </Button>
                }
              />
              <CardBody className="space-y-3">
                {slots.map((slot, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <Select label={idx === 0 ? 'Day' : undefined} value={slot.dayOfWeek} onChange={(e) => updateSlot(idx, 'dayOfWeek', e.target.value)}>
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>{formatDay(d)}</option>
                      ))}
                    </Select>
                    <Input label={idx === 0 ? 'Start' : undefined} type="time" value={slot.startTime} onChange={(e) => updateSlot(idx, 'startTime', e.target.value)} />
                    <Input label={idx === 0 ? 'End' : undefined} type="time" value={slot.endTime} onChange={(e) => updateSlot(idx, 'endTime', e.target.value)} />
                    <button onClick={() => removeSlot(idx)} className="mb-0.5 rounded-lg p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button onClick={handleSaveAvailability} loading={savingAvailability} variant="secondary">
                  <Save className="h-4 w-4" /> Save availability
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export default ProfilePage;
