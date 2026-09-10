/**
 * @file ReportsPage.jsx
 * @description Analytics and reporting dashboard for the Organiser.
 *
 * Responsibilities:
 * - Fetches real records from the API: courses, allocations, and approved timesheets.
 * - Summary metric cards (weekly allocated hours, logged hours, active tutors, unfilled courses).
 * - CSS-based bar charts for hours per course (allocated vs logged), tutor workload, and staffing fill.
 * - Week/month period filter for the time-based (logged hours) side of the report.
 * - Client-side CSV export of the allocation summary using Blob + URL.createObjectURL.
 *
 * All totals are calculated client-side from live API records — no mock numbers.
 *
 * Route: `/reports` (Organiser only)
 */

import { useMemo, useState } from 'react';
import { BarChart3, Clock, Users, AlertTriangle, CalendarRange, Download } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { allocationsApi } from '../api/allocations';
import { timesheetsApi } from '../api/timesheets';
import { formatHours } from '../utils/helpers';
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
 * Logged hours for a single timesheet. Prefers the server-computed
 * `totalHours` and falls back to summing the entry records client-side.
 */
function timesheetHours(ts) {
  if (ts.totalHours != null) return Number(ts.totalHours) || 0;
  return (ts.entries ?? []).reduce((s, e) => s + Number(e.hoursWorked || 0), 0);
}

export function ReportsPage() {
  const { data: courses, loading: coursesLoading, error: coursesError } = useApi(coursesApi.getCourses);
  const { data: allocations, loading: allocLoading, error: allocError } = useApi(allocationsApi.getAllocations);
  // Only approved timesheets feed the report — hours are final once approved.
  const { data: timesheets, loading: tsLoading, error: tsError } = useApi(timesheetsApi.getTimesheets, {
    params: [{ status: 'APPROVED' }],
  });

  const loading = coursesLoading || allocLoading || tsLoading;
  const error = coursesError || allocError || tsError;

  const courseList = useMemo(() => courses?.data ?? courses ?? [], [courses]);
  const allocationList = useMemo(() => allocations?.data ?? allocations ?? [], [allocations]);
  const timesheetList = useMemo(() => timesheets?.data ?? timesheets ?? [], [timesheets]);

  // REMOVED allocations are retired assignments — exclude them from every total.
  const activeAllocations = useMemo(
    () => allocationList.filter((a) => a.status !== 'REMOVED'),
    [allocationList]
  );

  // ── Period filter (week or month) ───────────────────────────────────
  // Allocations describe the current state, so the filter applies to the
  // time-based side of the report: logged hours from approved timesheets.
  const [period, setPeriod] = useState('week');

  const { periodLabel, rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      return { periodLabel: 'this week', rangeStart: monday, rangeEnd: nextMonday };
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
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
      const entry =
        byTutor.get(a.userId) ?? {
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

  // ── CSV export (browser-native Blob + URL.createObjectURL) ─────────
  // One row per active allocation: course, tutor, allocated hours, and
  // logged hours for the selected period.
  const exportCsv = () => {
    const escapeCell = (value) => {
      const s = String(value ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Course', 'Tutor', 'Allocated hours', 'Logged hours'];
    const rows = activeAllocations.map((a) => [
      a.course?.code ?? a.courseId,
      a.user?.name ?? a.user?.email ?? a.userId,
      Number(a.hoursPerWeek || 0),
      loggedHours.byPair.get(`${a.courseId}|${a.userId}`) || 0,
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toodle-allocation-report-${rangeStart.toISOString().slice(0, 10)}.csv`;
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
          <Button variant="secondary" onClick={exportCsv} disabled={activeAllocations.length === 0}>
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
            across {activeAllocations.length} active allocation{activeAllocations.length === 1 ? '' : 's'}
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Approved hours
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatHours(totalLoggedHours)}</p>
          <p className="mt-1 text-xs text-slate-400">
            from {timesheetsInPeriod.length} timesheet{timesheetsInPeriod.length === 1 ? '' : 's'} {periodLabel}
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
              hoursByCourse.slice(0, 8).map(({ course, allocatedHours, loggedHours }) => (
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
          <CardHeader title="Workload spread" description="Weekly hours per tutor against their weekly cap." />
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
                    shortfall > 0 ? (assigned === 0 ? 'bg-rose-400' : 'bg-amber-400') : 'bg-emerald-500'
                  }
                />
              );
            })
          )}
        </CardBody>
      </Card>
    </>
  );
}

export default ReportsPage;
