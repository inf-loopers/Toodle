/**
 * @file helpers.test.js
 * @description Unit tests for utility functions in src/utils/helpers.js.
 */

import { describe, it, expect } from 'vitest';
import { cn, formatTime, formatDay, getRoleBadgeStyle, getConstraintBadgeStyle } from '../src/utils/helpers';
import { ROLES } from '../src/utils/constants';

describe('Utility Helpers', () => {
  it('cn should merge class names correctly', () => {
    const result = cn('px-2 py-1', 'px-4', { 'bg-red-500': true, 'text-white': false });
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
    expect(result).toContain('bg-red-500');
    expect(result).not.toContain('text-white');
  });

  it('formatTime should format 24h to 12h AM/PM strings', () => {
    expect(formatTime('14:15:00')).toBe('2:15 PM');
    expect(formatTime('08:30')).toBe('8:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('formatDay should capitalize day strings', () => {
    expect(formatDay('MONDAY')).toBe('Monday');
    expect(formatDay('WEDNESDAY')).toBe('Wednesday');
  });

  it('getRoleBadgeStyle should return appropriate classes', () => {
    expect(getRoleBadgeStyle(ROLES.ORGANISER)).toContain('text-blue-800');
    expect(getRoleBadgeStyle(ROLES.TUTOR)).toContain('text-emerald-800');
    expect(getRoleBadgeStyle(ROLES.STUDENT)).toContain('text-purple-800');
  });

  it('getConstraintBadgeStyle should return severity classes', () => {
    expect(getConstraintBadgeStyle('error')).toContain('text-rose-800');
    expect(getConstraintBadgeStyle('warning')).toContain('text-amber-800');
  });
});
