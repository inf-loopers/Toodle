/**
 * @file helpers.js
 * @description General utility functions for class name merging, string formatting, and role/badge styling.
 *
 * Functions:
 * - `cn(...inputs)`: Merges TailwindCSS class strings safely resolving conflicts via `clsx` and `tailwind-merge`.
 * - `formatTime(timeStr)`: Formats 24h time strings (e.g. "14:15:00") into 12h AM/PM format (e.g. "2:15 PM").
 * - `formatDay(day)`: Capitalizes weekday enum strings (e.g. "MONDAY" -> "Monday").
 * - `getRoleBadgeStyle(role)`: Returns TailwindCSS background, border, and text styling for a user role.
 * - `getConstraintBadgeStyle(severity)`: Returns TailwindCSS styling for constraint error/warning badges.
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ROLES } from './constants';

/**
 * Merge class names safely with tailwind-merge and clsx
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format minutes or HH:MM time strings into human-readable 12/24 hour display
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  if (!hours) return timeStr;
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;
  return `${displayHours}:${minutes || '00'} ${ampm}`;
}

/**
 * Format day of week from enum to title case
 */
export function formatDay(day) {
  if (!day) return '';
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

/**
 * Get visual badge colors based on user role
 */
export function getRoleBadgeStyle(role) {
  switch (role?.toLowerCase()) {
    case ROLES.ORGANISER:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case ROLES.TUTOR:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case ROLES.STUDENT:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Get visual badge style for constraint warnings
 */
export function getConstraintBadgeStyle(severity) {
  switch (severity?.toLowerCase()) {
    case 'error':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'warning':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'info':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
