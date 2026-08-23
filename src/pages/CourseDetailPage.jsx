/**
 * @file CourseDetailPage.jsx
 * @description Course detail overview view.
 *
 * Responsibilities:
 * - Fetches and displays full details for a specific course by URL parameter `id`.
 * - Shows scheduled contact sessions (day, time, venue, tutorial vs. lab).
 * - Lists allocated tutors for this course with their marks and contact details.
 * - Displays prerequisite mark requirements and staffing status.
 * - Allows Organisers to navigate directly to allocation management for this course.
 *
 * Route: `/courses/:id`
 * Endpoint Connections: `GET /courses/:id`, `GET /courses/:id/sessions`
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, MapPin, Wallet } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { allocationsApi } from '../api/allocations';
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
  const [form, setForm] = useState({ dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '12:00', venue: '', sessionType: 'TUTORIAL' });
  const [submitting, setSubmitting] = useState(false);
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await coursesApi.createCourseSession(courseId, form);
      onCreated();
      onClose();
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
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting}>Add session</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Day" value={form.dayOfWeek} onChange={update('dayOfWeek')}>
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>{formatDay(d)}</option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start time" type="time" value={form.startTime} onChange={update('startTime')} />
          <Input label="End time" type="time" value={form.endTime} onChange={update('endTime')} />
        </div>
        <Input label="Venue" placeholder="e.g. CompLab 3" value={form.venue} onChange={update('venue')} />
        <Select label="Session type" value={form.sessionType} onChange={update('sessionType')}>
          {Object.values(SESSION_TYPES).map((t) => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}

export function CourseDetailPage() {
  const { id } = useParams();
  const { isOrganiser } = useAuth();
  const { data: course, loading, error } = useApi(coursesApi.getCourse, { params: [id] });
  const { data: sessions, refetch: refetchSessions } = useApi(coursesApi.getCourseSessions, { params: [id] });
  const { data: allocations } = useApi(allocationsApi.getAllocations, { params: [{ courseId: id }] });
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  if (loading) return <Spinner fullPage label="Loading course…" />;
  if (error) return <ErrorState title="Couldn't load this course" description={error} />;

  const courseData = course?.data ?? course;
  const sessionList = sessions?.data ?? sessions ?? [];
  const allocationList = allocations?.data ?? allocations ?? [];
  const budget = courseData?.budget;

  return (
    <>
      <Link to="/courses" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{courseData?.code}</h1>
            <Badge tone="neutral">Sem {courseData?.semester} · {courseData?.year}</Badge>
          </div>
          <p className="mt-1 text-lg text-slate-600">{courseData?.name}</p>
          {courseData?.description && <p className="mt-2 max-w-2xl text-sm text-slate-500">{courseData.description}</p>}
        </div>

        {isOrganiser && (
          <Link to="/allocations">
            <Button variant="secondary">Manage on Allocation Board</Button>
          </Link>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Tutors needed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{allocationList.length} / {courseData?.requiredTutors ?? 1}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Min. mark required</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{courseData?.minMarkRequired ?? 50}%</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Wallet className="h-3.5 w-3.5" /> Budget
          </p>
          {budget ? (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              R{Number(budget.spent).toLocaleString()} <span className="text-sm font-normal text-slate-400">/ R{Number(budget.amount).toLocaleString()}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No budget set</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title="Sessions"
              description="The term's timetable for this course."
              action={
                isOrganiser && (
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
            <CardHeader title="Assigned tutors" description="Who's currently allocated to this course." />
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

      {isOrganiser && (
        <AddSessionModal
          open={sessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
          courseId={id}
          onCreated={refetchSessions}
        />
      )}
    </>
  );
}

export default CourseDetailPage;
