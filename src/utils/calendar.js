/**
 * @file calendar.js
 * @description Pure helpers shared by the calendar page and the feed modal.
 *
 * Functions:
 * - `toCalendarEvent(item)`: Maps an API event onto FullCalendar props.
 * - `EVENT_CLASS_BY_STATUS`: Class names that style an event by its state.
 * - `formatDateParam(value)`: Formats a date as the `YYYY-MM-DD` the API expects.
 * - `buildFeedUrl(token)`: Builds the absolute subscription URL for a feed token.
 *
 * Styling note: every state is expressed as a class defined in
 * `styles/index.css` rather than an inline colour, so the dark theme (which is
 * applied through `html.dark .toodle-app` overrides) keeps working.
 */

import apiClient from '../api/client';

/** Base class applied to every calendar event. */
export const EVENT_BASE_CLASS = 'toodle-calendar-event';

/**
 * Event class per allocation status.
 *
 * `COORDINATED` covers courses an admin or lecturer sees through
 * CourseCoordinator rather than an allocation, where the API sends null.
 */
export const EVENT_CLASS_BY_STATUS = {
  ACTIVE: 'toodle-calendar-event--active',
  PENDING: 'toodle-calendar-event--pending',
  COORDINATED: 'toodle-calendar-event--coordinated',
  CANCELLED: 'toodle-calendar-event--cancelled',
};

/**
 * Resolve the state class for an API event.
 *
 * A cancelled occurrence outranks its allocation status: an excused session that
 * was still pending should read as excused, not as awaiting confirmation.
 */
export function getEventClass(item) {
  if (item?.cancelled) return EVENT_CLASS_BY_STATUS.CANCELLED;
  if (item?.allocationStatus === 'PENDING') return EVENT_CLASS_BY_STATUS.PENDING;
  if (item?.allocationStatus === 'ACTIVE') return EVENT_CLASS_BY_STATUS.ACTIVE;

  return EVENT_CLASS_BY_STATUS.COORDINATED;
}

/**
 * Map one API event onto the props FullCalendar expects.
 *
 * Everything the grid does not render directly (venue, course, link) travels in
 * `extendedProps`, which FullCalendar hands back to `eventClick`.
 *
 * @param {object} item - Event from `GET /calendar/me/events`.
 * @returns {object} A FullCalendar event object.
 */
export function toCalendarEvent(item) {
  const cancelled = Boolean(item?.cancelled);

  return {
    id: item.id,
    // An excused session is shown rather than hidden, so the label has to say
    // why the slot is empty.
    title: cancelled ? `Excused: ${item.title}` : item.title,
    start: item.start,
    end: item.end,
    classNames: [EVENT_BASE_CLASS, getEventClass(item)],
    extendedProps: {
      courseCode: item.courseCode ?? null,
      courseName: item.courseName ?? null,
      courseId: item.courseId ?? null,
      sessionType: item.sessionType ?? null,
      venue: item.venue ?? null,
      allocationStatus: item.allocationStatus ?? null,
      cancelled,
      cancellationReason: item.cancellationReason ?? null,
      link: item.link ?? null,
    },
  };
}

/**
 * Format a date as the `YYYY-MM-DD` bound the events endpoint requires.
 *
 * Accepts FullCalendar's `startStr`/`endStr` (already local, already dated, so
 * slicing is exact) as well as a `Date`, which is formatted from its local
 * components — using the UTC components would move the boundary a day earlier
 * for anyone east of Greenwich.
 *
 * @param {string|Date|number} value
 * @returns {string} `YYYY-MM-DD`, or an empty string when unusable.
 */
export function formatDateParam(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Build the absolute URL a calendar client should subscribe to.
 *
 * The API base is relative in development (`/api/v1`, proxied by Vite) and
 * absolute in production (`VITE_API_URL`), so the origin is only prefixed when
 * the base does not already carry one. Both forms resolve to a URL Google can
 * fetch, because `vercel.json` rewrites `/api/v1/*` to the deployed API.
 *
 * @param {string} token - Plaintext feed token.
 * @returns {string} Absolute feed URL, or an empty string without a token.
 */
export function buildFeedUrl(token) {
  if (!token) return '';

  const base = apiClient.defaults?.baseURL ?? '/api/v1';
  const path = `/calendar/feed/${token}`;

  return /^https?:\/\//i.test(base)
    ? `${base.replace(/\/$/, '')}${path}`
    : `${window.location.origin}${base}${path}`;
}
