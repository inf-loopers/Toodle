/**
 * @file CourseDetailPage.jsx
 * @description Course detail overview view.
 *
 * Responsibilities:
 * - Fetches and displays full details for a specific course by URL parameter `id`.
 * - Shows scheduled contact sessions (day, time, venue, tutorial vs. lab).
 * - Lists allocated tutors for this course with their marks and contact details.
 * - Displays prerequisite mark requirements and staffing status.
 * - Allows staff (admins, or lecturers coordinating this course) to manage it.
 * - Admin-only coordinator assignment via `PUT /courses/:id/coordinators`.
 *
 * Route: `/courses/:id`
 * Endpoint Connections: `GET /courses/:id`, `GET /courses/:id/sessions`
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, MapPin, Wallet, Pencil, Users } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { usersApi } from '../api/users';
import CourseApplications from '../components/CourseApplications';
import EditCourseModal from '../components/EditCourseModal';
import { useAuth } from '../hooks/useAuth';
import { formatDay, formatTime, getInitials, formatHours } from '../utils/helpers';
import { SESSION_TYPES, DAYS_OF_WEEK } from '../utils/constants';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

function AddSessionModal({ open, onClose, courseId, onCreated }) {
  const [form, setForm] = useState({
    dayOfWeek: 'MONDAY',
    startTime: '10:00',
    endTime: '12:00',
    venue: '',
    sessionType: 'TUTORIAL',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await coursesApi.createCourseSession(courseId, form);
      await onCreated();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a session"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Add session
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
        <Select label="Day" value={form.dayOfWeek} onChange={update('dayOfWeek')}>
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>
              {formatDay(d)}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start time"
            type="time"
            value={form.startTime}
            onChange={update('startTime')}
          />
          <Input label="End time" type="time" value={form.endTime} onChange={update('endTime')} />
        </div>
        <Input
          label="Venue"
          placeholder="e.g. CompLab 3"
          value={form.venue}
          onChange={update('venue')}
        />
        <Select label="Session type" value={form.sessionType} onChange={update('sessionType')}>
          {Object.values(SESSION_TYPES).map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}

/**
 * Admin-only: assign which lecturers coordinate this course.
 * Loads all LECTURER users and replaces the course's coordinator set.
 */
function CoordinatorsModal({ open, onClose, course, onUpdated }) {
  const { data: usersData, loading } = useApi(usersApi.getUsers, {
    params: [{ role: 'lecturer' }],
    immediate: open,
  });
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && course) {
      setSelected((course.coordinators ?? []).map((c) => c.userId ?? c.user?.id));
    }
  }, [open, course]);

  const lecturers = (usersData?.data ?? usersData ?? []).filter((u) => u.role === 'LECTURER');

  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );

  const save = async () => {
    setSubmitting(true);
    setError('');
    try {
      await coursesApi.setCoordinators(course.id, selected);
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save coordinators.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Course coordinators"
      description="Select the lecturers who coordinate this course. They can manage its sessions, allocations, applications and reviews."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            Save
          </Button>
        </>
      }
    >
      {loading ? (
        <Spinner label="Loading lecturers…" />
      ) : (
        <div className="space-y-2">
          {lecturers.length === 0 ? (
            <p className="text-sm text-slate-400">No lecturer accounts found.</p>
          ) : (
            lecturers.map((lecturer) => (
              <label
                key={lecturer.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(lecturer.id)}
                  onChange={() => toggle(lecturer.id)}
                  className="h-4 w-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{lecturer.name}</p>
                  <p className="truncate text-xs text-slate-400">{lecturer.email}</p>
                </div>
              </label>
            ))
          )}
          {error && (
            <p role="alert" className="text-xs text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

export function CourseDetailPage() {
  const { id } = useParams();
  const { dbUser, isAdmin, isStaff } = useAuth();
  const { data: course, loading, error, refetch } = useApi(coursesApi.getCourse, { params: [id] });
  const { data: sessions, refetch: refetchSessions } = useApi(coursesApi.getCourseSessions, {
    params: [id],
  });
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false);

  if (loading) return <Spinner fullPage label="Loading course…" />;
  if (error) return <ErrorState title="Couldn't load this course" description={error} />;

  const courseData = course?.data ?? course;
  const sessionList = sessions?.data ?? sessions ?? [];
  const allocationList = (courseData?.allocations ?? []).filter((item) => item.status === 'ACTIVE');
  const budget = courseData?.budget;

  // Admins manage every course; lecturers only the ones they coordinate.
  const canManageCourse =
    isAdmin ||
    (isStaff &&
      (courseData?.coordinators ?? []).some((c) => (c.userId ?? c.user?.id) === dbUser?.id));

  return (
    <>
      <Link
        to="/courses"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{courseData?.code}</h1>
            <Badge tone="neutral">
              Sem {courseData?.semester} · {courseData?.year}
            </Badge>
          </div>
          <p className="mt-1 text-lg text-slate-600">{courseData?.name}</p>
          {courseData?.description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{courseData.description}</p>
          )}
        </div>

        {canManageCourse && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit course
            </Button>
            <Link to="/allocations">
              <Button variant="secondary">Manage on Allocation Board</Button>
            </Link>
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Tutors needed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {canManageCourse ? `${allocationList.length} / ` : ''}
            {courseData?.requiredTutors ?? 1}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Min. mark required</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {courseData?.minMarkRequired ?? 50}%
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Wallet className="h-3.5 w-3.5" /> Budget
          </p>
          {budget ? (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              R{Number(budget.spent).toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-400">
                / R{Number(budget.amount).toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No budget set</p>
          )}
        </Card>
      </div>

      {isStaff && courseData?.coordinators && (
        <Card className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <Users className="h-3.5 w-3.5" /> Course coordinators
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {courseData.coordinators.length === 0 ? (
                  <p className="text-sm text-slate-400">No lecturers assigned yet.</p>
                ) : (
                  courseData.coordinators.map((c) => (
                    <span
                      key={c.userId ?? c.user?.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                    >
                      {c.user?.name || c.userId}
                    </span>
                  ))
                )}
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => setCoordinatorModalOpen(true)}>
                Manage coordinators
              </Button>
            )}
          </div>
        </Card>
      )}

      {courseData && <CourseApplications key={id} course={courseData} onUpdated={refetch} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title="Sessions"
              description="The term's timetable for this course."
              action={
                canManageCourse && (
                  <Button size="sm" onClick={() => setSessionModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                )
              }
            />
          </div>
          {sessionList.length === 0 ? (
            <EmptyState className="border-0" icon={Calendar} title="No sessions yet" />
          ) : (
            <div className="divide-y divide-slate-100">
              {sessionList.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDay(s.dayOfWeek)} · {formatTime(s.startTime)}–{formatTime(s.endTime)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      {s.venue && (
                        <>
                          <MapPin className="h-3 w-3" /> {s.venue} ·
                        </>
                      )}
                      {s.sessionType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title="Assigned tutors"
              description="Who's currently allocated to this course."
            />
          </div>
          {allocationList.length === 0 ? (
            <EmptyState className="border-0" title="No tutor assigned yet" />
          ) : (
            <div className="divide-y divide-slate-100">
              {allocationList.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary">
                    {getInitials(a.user?.name)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{a.user?.name || a.userId}</p>
                    <p className="text-xs text-slate-400">{formatHours(a.hoursPerWeek)} / week</p>
                  </div>
                  <Badge tone={a.status === 'ACTIVE' ? 'success' : 'neutral'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canManageCourse && (
        <AddSessionModal
          open={sessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
          courseId={id}
          onCreated={() => Promise.all([refetchSessions(), refetch()])}
        />
      )}
      {canManageCourse && courseData && (
        <EditCourseModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          course={courseData}
          onUpdated={refetch}
        />
      )}
      {isAdmin && courseData && (
        <CoordinatorsModal
          open={coordinatorModalOpen}
          onClose={() => setCoordinatorModalOpen(false)}
          course={courseData}
          onUpdated={refetch}
        />
      )}
    </>
  );
}

export default CourseDetailPage;
