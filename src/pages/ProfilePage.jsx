/**
 * @file ProfilePage.jsx
 * @description User profile and tutor work preferences.
 *
 * Responsibilities:
 * - Displays read-only account information.
 * - Displays a profile image when one is available.
 * - Allows a user to choose and preview a new profile photo.
 * - Tutors can manage their weekly hours cap.
 * - Tutors can manage their weekly availability.
 *
 * Route: `/profile`
 *
 * Endpoint Connections:
 * - GET /auth/me
 * - PATCH /users/:id
 * - PUT /tutors/:id/availability
 */

import { useEffect, useState } from 'react';
import { Camera, Plus, Save, Trash2 } from 'lucide-react';

import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

import { usersApi } from '../api/users';
import { tutorsApi } from '../api/tutors';

import { ROLES, ROLE_LABELS } from '../utils/constants';
import { getInitials } from '../utils/helpers';

import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { Input, Select } from '../components/ui/Input';
import { ErrorState } from '../components/ui/EmptyState';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export function ProfilePage() {
  const { user, role } = useAuth();

  const {
    data: currentUser,
    loading,
    error,
    refetch,
  } = useApi(usersApi.getCurrentUser);

  const [photoPreview, setPhotoPreview] = useState(null);

  const [maxHours, setMaxHours] = useState(10);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  const [slots, setSlots] = useState([
    {
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '11:00',
    },
  ]);

  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);

  const profile = currentUser?.data ?? currentUser;

  const roleKey = role?.toUpperCase();

  const isTutor = roleKey === ROLES.TUTOR;

  const displayName = profile?.name || user?.name || 'User';
  const displayEmail = profile?.email || user?.email || '—';

  const displayRole =
    roleKey === 'ORGANISER'
      ? 'Course Organiser'
      : ROLE_LABELS?.[roleKey] || roleKey || '—';

  useEffect(() => {
    if (profile?.maxHoursPerWeek != null) {
      setMaxHours(profile.maxHoursPerWeek);
    }

    if (profile?.availability?.length) {
      setSlots(
        profile.availability.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
      );
    }
  }, [profile]);

  /*
   * Clean up temporary browser image URLs when the preview changes
   * or when the user leaves the page.
   */
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (loading) {
    return <Spinner fullPage label="Loading your profile…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load your profile"
        description={error}
      />
    );
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setPhotoPreview(previewUrl);
  };

  const handleSaveHours = async () => {
    if (!profile?.id) return;

    setSavingHours(true);
    setHoursSaved(false);

    try {
      await usersApi.updateUser(profile.id, {
        maxHoursPerWeek: Number(maxHours),
      });

      setHoursSaved(true);

      await refetch();
    } finally {
      setSavingHours(false);
    }
  };

  const addSlot = () => {
    setAvailabilitySaved(false);

    setSlots((current) => [
      ...current,
      {
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '11:00',
      },
    ]);
  };

  const updateSlot = (index, field, value) => {
    setAvailabilitySaved(false);

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
    setAvailabilitySaved(false);

    setSlots((current) =>
      current.filter((_, slotIndex) => slotIndex !== index)
    );
  };

  const handleSaveAvailability = async () => {
    if (!profile?.id) return;

    setSavingAvailability(true);
    setAvailabilitySaved(false);

    try {
      await tutorsApi.setAvailability(profile.id, slots);

      setAvailabilitySaved(true);

      await refetch();
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <>
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          My Profile
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your details and how you're set up on Toodle.
        </p>
      </div>

      {/* Account details */}
      <Card>
        <CardHeader title="Account details" />

        <CardBody>
          {/* Profile picture */}
          <div className="flex flex-col items-center">
            {photoPreview || profile?.profileImageUrl ? (
              <img
                src={photoPreview || profile.profileImageUrl}
                alt={`${displayName}'s profile`}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-subtle text-2xl font-bold text-primary">
                {getInitials(displayName)}
              </div>
            )}

            <label
              htmlFor="profile-photo"
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Camera className="h-4 w-4" />
              Change profile photo
            </label>

            <input
              id="profile-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

          {/* Read-only account information */}
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {/* Full name */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Full name
              </p>

              <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {displayName}
              </p>
            </div>

            {/* Email */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Email address
              </p>

              <p className="mt-1.5 break-all text-sm font-semibold text-slate-800 dark:text-slate-200">
                {displayEmail}
              </p>
            </div>

            {/* Role */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Role
              </p>

              <div className="mt-1.5">
                <Badge tone="primary">{displayRole}</Badge>
              </div>
            </div>

            {/* Student number */}
            {profile?.studentNumber && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Student number
                </p>

                <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {profile.studentNumber}
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tutor-only settings */}
      {isTutor && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Weekly hours cap */}
          <Card>
            <CardHeader
              title="Weekly hours cap"
              description="The maximum number of hours you can be allocated each week."
            />

            <CardBody>
              <div className="flex flex-wrap items-end gap-3">
                <Input
                  label="Hours per week"
                  type="number"
                  min={1}
                  max={40}
                  value={maxHours}
                  onChange={(event) => {
                    setMaxHours(event.target.value);
                    setHoursSaved(false);
                  }}
                  className="max-w-36"
                />

                <Button
                  onClick={handleSaveHours}
                  loading={savingHours}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>

              {hoursSaved && (
                <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Weekly hours updated.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader
              title="Availability"
              description="When you're already busy — used to catch timetable clashes."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addSlot}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add slot
                </Button>
              }
            />

            <CardBody className="space-y-3">
              {slots.map((slot, index) => (
                <div
                  key={`${slot.dayOfWeek}-${index}`}
                  className="flex flex-col gap-2 sm:flex-row sm:items-end"
                >
                  <Select
                    label="Day"
                    value={slot.dayOfWeek}
                    onChange={(event) =>
                      updateSlot(index, 'dayOfWeek', event.target.value)
                    }
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="From"
                    type="time"
                    value={slot.startTime}
                    onChange={(event) =>
                      updateSlot(index, 'startTime', event.target.value)
                    }
                  />

                  <Input
                    label="To"
                    type="time"
                    value={slot.endTime}
                    onChange={(event) =>
                      updateSlot(index, 'endTime', event.target.value)
                    }
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
                <Button
                  onClick={handleSaveAvailability}
                  loading={savingAvailability}
                >
                  <Save className="h-4 w-4" />
                  Save availability
                </Button>

                {availabilitySaved && (
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Availability saved.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

export default ProfilePage;