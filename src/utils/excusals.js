/**
 * @file excusals.js
 * @description Pure helpers that turn a weekly course session into the dated
 * occurrences a tutor can excuse themselves from.
 *
 * Mirrors `toodle-api/src/utils/schedule.js`: session times are SAST, a fixed
 * UTC+02:00 with no daylight saving, and all date maths is anchored to UTC so
 * the browser's own timezone can never move an occurrence onto another day.
 * The API re-validates every occurrence, so these only shape the choices.
 *
 * Functions:
 * - `sessionDurationMinutes(session)`: Length of one occurrence in minutes.
 * - `upcomingOccurrences(session, now, count)`: Next occurrence dates not yet started.
 * - `formatDuration(minutes)`: e.g. "1h 30m".
 * - `formatSessionLabel(session)`: e.g. "Lab · Tuesday 14:00–15:30 · MSL 004".
 * - `formatOccurrenceDate(date)`: e.g. "Tue, 6 Oct 2026".
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

// DayOfWeek enum value → Date#getUTCDay() index (0 = Sunday).
const UTC_DAY = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const SESSION_TYPE_LABELS = { LECTURE: 'Lecture', TUTORIAL: 'Tutorial', LAB: 'Lab' };

const toMinutes = (time) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};

const capitalise = (value = '') => value.charAt(0) + value.slice(1).toLowerCase();

export function sessionDurationMinutes(session) {
  return toMinutes(session?.endTime) - toMinutes(session?.startTime);
}

/**
 * The next `count` dates (YYYY-MM-DD) on which the session runs and has not
 * yet started. Returns [] for a session with an unknown day or invalid times.
 */
export function upcomingOccurrences(session, now = new Date(), count = 8) {
  const target = UTC_DAY[session?.dayOfWeek];
  if (target === undefined || !(sessionDurationMinutes(session) > 0)) return [];

  // Today's calendar date in SAST, as UTC midnight.
  const sastNow = new Date(now.getTime() + SAST_OFFSET_MS);
  let cursor = Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate());
  cursor += ((target - new Date(cursor).getUTCDay() + 7) % 7) * DAY_MS;

  const dates = [];
  while (dates.length < count) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    const start = Date.parse(`${date}T${session.startTime}:00+02:00`);
    if (start > now.getTime()) dates.push(date);
    cursor += 7 * DAY_MS;
  }

  return dates;
}

export function formatDuration(minutes) {
  if (!(minutes > 0)) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  return hours ? `${hours}h` : `${rest}m`;
}

export function formatSessionLabel(session) {
  if (!session) return '';
  const parts = [
    SESSION_TYPE_LABELS[session.sessionType] ?? capitalise(session.sessionType),
    `${capitalise(session.dayOfWeek)} ${session.startTime}–${session.endTime}`,
  ];
  if (session.venue) parts.push(session.venue);
  return parts.join(' · ');
}

/** Format a YYYY-MM-DD (or @db.Date ISO) value without timezone drift. */
export function formatOccurrenceDate(date) {
  const day = String(date ?? '').slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-ZA', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
