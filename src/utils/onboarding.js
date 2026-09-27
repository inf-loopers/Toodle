/**
 * @file onboarding.js
 * @description Client-side mirror of the onboarding completeness rule from
 * the API (`toodle-api/src/utils/onboarding.js`). Prefer the `onboarding`
 * object the server attaches to `GET /auth/me`; the local computation below
 * is only a fallback for stale profiles that predate it.
 *
 * Rule (STUDENT only): complete iff
 *   - yearOfStudy is set,
 *   - at least one availability slot exists, and
 *   - at least one submitted course mark exists (PENDING or VERIFIED).
 * Staff roles are always complete.
 */

const SUBMITTED_STATUSES = ['PENDING', 'VERIFIED'];

export const ONBOARDING_MISSING_LABELS = {
  yearOfStudy: 'Year of study',
  availability: 'Availability time',
  courseMark: 'Course mark',
};

/** Compute the missing onboarding items directly from a profile record. */
export const computeOnboardingMissing = (profile) => {
  if (!profile || String(profile.role ?? '').toUpperCase() !== 'STUDENT') return [];

  const missing = [];
  if (profile.yearOfStudy == null) missing.push('yearOfStudy');
  if (!profile.availability?.length) missing.push('availability');
  if (!(profile.tutorMarks ?? []).some((mark) => SUBMITTED_STATUSES.includes(mark.status))) {
    missing.push('courseMark');
  }
  return missing;
};

/** Missing onboarding items, preferring the server-computed list. */
export const getOnboardingMissing = (profile) =>
  profile?.onboarding ? (profile.onboarding.missing ?? []) : computeOnboardingMissing(profile);

/** True when the profile passes the onboarding gate (staff always pass). */
export const isOnboardingComplete = (profile) => getOnboardingMissing(profile).length === 0;
