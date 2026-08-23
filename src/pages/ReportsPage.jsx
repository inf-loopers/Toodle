/**
 * @file ReportsPage.jsx
 * @description Analytics and reporting dashboard for the Organiser.
 *
 * Responsibilities:
 * - Summary metric cards (allocation rate, avg hours, unfilled courses, swap rate).
 * - Visual bar charts for tutor workload distribution and course fill rates.
 * - Recent reports table with download actions.
 * - Period selector for weekly/monthly/semester views.
 *
 * Route: `/reports`
 */

import { useMemo } from 'react';
import { BarChart3, Wallet, Users } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { allocationsApi } from '../api/allocations';
import { tutorsApi } from '../api/tutors';
import { formatHours } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
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

export function ReportsPage() {
  const { data: courses, loading: coursesLoading, error } = useApi(coursesApi.getCourses);
  const { data: allocations, loading: allocLoading } = useApi(allocationsApi.getAllocations);
  const { data: tutors, loading: tutorsLoading } = useApi(tutorsApi.getTutors);

  const loading = coursesLoading || allocLoading || tutorsLoading;
  const courseList = useMemo(() => courses?.data ?? courses ?? [], [courses]);
  const allocationList = useMemo(() => allocations?.data ?? allocations ?? [], [allocations]);
  const tutorList = useMemo(() => tutors?.data ?? tutors ?? [], [tutors]);

  const hoursPerCourse = useMemo(() => {
    return courseList
      .map((c) => ({
        course: c,
        hours: allocationList
          .filter((a) => a.courseId === c.id)
          .reduce((s, a) => s + Number(a.hoursPerWeek || 0), 0),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [courseList, allocationList]);

  const maxHours = Math.max(1, ...hoursPerCourse.map((c) => c.hours));

  const workloadPerTutor = useMemo(() => {
    return tutorList
      .map((t) => ({
        tutor: t,
        hours: allocationList
          .filter((a) => a.userId === t.id)
          .reduce((s, a) => s + Number(a.hoursPerWeek || 0), 0),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [tutorList, allocationList]);

  const maxTutorHours = Math.max(1, ...workloadPerTutor.map((t) => t.hours));

  const budgeted = courseList.filter((c) => c.budget);
  const totalAmount = budgeted.reduce((s, c) => s + Number(c.budget.amount || 0), 0);
  const totalSpent = budgeted.reduce((s, c) => s + Number(c.budget.spent || 0), 0);

  if (loading) return <Spinner fullPage label="Crunching the numbers…" />;
  if (error) return <ErrorState title="Couldn't load reports" description={error} />;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-2 text-sm text-slate-500">
          Hours per course, budget spend, and how the work is spread across tutors.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Total weekly hours</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatHours(allocationList.reduce((s, a) => s + Number(a.hoursPerWeek || 0), 0))}
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Wallet className="h-3.5 w-3.5" /> Budget spent
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            R{totalSpent.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-400">
              / R{totalAmount.toLocaleString()}
            </span>
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Users className="h-3.5 w-3.5" /> Active tutors
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {workloadPerTutor.filter((t) => t.hours > 0).length}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Hours per course"
            description="Weekly tutor hours allocated, by course."
          />
          <CardBody className="space-y-4">
            {hoursPerCourse.length === 0 ? (
              <p className="text-sm text-slate-400">No allocations yet.</p>
            ) : (
              hoursPerCourse
                .slice(0, 8)
                .map(({ course, hours }) => (
                  <Bar
                    key={course.id}
                    label={course.code}
                    value={hours}
                    max={maxHours}
                    suffix="h"
                  />
                ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Workload spread" description="Weekly hours per tutor." />
          <CardBody className="space-y-4">
            {workloadPerTutor.filter((t) => t.hours > 0).length === 0 ? (
              <p className="text-sm text-slate-400">No tutors have hours allocated yet.</p>
            ) : (
              workloadPerTutor
                .filter((t) => t.hours > 0)
                .slice(0, 8)
                .map(({ tutor, hours }) => (
                  <Bar
                    key={tutor.id}
                    label={tutor.name}
                    value={hours}
                    max={maxTutorHours}
                    suffix="h"
                    tone="bg-accent"
                  />
                ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Budget by course" description="Spend against the allocated budget." />
        <CardBody className="space-y-4">
          {budgeted.length === 0 ? (
            <p className="text-sm text-slate-400">No course has a budget configured yet.</p>
          ) : (
            budgeted.map((c) => (
              <Bar
                key={c.id}
                label={c.code}
                value={Number(c.budget.spent)}
                max={Number(c.budget.amount) || 1}
                suffix=" spent"
                tone="bg-emerald-500"
              />
            ))
          )}
        </CardBody>
      </Card>
    </>
  );
}

export default ReportsPage;
