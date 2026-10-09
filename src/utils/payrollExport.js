/**
 * @file payrollExport.js
 * @description Builds a payroll-ready CSV export of approved timesheet
 * hours. One row per logged entry (course, tutor, date, hours, description)
 * so a payroll system can import exact worked dates rather than weekly
 * aggregates.
 */

import { TIMESHEET_STATUS } from './constants';

export const PAYROLL_CSV_HEADER = [
  'Course code',
  'Course name',
  'Tutor name',
  'Tutor email',
  'Week starting',
  'Date',
  'Hours',
  'Description',
  'Amount (R)',
];

/**
 * Escapes a single CSV cell: quotes values containing commas, quotes or
 * newlines (doubling embedded quotes), and neutralises formula injection by
 * prefixing a leading apostrophe when the value starts with a character
 * spreadsheet apps treat as a formula trigger (=, +, -, @, tab, CR) — the
 * export is payroll data opened in Excel/Sheets, so this matters.
 */
export function escapeCsvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function isoDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/**
 * Flattens approved timesheets (each with an `entries` array, from
 * GET /timesheets?status=APPROVED&include=entries) into one row per logged
 * entry — course, tutor, week, exact date, hours and description. Tutor
 * identity comes from the timesheet's own `user` relation rather than the
 * current allocation, so a tutor who has since been removed or swapped off
 * the course still appears correctly in historical exports.
 */
export function buildPayrollRows(timesheets) {
  const rows = [];
  for (const ts of timesheets ?? []) {
    // Defence-in-depth: hours are only final once approved, so any
    // non-approved timesheet (DRAFT, SUBMITTED, DISPUTED, REJECTED, PAID) is
    // skipped here even though the caller is expected to have already
    // fetched with ?status=APPROVED. This guarantees the payroll export can
    // never leak unapproved work regardless of what the caller passes in.
    if (ts.status !== TIMESHEET_STATUS.APPROVED) continue;
    const tutor = ts.user ?? {};
    for (const entry of ts.entries ?? []) {
      const course = entry.course ?? ts.course ?? {};
      // Blank (not 0.00) for legacy timesheets approved before appliedRate
      // was stamped, rather than fabricating a figure.
      const entryAmount =
        ts.appliedRate != null
          ? ((Number(entry.hoursWorked) || 0) * Number(ts.appliedRate)).toFixed(2)
          : '';
      rows.push([
        course.code ?? entry.courseId ?? ts.courseId ?? '',
        course.name ?? '',
        tutor.name ?? tutor.email ?? ts.userId ?? '',
        tutor.email ?? '',
        isoDate(ts.weekStartDate),
        isoDate(entry.date),
        (Number(entry.hoursWorked) || 0).toFixed(2),
        entry.description ?? '',
        entryAmount,
      ]);
    }
  }

  // Reproducible, deterministic ordering independent of the caller's array
  // order: sort by week, date, course, tutor email and description (as a
  // final tie-breaker) so the same approved data always serialises to the
  // same CSV, byte for byte, regardless of how the timesheets were fetched
  // or in what order the API happened to return them.
  const SORT_COLUMNS = [4, 5, 0, 3, 7, 8];
  rows.sort((a, b) => {
    for (const i of SORT_COLUMNS) {
      const cmp = String(a[i]).localeCompare(String(b[i]));
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  return rows;
}

/** Serialises the header plus row tuples into a CSV string. */
export function buildPayrollCsv(rows) {
  return [PAYROLL_CSV_HEADER, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
}
