/**
 * @file DashboardPage.jsx
 * @description Central dashboard view for the Toodle tutor platform.
 *
 * Responsibilities:
 * - Renders the main dashboard layout with a search bar and notification button.
 * - Displays summary stat cards for courses, tutors, assignments, and unfilled slots.
 * - Shows recent activity feed and upcoming sessions.
 *
 * Route: `/dashboard`
 */

import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  HandHeart,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { tutorsApi } from '../api/tutors';
import { allocationsApi } from '../api/allocations';
import { overflowApi } from '../api/overflow';
import { timesheetsApi } from '../api/timesheets';
import { swapsApi } from '../api/swaps';
import { ROLES } from '../utils/constants';
import { formatHours } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/EmptyState';
import LogoutButton from '../components/auth/LogoutButton';

function StatCard({ icon: Icon, label, value, description, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-subtle text-primary',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {description && <p className="mt-3 text-xs text-slate-400">{description}</p>}
    </Card>
  );
}

function Welcome({ name, tagline }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-primary">2026 Academic Year</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        Welcome back{name ? `, ${name.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{tagline}</p>
    </div>
  );
}

// ── Organiser ────────────────────────────────────────────────────────────

function OrganiserDashboard({ user }) {
  const {
    data: courses,
    loading: coursesLoading,
    error: coursesError,
  } = useApi(coursesApi.getCourses);
  const { data: tutors, loading: tutorsLoading } = useApi(tutorsApi.getTutors);
  const { data: allocations, loading: allocLoading } = useApi(allocationsApi.getAllocations);

  if (coursesLoading || tutorsLoading || allocLoading)
    return <Spinner fullPage label="Loading your dashboard…" />;
  if (coursesError) {
    return (
      <ErrorState
        title="Couldn't load dashboard data"
        description={coursesError}
        action={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <LogoutButton className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100" />
          </div>
        }
      />
    );
  }

  const courseList = courses?.data ?? courses ?? [];
  const tutorList = tutors?.data ?? tutors ?? [];
  const allocationList = allocations?.data ?? allocations ?? [];

  const activeAllocations = allocationList.filter(
    (a) => a.status === 'ACTIVE' || a.status === 'PENDING'
  );
  const unfilled = courseList.filter(
    (c) => allocationList.filter((a) => a.courseId === c.id).length < (c.requiredTutors ?? 1)
  );

  return (
    <>
      <Welcome
        name={user?.name}
        tagline="Here's how allocations are shaping up across the school this week."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Courses"
          value={courseList.length}
          description="Courses this semester"
        />
        <StatCard
          icon={Users}
          label="Tutors"
          value={tutorList.length}
          tone="emerald"
          description="Registered tutors"
        />
        <StatCard
          icon={CheckCircle2}
          label="Allocations"
          value={activeAllocations.length}
          tone="primary"
          description="Active or pending assignments"
        />
        <StatCard
          icon={AlertTriangle}
          label="Unfilled Courses"
          value={unfilled.length}
          tone={unfilled.length > 0 ? 'rose' : 'emerald'}
          description="Still need a tutor"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Courses needing tutors"
            description="Prioritise these on the allocation board."
            action={
              <Link to="/allocations">
                <Button size="sm" variant="secondary">
                  Open board <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          />
          <CardBody>
            {unfilled.length === 0 ? (
              <p className="text-sm text-slate-400">
                Every course has at least one tutor. Nice work.
              </p>
            ) : (
              <div className="space-y-3">
                {unfilled.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{course.code}</p>
                      <p className="text-xs text-slate-500">{course.name}</p>
                    </div>
                    <Badge tone="warning">Needs tutor</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick actions" description="Jump back into the day-to-day." />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/allocations"
              className="rounded-xl border border-slate-200 p-4 hover:border-primary hover:bg-primary-subtle"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Generate allocation</p>
              <p className="mt-0.5 text-xs text-slate-400">Let Toodle propose assignments</p>
            </Link>
            <Link
              to="/timesheets"
              className="rounded-xl border border-slate-200 p-4 hover:border-primary hover:bg-primary-subtle"
            >
              <Clock className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Review timesheets</p>
              <p className="mt-0.5 text-xs text-slate-400">Approve submitted hours</p>
            </Link>
            <Link
              to="/volunteers"
              className="rounded-xl border border-slate-200 p-4 hover:border-primary hover:bg-primary-subtle"
            >
              <HandHeart className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Post overflow work</p>
              <p className="mt-0.5 text-xs text-slate-400">Open work for volunteers</p>
            </Link>
            <Link
              to="/reports"
              className="rounded-xl border border-slate-200 p-4 hover:border-primary hover:bg-primary-subtle"
            >
              <Users className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold text-slate-800">View reports</p>
              <p className="mt-0.5 text-xs text-slate-400">Hours, budget & spread</p>
            </Link>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

// ── Tutor ────────────────────────────────────────────────────────────────

function TutorDashboard({ user }) {
  const {
    data: allocations,
    loading: allocLoading,
    error: allocError,
  } = useApi(allocationsApi.getAllocations);
  const {
    data: timesheets,
    loading: tsLoading,
    error: tsError,
  } = useApi(timesheetsApi.getTimesheets);
  const { data: swaps, loading: swapsLoading, error: swapsError } = useApi(swapsApi.getSwaps);

  if (allocLoading || tsLoading || swapsLoading)
    return <Spinner fullPage label="Loading your dashboard…" />;
  const dashError = allocError || tsError || swapsError;
  if (dashError) {
    return (
      <ErrorState
        title="Couldn't load your dashboard"
        description={dashError}
        action={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <LogoutButton className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100" />
          </div>
        }
      />
    );
  }

  const allocationList = allocations?.data ?? allocations ?? [];
  const timesheetList = timesheets?.data ?? timesheets ?? [];
  const swapList = swaps?.data ?? swaps ?? [];

  const totalHours = allocationList.reduce((sum, a) => sum + Number(a.hoursPerWeek || 0), 0);
  const maxHours = user?.maxHoursPerWeek ?? 10;
  const pendingSwaps = swapList.filter((s) => s.status === 'PENDING').length;
  const draftTimesheets = timesheetList.filter(
    (t) => t.status === 'DRAFT' || t.status === 'DISPUTED'
  ).length;

  return (
    <>
      <Welcome name={user?.name} tagline="Here's what's on your plate this week." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Courses"
          value={allocationList.length}
          description="Active assignments"
        />
        <StatCard
          icon={Clock}
          label="Weekly Hours"
          value={`${formatHours(totalHours)} / ${maxHours}h`}
          tone="emerald"
          description="Allocated vs. your cap"
        />
        <StatCard
          icon={AlertTriangle}
          label="Timesheets"
          value={draftTimesheets}
          tone={draftTimesheets > 0 ? 'amber' : 'emerald'}
          description="Need your attention"
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Swap Requests"
          value={pendingSwaps}
          tone={pendingSwaps > 0 ? 'amber' : 'emerald'}
          description="Awaiting a response"
        />
      </div>

      <Card>
        <CardHeader
          title="My courses"
          description="Sessions you're currently tutoring."
          action={
            <Link to="/timesheets">
              <Button size="sm" variant="secondary">
                Log hours <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        />
        <CardBody>
          {allocationList.length === 0 ? (
            <p className="text-sm text-slate-400">You haven't been assigned to a course yet.</p>
          ) : (
            <div className="space-y-3">
              {allocationList.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {a.course?.code || a.courseId}
                    </p>
                    <p className="text-xs text-slate-400">{a.course?.name}</p>
                  </div>
                  <Badge tone="primary">{formatHours(a.hoursPerWeek)} / week</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

// ── Student ──────────────────────────────────────────────────────────────

function StudentDashboard({ user }) {
  const {
    data: posts,
    loading,
    error: postsError,
  } = useApi(overflowApi.getPosts, { params: [{ status: 'OPEN' }] });

  if (loading) return <Spinner fullPage label="Loading opportunities…" />;
  if (postsError) {
    return (
      <ErrorState
        title="Couldn't load opportunities"
        description={postsError}
        action={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <LogoutButton className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100" />
          </div>
        }
      />
    );
  }
  const postList = posts?.data ?? posts ?? [];

  return (
    <>
      <Welcome name={user?.name} tagline="Overflow work nobody has claimed yet is listed below." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={HandHeart}
          label="Open Opportunities"
          value={postList.length}
          description="Ready to claim"
        />
        <StatCard
          icon={Clock}
          label="Weekly Cap"
          value={`${user?.maxHoursPerWeek ?? 10}h`}
          tone="emerald"
          description="Your maximum hours"
        />
      </div>

      <Card>
        <CardHeader
          title="Overflow work"
          description="First come, first served — an organiser approves each claim."
          action={
            <Link to="/volunteers">
              <Button size="sm" variant="secondary">
                Browse all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        />
        <CardBody>
          {postList.length === 0 ? (
            <p className="text-sm text-slate-400">
              No overflow work is open right now — check back soon.
            </p>
          ) : (
            <div className="space-y-3">
              {postList.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {post.course?.code || post.courseId}
                    </p>
                    <p className="text-xs text-slate-400">
                      {post.description || `${post.hoursPerWeek}h per week`}
                    </p>
                  </div>
                  <Badge tone="info">{formatHours(post.hoursPerWeek)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

export function DashboardPage() {
  const { user, role } = useAuth();

  if (role === ROLES.ORGANISER) return <OrganiserDashboard user={user} />;
  if (role === ROLES.TUTOR) return <TutorDashboard user={user} />;
  return <StudentDashboard user={user} />;
}

export default DashboardPage;
