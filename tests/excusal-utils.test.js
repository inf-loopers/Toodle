import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatOccurrenceDate,
  formatSessionLabel,
  sessionDurationMinutes,
  upcomingOccurrences,
} from '../src/utils/excusals';

const lab = {
  id: 'session-1',
  dayOfWeek: 'TUESDAY',
  startTime: '14:00',
  endTime: '15:30',
  venue: 'MSL 004',
  sessionType: 'LAB',
};

// Monday 2026-10-05, 10:00 SAST.
const MONDAY_MORNING = new Date('2026-10-05T08:00:00.000Z');

describe('excusal occurrence helpers', () => {
  it('measures a session in minutes', () => {
    expect(sessionDurationMinutes(lab)).toBe(90);
  });

  it('lists the next weekly occurrences on the session weekday', () => {
    expect(upcomingOccurrences(lab, MONDAY_MORNING, 3)).toEqual([
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
    ]);
  });

  it('includes today while the session has not started', () => {
    const monday = { ...lab, dayOfWeek: 'MONDAY' };

    expect(upcomingOccurrences(monday, MONDAY_MORNING, 1)).toEqual(['2026-10-05']);
  });

  it('skips today once the session has started', () => {
    const monday = { ...lab, dayOfWeek: 'MONDAY', startTime: '09:00' };

    expect(upcomingOccurrences(monday, MONDAY_MORNING, 1)).toEqual(['2026-10-12']);
  });

  it('uses the SAST calendar day, not UTC, near midnight', () => {
    // 23:30 UTC on Monday is already 01:30 Tuesday in Johannesburg.
    const lateMondayUtc = new Date('2026-10-05T23:30:00.000Z');
    const tuesdayMorning = { ...lab, startTime: '08:00', endTime: '09:00' };

    expect(upcomingOccurrences(tuesdayMorning, lateMondayUtc, 1)).toEqual(['2026-10-06']);
  });

  it('offers nothing for a session with invalid times or day', () => {
    expect(upcomingOccurrences({ ...lab, endTime: '13:00' }, MONDAY_MORNING)).toEqual([]);
    expect(upcomingOccurrences({ ...lab, dayOfWeek: 'FUNDAY' }, MONDAY_MORNING)).toEqual([]);
  });

  it('formats durations, labels and dates for display', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45m');
    expect(formatSessionLabel(lab)).toBe('Lab · Tuesday 14:00–15:30 · MSL 004');
    expect(formatOccurrenceDate('2026-10-06T00:00:00.000Z')).toMatch(/6 Oct 2026/);
  });
});
