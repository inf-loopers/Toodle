/**
 * @file TutorsPage.jsx
 * @description Organiser's tutor directory, marks, and capacity inspection view.
 *
 * Responsibilities:
 * - Lists all registered tutors with student numbers and contact info.
 * - Search bar to filter tutors by name, student number, or email.
 * - Displays tutor historical course marks.
 * - Displays weekly allocated hours vs. maximum hour capacity.
 * - Displays available weekdays based on tutor availability schedules.
 *
 * Role: Organiser Only
 * Route: `/tutors`
 */

import { useState } from 'react';
import { Search, Users, Clock, Award, Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { tutorsApi } from '../api/tutors';
import { coursesApi } from '../api/courses';
import { getInitials, formatDay, formatTime } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

function TutorDetailModal({ tutor, courses, open, onClose, onUpdated }) {
  const [courseId, setCourseId] = useState('');
  const [mark, setMark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!tutor) return null;

  const handleAddMark = async () => {
    if (!courseId || mark === '') return;
    setSubmitting(true);
    try {
      await tutorsApi.addOrUpdateMark(tutor.id, { courseId, mark: Number(mark) });
      onUpdated();
      setCourseId('');
      setMark('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={tutor.name} description={tutor.email} size="lg">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Marks on record
          </p>
          <div className="space-y-2">
            {(tutor.tutorMarks ?? []).length === 0 && (
              <p className="text-sm text-slate-400">No marks recorded yet.</p>
            )}
            {(tutor.tutorMarks ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="text-slate-600">{m.course?.code || m.courseId}</span>
                <Badge tone={m.mark >= 50 ? 'success' : 'danger'}>{m.mark}%</Badge>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-slate-100 p-3">
            <Select
              label="Add / update a mark"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Choose a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </Select>
            <Input
              label="Mark (%)"
              type="number"
              min={0}
              max={100}
              value={mark}
              onChange={(e) => setMark(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleAddMark}
              loading={submitting}
              disabled={!courseId || mark === ''}
              className="w-full justify-center"
            >
              Save mark
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Weekly availability
          </p>
          <div className="space-y-2">
            {(tutor.availability ?? []).length === 0 && (
              <p className="text-sm text-slate-400">No availability submitted yet.</p>
            )}
            {(tutor.availability ?? []).map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-600"
              >
                {formatDay(a.dayOfWeek)} · {formatTime(a.startTime)}–{formatTime(a.endTime)}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">Max {tutor.maxHoursPerWeek ?? 10}h / week</p>
        </div>
      </div>
    </Modal>
  );
}

export function TutorsPage() {
  const { data, loading, error, refetch } = useApi(tutorsApi.getTutors);
  const { data: coursesData } = useApi(coursesApi.getCourses);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const tutors = data?.data ?? data ?? [];
  const courses = coursesData?.data ?? coursesData ?? [];
  const filtered = tutors.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner fullPage label="Loading tutors…" />;
  if (error) return <ErrorState title="Couldn't load tutors" description={error} />;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tutors</h1>
          <p className="mt-2 text-sm text-slate-500">
            Marks, availability and weekly hours for every tutor.
          </p>
        </div>
        <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tutors…"
            className="w-48 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tutors found"
          description="Tutors will appear here once registered."
        />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-slate-100">
            {filtered.map((tutor) => (
              <button
                key={tutor.id}
                onClick={() => setSelected(tutor)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary">
                  {getInitials(tutor.name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{tutor.name}</p>
                  <p className="text-xs text-slate-400">{tutor.email}</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <Badge tone="neutral">
                    <Award className="h-3 w-3" /> {(tutor.tutorMarks ?? []).length} marks
                  </Badge>
                  <Badge tone="neutral">
                    <Clock className="h-3 w-3" /> {tutor.maxHoursPerWeek ?? 10}h cap
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <TutorDetailModal
        tutor={selected}
        courses={courses}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onUpdated={refetch}
      />
    </>
  );
}

export default TutorsPage;
