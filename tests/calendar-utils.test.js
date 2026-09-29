/**
 * @file calendar-utils.test.js
 * @description Unit tests for the pure calendar helpers in `src/utils/calendar.js`.
 *
 * Covers the event-to-FullCalendar mapping (class per status, excusal relabel,
 * extendedProps), the `YYYY-MM-DD` request-bound formatter, and `buildFeedUrl`
 * for both a relative (dev, proxied) and an absolute (prod) API base URL.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVENT_BASE_CLASS,
  EVENT_CLASS_BY_STATUS,
  buildFeedUrl,
  formatDateParam,
  getEventClass,
  toCalendarEvent,
} from '../src/utils/calendar';

// `buildFeedUrl` reads `apiClient.defaults.baseURL`; a mutable mock lets each
// test set a relative or absolute base without touching the real client.
const { mockClient } = vi.hoisted(() => ({
  mockClient: { defaults: { baseURL: '/api/v1' } },
}));

vi.mock('../src/api/client', () => ({ default: mockClient }));

const baseEvent = {
  id: 'session-s1-2026-09-28',
  type: 'SESSION',
  title: 'COMS3011A Tutorial',
  courseCode: 'COMS3011A',
  courseName: 'Algorithms',
  courseId: 'course-1',
  sessionType: 'TUTORIAL',
  venue: 'Sci-Bono 3',
  start: '2026-09-28T08:00:00+02:00',
  end: '2026-09-28T09:00:00+02:00',
  allocationStatus: 'ACTIVE',
  cancelled: false,
  cancellationReason: null,
  link: '/courses/course-1',
};

beforeEach(() => {
  mockClient.defaults.baseURL = '/api/v1';
});

describe('toCalendarEvent', () => {
  it('maps an ACTIVE session onto FullCalendar props with the active class', () => {
    const event = toCalendarEvent(baseEvent);

    expect(event.id).toBe('session-s1-2026-09-28');
    expect(event.title).toBe('COMS3011A Tutorial');
    expect(event.start).toBe('2026-09-28T08:00:00+02:00');
    expect(event.classNames).toEqual([EVENT_BASE_CLASS, EVENT_CLASS_BY_STATUS.ACTIVE]);
    expect(event.extendedProps).toMatchObject({
      courseCode: 'COMS3011A',
      courseId: 'course-1',
      sessionType: 'TUTORIAL',
      venue: 'Sci-Bono 3',
      allocationStatus: 'ACTIVE',
      cancelled: false,
      link: '/courses/course-1',
    });
  });

  it('marks a PENDING allocation with the pending class', () => {
    const event = toCalendarEvent({ ...baseEvent, allocationStatus: 'PENDING' });

    expect(event.classNames).toContain(EVENT_CLASS_BY_STATUS.PENDING);
  });

  it('treats a null allocation status (coordinated course) as coordinated', () => {
    const event = toCalendarEvent({ ...baseEvent, allocationStatus: null });

    expect(event.classNames).toContain(EVENT_CLASS_BY_STATUS.COORDINATED);
  });

  it('relabels and re-classes a cancelled occurrence, outranking its status', () => {
    const event = toCalendarEvent({
      ...baseEvent,
      allocationStatus: 'PENDING',
      cancelled: true,
      cancellationReason: 'Attending a conference',
    });

    expect(event.title).toBe('Excused: COMS3011A Tutorial');
    expect(event.classNames).toContain(EVENT_CLASS_BY_STATUS.CANCELLED);
    expect(event.classNames).not.toContain(EVENT_CLASS_BY_STATUS.PENDING);
    expect(event.extendedProps.cancelled).toBe(true);
    expect(event.extendedProps.cancellationReason).toBe('Attending a conference');
  });
});

describe('getEventClass', () => {
  it('prefers cancelled over allocation status', () => {
    expect(getEventClass({ cancelled: true, allocationStatus: 'ACTIVE' })).toBe(
      EVENT_CLASS_BY_STATUS.CANCELLED
    );
  });

  it('falls back to coordinated for an unknown status', () => {
    expect(getEventClass({ allocationStatus: 'REMOVED' })).toBe(EVENT_CLASS_BY_STATUS.COORDINATED);
  });
});

describe('formatDateParam', () => {
  it('slices an ISO datetime string to the date bound', () => {
    expect(formatDateParam('2026-09-28T00:00:00')).toBe('2026-09-28');
  });

  it('passes an already-dated string through', () => {
    expect(formatDateParam('2026-09-28')).toBe('2026-09-28');
  });

  it('formats a Date from its local components with zero padding', () => {
    expect(formatDateParam(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('returns an empty string for missing or unusable input', () => {
    expect(formatDateParam('')).toBe('');
    expect(formatDateParam(null)).toBe('');
    expect(formatDateParam('not-a-date')).toBe('');
    expect(formatDateParam(new Date('nope'))).toBe('');
  });
});

describe('buildFeedUrl', () => {
  it('prefixes the origin when the API base is relative (dev proxy)', () => {
    mockClient.defaults.baseURL = '/api/v1';

    expect(buildFeedUrl('tok123')).toBe(`${window.location.origin}/api/v1/calendar/feed/tok123`);
  });

  it('uses an absolute API base verbatim (production)', () => {
    mockClient.defaults.baseURL = 'https://api.toodle.ac.za/api/v1';

    expect(buildFeedUrl('tok123')).toBe('https://api.toodle.ac.za/api/v1/calendar/feed/tok123');
  });

  it('strips a trailing slash from an absolute base', () => {
    mockClient.defaults.baseURL = 'https://api.toodle.ac.za/api/v1/';

    expect(buildFeedUrl('tok123')).toBe('https://api.toodle.ac.za/api/v1/calendar/feed/tok123');
  });

  it('returns an empty string without a token', () => {
    expect(buildFeedUrl('')).toBe('');
    expect(buildFeedUrl(undefined)).toBe('');
  });
});
