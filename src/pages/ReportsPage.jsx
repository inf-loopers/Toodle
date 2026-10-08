/**
 * @file ReportsPage.jsx
 * @description Analytics and reporting dashboard for the Admin.
 *
 * Responsibilities:
 * - Fetches real records from the API: courses, allocations, and approved timesheets.
 * - Summary metric cards (weekly allocated hours, logged hours, active tutors, unfilled courses).
 * - CSS-based bar charts for hours per course (allocated vs logged), tutor workload, and staffing fill.
 * - Week/month period filter for the time-based (logged hours) side of the report.
 * - Client-side payroll CSV export of approved timesheet entries using Blob + URL.createObjectURL.
 * - Budget vs spend comparison per course, from each course's budget relation
 *   (staff-only field, already shown on Course Detail) — not a separate figure.
 *
 * All totals are calculated client-side from live API records — no mock numbers.
 *
 * Route: `/reports` (Admin only)
 */

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
  Users,
  AlertTriangle,
  CalendarRange,
  Download,
  Wallet,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { allocationsApi } from '../api/allocations';
import { timesheetsApi } from '../api/timesheets';
import { tutorsApi } from '../api/tutors';
import { formatHours } from '../utils/helpers';
import { buildPayrollCsv, buildPayrollRows } from '../utils/payrollExport';
import { buildBudgetRows, summarizeBudget } from '../utils/budgetReport';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/EmptyState';

function Bar({ label, value, max, suffix = '', tone = 'bg-primary' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="text-slate-400">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Side-by-side allocated / logged bar for a single course.
 * Both bars share the same max so they are visually comparable.
 */
function DualBar({ label, allocated, logged, max, suffix = '' }) {
  const allocPct = max > 0 ? Math.min(100, (allocated / max) * 100) : 0;
  const logPct = max > 0 ? Math.min(100, (logged / max) * 100) : 0;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-600">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-[10px] text-slate-400">Allocated</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${allocPct}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-[10px] text-slate-400">
            {allocated}
            {suffix}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-[10px] text-slate-400">Logged</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${logPct}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-[10px] text-slate-400">
            {logged}
            {suffix}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Spend vs budget bar for a single course — mirrors the look of `Bar` but
 * formats both numbers as currency and switches to the "over budget" tone
 * when spend has exceeded the allocation.
 */
function BudgetBar({ label, spent, amount, remaining, overBudget }) {
  const max = Math.max(amount, spent, 1);
  const pct = Math.min(100, (spent / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className={overBudget ? 'font-medium text-rose-600' : 'text-slate-400'}>
          R{spent.toLocaleString('en-US')} / R{amount.toLocaleString('en-US')}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${overBudget ? 'bg-rose-400' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1 text-[10px] ${overBudget ? 'text-rose-500' : 'text-slate-400'}`}>
        {overBudget
          ? `R${Math.abs(remaining).toLocaleString('en-US')} over budget`
          : `R${remaining.toLocaleString('en-US')} remaining`}
      </p>
    </div>
  );
}

/**
 * Logged hours for a single timesheet. Prefers the server-computed
 * `totalHours` and falls back to summing the entry records client-side.
 */
function timesheetHours(ts) {
  if (ts.totalHours != null) return Number(ts.totalHours) || 0;
  return (ts.entries ?? []).reduce((s, e) => s + Number(e.hoursWorked || 0), 0);
}

export function ReportsPage() {
  const {
    data: courses,
    loading: coursesLoading,
    error: coursesError,
  } = useApi(coursesApi.getCourses);
  const {
    data: allocations,
    loading: allocLoading,
    error: allocError,
  } = useApi(allocationsApi.getAllocations);
  // Reports is Admin-only, so this is permitted — used to show the rate
  // offered per course (each tutor's `currentRate`, scoped by `allocations`).
  const { data: tutors, loading: tutorsLoading, error: tutorsError } = useApi(tutorsApi.getTutors);
  // Only approved timesheets feed the report — hours are final once approved.
  // include=entries additionally attaches each entry (date, hours,
  // description, course) so the payroll CSV export can report one row per
  // logged entry rather than only the aggregated weekly total.
  const {
    data: timesheets,
    loading: tsLoading,
    error: tsError,
  } = useApi(timesheetsApi.getTimesheets, {
    params: [{ status: 'APPROVED', include: 'entries' }],
  });

  const loading = coursesLoading || allocLoading || tsLoading || tutorsLoading;
  const error = coursesError || allocError || tsError || tutorsError;

  const courseList = useMemo(() => courses?.data ?? courses ?? [], [courses]);
  const allocationList = useMemo(() => allocations?.data ?? allocations ?? [], [allocations]);
  const timesheetList = useMemo(() => timesheets?.data ?? timesheets ?? [], [timesheets]);
  const tutorList = useMemo(() => tutors?.data ?? tutors ?? [], [tutors]);

  // ── Rate offered per course ─────────────────────────────────────────
  // For each tutor, attribute their currently effective rate to every
  // course they currently hold an allocation on, so the Budget vs spend
  // card can show "who is paid what" alongside each course's spend.
  const ratesByCourse = useMemo(() => {
    const byCourse = new Map();
    for (const tutor of tutorList) {
      if (tutor.currentRate == null) continue;
      for (const allocation of tutor.allocations ?? []) {
        const list = byCourse.get(allocation.courseId) ?? [];
        list.push({ name: tutor.name || tutor.email, rate: tutor.currentRate.rate });
        byCourse.set(allocation.courseId, list);
      }
    }
    return byCourse;
  }, [tutorList]);

  // Only ACTIVE allocations consume hours and staffing capacity — PENDING
  // rows are unapproved proposals and REMOVED rows are retired history.
  const activeAllocations = useMemo(
    () => allocationList.filter((a) => a.status === 'ACTIVE'),
    [allocationList]
  );

  // ── Period filter (week or month) ───────────────────────────────────
  // Allocations describe the current state, so the filter applies to the
  // time-based side of the report: logged hours from approved timesheets.
  const [period, setPeriod] = useState('week');

  const { periodLabel, rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    // Use UTC calendar fields throughout: weekStartDate/entry.date are
    // date-only columns that always serialise as UTC midnight, so computing
    // "this week"/"this month" from the browser's local calendar day could
    // shift the boundary by the viewer's UTC offset. Working in UTC keeps
    // the filter correct (and reproducible) regardless of local timezone.
    if (period === 'week') {
      const mondayOffset = (now.getUTCDay() + 6) % 7;
      const monday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset)
      );
      const nextMonday = new Date(
        Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 7)
      );
      return { periodLabel: 'this week', rangeStart: monday, rangeEnd: nextMonday };
    }
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { periodLabel: 'this month', rangeStart: monthStart, rangeEnd: nextMonth };
  }, [period]);

  const timesheetsInPeriod = useMemo(
    () =>
      timesheetList.filter((ts) => {
        const d = new Date(ts.weekStartDate);
        return !Number.isNaN(d.getTime()) && d >= rangeStart && d < rangeEnd;
      }),
    [timesheetList, rangeStart, rangeEnd]
  );

  // ── Logged hours per course and per course/tutor pair ──────────────
  // Timesheets are already filtered to APPROVED server-side; the period
  // filter narrows them further to the selected week or month.
  const loggedHours = useMemo(() => {
    const byCourse = new Map();
    const byPair = new Map();
    for (const ts of timesheetsInPeriod) {
      const hours = timesheetHours(ts);
      byCourse.set(ts.courseId, (byCourse.get(ts.courseId) || 0) + hours);
      const key = `${ts.courseId}|${ts.userId}`;
      byPair.set(key, (byPair.get(key) || 0) + hours);
    }
    return { byCourse, byPair };
  }, [timesheetsInPeriod]);

  // ── Per-course report rows (shared by cards, charts and CSV export) ──
  const reportRows = useMemo(() => {
    return courseList.map((c) => {
      const courseAllocations = activeAllocations.filter((a) => a.courseId === c.id);
      return {
        course: c,
        allocatedHours: courseAllocations.reduce((s, a) => s + Number(a.hoursPerWeek || 0), 0),
        loggedHours: loggedHours.byCourse.get(c.id) || 0,
        assigned: courseAllocations.length,
        required: Number(c.requiredTutors) || 0,
      };
    });
  }, [courseList, activeAllocations, loggedHours]);

  // ── Summary metrics ─────────────────────────────────────────────────
  const totalWeeklyHours = reportRows.reduce((s, r) => s + r.allocatedHours, 0);
  const totalLoggedHours = reportRows.reduce((s, r) => s + r.loggedHours, 0);
  const unfilledCourses = reportRows.filter((r) => r.assigned < r.required).length;

  // ── Chart views (sorted copies — CSS bars, no chart library) ───────
  const hoursByCourse = useMemo(
    () => [...reportRows].sort((a, b) => b.allocatedHours - a.allocatedHours),
    [reportRows]
  );
  // Most understaffed courses first — the actionable end of the report.
  const staffing = useMemo(
    () => [...reportRows].sort((a, b) => b.required - b.assigned - (a.required - a.assigned)),
    [reportRows]
  );
  // Scale the dual-bar chart to the larger of allocated and logged hours.
  const chartMax = Math.max(1, ...reportRows.flatMap((r) => [r.allocatedHours, r.loggedHours]));

  // ── Workload per tutor ──────────────────────────────────────────────
  // Derived from allocations, which embed the tutor record (name and weekly
  // cap) — no separate tutors request needed for this report.
  const workloadPerTutor = useMemo(() => {
    const byTutor = new Map();
    for (const a of activeAllocations) {
      const tutor = a.user ?? { id: a.userId, name: a.userId };
      const entry = byTutor.get(a.userId) ?? {
        tutor,
        hours: 0,
        capacity: Number(tutor.maxHoursPerWeek) || 0,
      };
      entry.hours += Number(a.hoursPerWeek || 0);
      byTutor.set(a.userId, entry);
    }
    return [...byTutor.values()].sort((a, b) => b.hours - a.hours);
  }, [activeAllocations]);

  const maxTutorHours = Math.max(1, ...workloadPerTutor.map((t) => t.hours));
  const activeTutors = workloadPerTutor.filter((t) => t.hours > 0).length;

  // ── Budget vs spend (staff-only `course.budget` relation) ───────────
  // Spend here is the same `budget.spent` figure Course Detail already
  // shows for staff — this report only compares it against the budget
  // amount side by side, it never recomputes "spend" independently.
  const budgetRows = useMemo(() => buildBudgetRows(courseList), [courseList]);
  const budgetSummary = useMemo(() => summarizeBudget(budgetRows), [budgetRows]);

  // ── Payroll CSV export (browser-native Blob + URL.createObjectURL) ──
  // One row per approved, logged timesheet entry — course, tutor, week,
  // exact date, hours and description — so the file can be imported
  // straight into a payroll run. By default it is scoped to the selected
  // week/month period; `exportAllHistory` lets the user export every
  // approved entry on record instead.
  const [exportAllHistory, setExportAllHistory] = useState(false);

  const payrollRows = useMemo(
    () => buildPayrollRows(exportAllHistory ? timesheetList : timesheetsInPeriod),
    [exportAllHistory, timesheetList, timesheetsInPeriod]
  );

  const exportCsv = () => {
    const csv = buildPayrollCsv(payrollRows);
    // Prepend a UTF-8 BOM so Excel (which otherwise guesses the legacy
    // ANSI codepage) renders accented tutor/course names correctly.
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportAllHistory
      ? 'toodle-payroll-export-all.csv'
      : `toodle-payroll-export-${rangeStart.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <Spinner fullPage label="Crunching the numbers…" />;
  if (error) return <ErrorState title="Couldn't load reports" description={error} />;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="mt-2 text-sm text-slate-500">
            Allocated vs logged hours, staffing and tutor workload — computed live from API records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CalendarRange className="h-4 w-4 text-slate-400" />
          <Select
            aria-label="Report period"
            className="w-auto"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">This week</option>
            <option value="month">This month</option>
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={exportAllHistory}
              onChange={(e) => setExportAllHistory(e.target.checked)}
            />
            Export full approved history
          </label>
          <Button variant="secondary" onClick={exportCsv} disabled={payrollRows.length === 0}>
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <BarChart3 className="h-3.5 w-3.5" /> Weekly hours
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatHours(totalWeeklyHours)}</p>
          <p className="mt-1 text-xs text-slate-400">
            across {activeAllocations.length} active allocation
            {activeAllocations.length === 1 ? '' : 's'}
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Approved hours
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatHours(totalLoggedHours)}</p>
          <p className="mt-1 text-xs text-slate-400">
            from {timesheetsInPeriod.length} timesheet{timesheetsInPeriod.length === 1 ? '' : 's'}{' '}
            {periodLabel}
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Users className="h-3.5 w-3.5" /> Active tutors
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeTutors}</p>
          <p className="mt-1 text-xs text-slate-400">with current allocations</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5" /> Unfilled courses
          </p>
          <p
            className={`mt-2 text-3xl font-bold ${unfilledCourses > 0 ? 'text-amber-600' : 'text-slate-900'}`}
          >
            {unfilledCourses}
          </p>
          <p className="mt-1 text-xs text-slate-400">below their required tutor quota</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Hours per course"
            description="Allocated weekly hours vs logged hours from approved timesheets."
          />
          <CardBody className="space-y-5">
            {totalWeeklyHours === 0 && totalLoggedHours === 0 ? (
              <p className="text-sm text-slate-400">No allocations or approved timesheets yet.</p>
            ) : (
              hoursByCourse
                .slice(0, 8)
                .map(({ course, allocatedHours, loggedHours }) => (
                  <DualBar
                    key={course.id}
                    label={course.code}
                    allocated={allocatedHours}
                    logged={loggedHours}
                    max={chartMax}
                    suffix="h"
                  />
                ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Workload spread"
            description="Weekly hours per tutor against their weekly cap."
          />
          <CardBody className="space-y-4">
            {workloadPerTutor.length === 0 ? (
              <p className="text-sm text-slate-400">No tutors have hours allocated yet.</p>
            ) : (
              workloadPerTutor
                .slice(0, 8)
                .map(({ tutor, hours, capacity }) => (
                  <Bar
                    key={tutor.id}
                    label={tutor.name || tutor.email}
                    value={hours}
                    max={capacity || maxTutorHours}
                    suffix={capacity ? ` / ${capacity}h` : 'h'}
                    tone={capacity && hours > capacity ? 'bg-rose-400' : 'bg-accent'}
                  />
                ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Course staffing"
          description="Assigned tutors against each course's required quota."
        />
        <CardBody className="space-y-4">
          {staffing.length === 0 ? (
            <p className="text-sm text-slate-400">No courses registered yet.</p>
          ) : (
            staffing.map(({ course, assigned, required }) => {
              const quota = required || 1;
              const shortfall = required - assigned;
              return (
                <Bar
                  key={course.id}
                  label={course.code}
                  value={assigned}
                  max={quota}
                  suffix={` / ${quota} tutor${quota === 1 ? '' : 's'}`}
                  tone={
                    shortfall > 0
                      ? assigned === 0
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                      : 'bg-emerald-500'
                  }
                />
              );
            })
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Budget vs spend"
          description="Recorded spend against each course's allocated budget."
        />
        <CardBody className="space-y-4">
          {budgetRows.length === 0 ? (
            <p className="text-sm text-slate-400">No courses have a budget set yet.</p>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Wallet className="h-3.5 w-3.5" />R{budgetSummary.spent.toLocaleString('en-US')}{' '}
                spent of R{budgetSummary.amount.toLocaleString('en-US')} budgeted
                {budgetSummary.coursesOverBudget > 0 && (
                  <span className="font-medium text-rose-600">
                    · {budgetSummary.coursesOverBudget} course
                    {budgetSummary.coursesOverBudget === 1 ? '' : 's'} over budget
                  </span>
                )}
              </p>
              {budgetRows.map((r) => (
                <div key={r.courseId}>
                  <BudgetBar
                    label={r.code}
                    spent={r.spent}
                    amount={r.amount}
                    remaining={r.remaining}
                    overBudget={r.overBudget}
                  />
                  {(ratesByCourse.get(r.courseId) ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ratesByCourse.get(r.courseId).map((t, i) => (
                        <span
                          key={`${t.name}-${i}`}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                        >
                          {t.name} — R{Number(t.rate).toFixed(2)}/hr
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="pt-1 text-[11px] font-medium text-slate-500">
                {budgetSummary.coursesOverBudget > 0
                  ? `R${Math.abs(budgetSummary.remaining).toLocaleString('en-US')} over budget overall`
                  : `R${budgetSummary.remaining.toLocaleString('en-US')} remaining overall`}
              </p>
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}

export default ReportsPage;
