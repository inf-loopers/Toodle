import { describe, expect, it } from 'vitest';
import {
  PAYROLL_CSV_HEADER,
  buildPayrollCsv,
  buildPayrollRows,
  escapeCsvCell,
} from '../src/utils/payrollExport';

const course = { id: 'c1', code: 'COMS101', name: 'Computing' };
const alice = { id: 't1', name: 'Alice', email: 'alice@example.test' };

function timesheet(overrides = {}) {
  return {
    id: 'ts-1',
    userId: 't1',
    courseId: 'c1',
    weekStartDate: '2026-08-17',
    status: 'APPROVED',
    totalHours: 2.5,
    course,
    user: alice,
    entries: [
      {
        id: 'e1',
        date: '2026-08-18',
        hoursWorked: 2.5,
        description: 'Lab prep',
        course,
      },
    ],
    ...overrides,
  };
}

describe('escapeCsvCell', () => {
  it('passes plain values through unchanged', () => {
    expect(escapeCsvCell('COMS101')).toBe('COMS101');
    expect(escapeCsvCell(2.5)).toBe('2.5');
  });

  it('quotes and doubles embedded quotes for commas, quotes and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises formula-injection trigger characters with a leading apostrophe', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('+1234')).toBe("'+1234");
    expect(escapeCsvCell('-1234')).toBe("'-1234");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });

  it('treats null/undefined as an empty cell', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
});

describe('buildPayrollRows', () => {
  it('produces one row per logged entry with course, tutor, week, date, hours and description', () => {
    const rows = buildPayrollRows([timesheet()]);

    expect(rows).toEqual([
      ['COMS101', 'Computing', 'Alice', 'alice@example.test', '2026-08-17', '2026-08-18', '2.50', 'Lab prep', ''],
    ]);
  });

  it('leaves the amount blank for a legacy timesheet with no stored appliedRate', () => {
    const rows = buildPayrollRows([timesheet()]);

    expect(rows[0][8]).toBe('');
  });

  it('computes the amount as hours x appliedRate when the rate was stamped at approval', () => {
    const rows = buildPayrollRows([timesheet({ appliedRate: 200 })]);

    expect(rows[0][8]).toBe('500.00');
  });

  it('computes a separate amount per entry sharing the same appliedRate', () => {
    const rows = buildPayrollRows([
      timesheet({
        appliedRate: 100,
        entries: [
          { id: 'e1', date: '2026-08-18', hoursWorked: 2, description: 'Lab prep', course },
          { id: 'e2', date: '2026-08-19', hoursWorked: 3, description: 'Marking', course },
        ],
      }),
    ]);

    expect(rows.map((r) => r[8])).toEqual(['200.00', '300.00']);
  });

  it('formats hours to a fixed 2 decimal places regardless of the source precision', () => {
    const rows = buildPayrollRows([
      timesheet({ entries: [{ id: 'e1', date: '2026-08-18', hoursWorked: 3, description: '' }] }),
    ]);

    expect(rows[0][6]).toBe('3.00');
  });

  it('flattens multiple entries across multiple approved timesheets', () => {
    const second = timesheet({
      id: 'ts-2',
      weekStartDate: '2026-08-24',
      entries: [
        { id: 'e2', date: '2026-08-25', hoursWorked: 1, description: 'Marking', course },
        { id: 'e3', date: '2026-08-26', hoursWorked: 3, description: '', course },
      ],
    });

    const rows = buildPayrollRows([timesheet(), second]);

    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual([
      'COMS101', 'Computing', 'Alice', 'alice@example.test', '2026-08-24', '2026-08-25', '1.00', 'Marking', '',
    ]);
  });

  it('attributes historical entries to the timesheet owner, not a current allocation', () => {
    // The tutor on the timesheet record is the source of truth even if the
    // tutor has since been removed/swapped off the course elsewhere.
    const removedTutor = { id: 't9', name: 'Removed Tutor', email: 'removed@example.test' };
    const rows = buildPayrollRows([timesheet({ user: removedTutor })]);

    expect(rows[0][2]).toBe('Removed Tutor');
    expect(rows[0][3]).toBe('removed@example.test');
  });

  it('falls back to the timesheet course when an entry has no course of its own', () => {
    const rows = buildPayrollRows([
      timesheet({ entries: [{ id: 'e1', date: '2026-08-18', hoursWorked: 2, description: '' }] }),
    ]);

    expect(rows[0][0]).toBe('COMS101');
  });

  it('handles a general (course-less) timesheet by reading each course from its own entries', () => {
    // A "general" timesheet has courseId/course == null (one per tutor per
    // week, per the backend's partial unique index on courseId IS NULL) but
    // every entry still carries its own required course — a tutor can log
    // hours against several different courses within the same general
    // timesheet, and each row must show the entry's own course, not blank.
    const mathsCourse = { id: 'c2', code: 'MATH101', name: 'Calculus' };
    const generalTimesheet = timesheet({
      id: 'ts-general',
      courseId: null,
      course: null,
      entries: [
        { id: 'e1', date: '2026-08-18', hoursWorked: 1.5, description: 'Marking', course },
        { id: 'e2', date: '2026-08-19', hoursWorked: 2, description: 'Consulting', course: mathsCourse },
      ],
    });

    const rows = buildPayrollRows([generalTimesheet]);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r[0])).toEqual(['COMS101', 'MATH101']);
  });

  it('returns an empty array for no timesheets or timesheets with no entries', () => {
    expect(buildPayrollRows([])).toEqual([]);
    expect(buildPayrollRows([timesheet({ entries: [] })])).toEqual([]);
    expect(buildPayrollRows(undefined)).toEqual([]);
  });

  it.each(['DRAFT', 'SUBMITTED', 'DISPUTED', 'REJECTED', 'PAID'])(
    'excludes a %s timesheet even if it is included in the input list',
    (status) => {
      const rows = buildPayrollRows([timesheet({ status })]);

      expect(rows).toEqual([]);
    },
  );

  it('keeps only the APPROVED timesheets out of a mixed-status list', () => {
    const draft = timesheet({ id: 'ts-draft', status: 'DRAFT' });
    const submitted = timesheet({ id: 'ts-submitted', status: 'SUBMITTED' });
    const disputed = timesheet({ id: 'ts-disputed', status: 'DISPUTED' });
    const rejected = timesheet({ id: 'ts-rejected', status: 'REJECTED' });
    const paid = timesheet({ id: 'ts-paid', status: 'PAID' });
    const approved = timesheet({ id: 'ts-approved', status: 'APPROVED' });

    const rows = buildPayrollRows([draft, submitted, disputed, rejected, paid, approved]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual([
      'COMS101', 'Computing', 'Alice', 'alice@example.test', '2026-08-17', '2026-08-18', '2.50', 'Lab prep', '',
    ]);
  });

  it('is reproducible: the same approved data in a different input order produces identical rows', () => {
    const second = timesheet({
      id: 'ts-2',
      weekStartDate: '2026-08-24',
      user: { id: 't2', name: 'Bob', email: 'bob@example.test' },
      entries: [{ id: 'e2', date: '2026-08-25', hoursWorked: 1, description: 'Marking', course }],
    });
    const third = timesheet({
      id: 'ts-3',
      weekStartDate: '2026-08-10',
      entries: [{ id: 'e4', date: '2026-08-11', hoursWorked: 4, description: 'Consulting', course }],
    });

    const forward = buildPayrollRows([timesheet(), second, third]);
    const shuffled = buildPayrollRows([third, timesheet(), second]);
    const reversed = buildPayrollRows([second, third, timesheet()]);

    expect(shuffled).toEqual(forward);
    expect(reversed).toEqual(forward);
    // Ordered by week-starting ascending (the stable sort key), not by
    // whatever order the caller happened to pass the timesheets in.
    expect(forward.map((r) => r[4])).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
  });
});

describe('buildPayrollCsv', () => {
  it('includes the payroll header followed by escaped, CRLF-separated rows', () => {
    const csv = buildPayrollCsv(buildPayrollRows([timesheet()]));
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe(PAYROLL_CSV_HEADER.join(','));
    expect(lines[1]).toBe('COMS101,Computing,Alice,alice@example.test,2026-08-17,2026-08-18,2.50,Lab prep,');
  });

  it('includes the computed amount in the serialised CSV row', () => {
    const csv = buildPayrollCsv(buildPayrollRows([timesheet({ appliedRate: 200 })]));
    const lines = csv.split('\r\n');

    expect(lines[1]).toBe(
      'COMS101,Computing,Alice,alice@example.test,2026-08-17,2026-08-18,2.50,Lab prep,500.00',
    );
  });

  it('escapes a description containing a comma', () => {
    const rows = buildPayrollRows([
      timesheet({ entries: [{ id: 'e1', date: '2026-08-18', hoursWorked: 2, description: 'Tutorial, prep' }] }),
    ]);
    const csv = buildPayrollCsv(rows);

    expect(csv).toContain('"Tutorial, prep"');
  });

  it('is reproducible: calling it twice on the same rows yields byte-identical output', () => {
    const rows = buildPayrollRows([timesheet()]);

    expect(buildPayrollCsv(rows)).toBe(buildPayrollCsv(rows));
  });
});
