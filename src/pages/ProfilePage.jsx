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
 * - Tutors and students can view and update their year of study.
 *
 * Route: `/profile`
 *
 * Endpoint Connections:
 * - GET /auth/me
 * - PATCH /users/:id
 * - PUT /tutors/:id/availability
 */

import { useEffect, useState } from 'react';
import { Camera, Save } from 'lucide-react';

import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

import { usersApi } from '../api/users';
import { tutorsApi } from '../api/tutors';

import { ROLES, ROLE_LABELS } from '../utils/constants';

import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { Input, Select } from '../components/ui/Input';
import { ErrorState } from '../components/ui/EmptyState';
import UserAvatar from '../components/ui/UserAvatar';
import AvailabilityEditor from '../components/availability/AvailabilityEditor';

export function ProfilePage() {
  const { user, role, updateDbUser } = useAuth();

  const { data: currentUser, loading, error, refetch } = useApi(usersApi.getCurrentUser);

  const [maxHours, setMaxHours] = useState(10);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  const [yearOfStudy, setYearOfStudy] = useState('');
  const [savingYear, setSavingYear] = useState(false);
  const [yearSaved, setYearSaved] = useState(false);

  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const profile = currentUser?.data ?? currentUser;

  const roleKey = (role || profile?.role)?.toLowerCase();
  const isTutor = roleKey === ROLES.TUTOR;
  const canManageAvailability = isTutor || roleKey === ROLES.STUDENT;
  const canManageYearOfStudy = isTutor || roleKey === ROLES.STUDENT;

  const displayName = profile?.name || user?.name || 'User';
  const displayEmail = profile?.email || user?.email || '—';

  const displayRole = ROLE_LABELS?.[roleKey] || roleKey || '—';

  useEffect(() => {
    if (profile?.maxHoursPerWeek != null) {
      setMaxHours(profile.maxHoursPerWeek);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.yearOfStudy != null) {
      setYearOfStudy(String(profile.yearOfStudy));
    }
  }, [profile]);

  if (loading) {
    return <Spinner fullPage label="Loading your profile…" />;
  }

  if (error) {
    return <ErrorState title="Couldn't load your profile" description={error} />;
  }

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('The image must be smaller than 5 MB.');
      return;
    }
    setAvatarError('');
    setSavingAvatar(true);
    try {
      const response = await usersApi.updateAvatar(profile.id, file);
      updateDbUser(response.data);
      await refetch();
    } catch (uploadError) {
      setAvatarError(
        uploadError?.response?.data?.error || 'Could not update your profile picture.'
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setSavingAvatar(true);
    setAvatarError('');
    try {
      await usersApi.deleteAvatar(profile.id);
      const response = await usersApi.getCurrentUser();
      updateDbUser(response.data);
      await refetch();
    } catch (deleteError) {
      setAvatarError(
        deleteError?.response?.data?.error || 'Could not remove your profile picture.'
      );
    } finally {
      setSavingAvatar(false);
    }
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

  const handleSaveYearOfStudy = async () => {
    if (!profile?.id) return;

    setSavingYear(true);
    setYearSaved(false);

    try {
      await usersApi.updateUser(profile.id, {
        yearOfStudy: yearOfStudy === '' ? null : Number(yearOfStudy),
      });

      const response = await usersApi.getCurrentUser();
      updateDbUser(response.data);
      await refetch();

      setYearSaved(true);
    } finally {
      setSavingYear(false);
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
            <UserAvatar user={profile || user} />

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
            {profile?.avatarUrl && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={savingAvatar}
                className="mt-2 text-xs text-slate-400 hover:text-rose-600"
              >
                Remove picture
              </button>
            )}
            {avatarError && <p className="mt-2 text-xs text-rose-600">{avatarError}</p>}
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

          {/* Year of study */}
          {canManageYearOfStudy && (
            <>
              <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

              <div className="flex flex-wrap items-end gap-3">
                <Select
                  label="Year of study"
                  value={yearOfStudy}
                  onChange={(event) => {
                    setYearOfStudy(event.target.value);
                    setYearSaved(false);
                  }}
                  className="max-w-40"
                >
                  <option value="">Not set</option>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </Select>

                <Button onClick={handleSaveYearOfStudy} loading={savingYear}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>

              {yearSaved && (
                <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Year of study updated.
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Personal work settings */}
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

              <Button onClick={handleSaveHours} loading={savingHours}>
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
        {canManageAvailability && (
          <AvailabilityEditor
            initialSlots={
              profile?.availability?.map((slot) => ({
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
              })) ?? []
            }
            onSave={async (slots) => {
              if (profile?.id) {
                await tutorsApi.setAvailability(profile.id, slots);
                await refetch();
              }
            }}
          />
        )}
      </div>
    </>
  );
}

export default ProfilePage;
