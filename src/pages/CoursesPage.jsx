/**
 * @file CoursesPage.jsx
 * @description Course catalog and management page.
 *
 * Responsibilities:
 * - Lists all active computer science courses with staffing status.
 * - Real-time client-side search and filtering by code or title.
 * - Displays staffing status badges and prerequisite minimum marks.
 * - "Add New Course" button for Organiser.
 *
 * Route: `/courses`
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Search, ArrowRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/constants';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

function CreateCourseModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    year: 2026,
    semester: 1,
    requiredTutors: 1,
    minMarkRequired: 50,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.code || !form.name) {
      setError('Course code and name are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await coursesApi.createCourse({
        ...form,
        year: Number(form.year),
        semester: Number(form.semester),
        requiredTutors: Number(form.requiredTutors),
        minMarkRequired: Number(form.minMarkRequired),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not create the course.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New course"
      description="Add a course for organisers to allocate tutors against."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Create course
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Course code"
            placeholder="COMS3011A"
            value={form.code}
            onChange={update('code')}
          />
          <Input label="Year" type="number" value={form.year} onChange={update('year')} />
        </div>
        <Input
          label="Course name"
          placeholder="Data Structures"
          value={form.name}
          onChange={update('name')}
        />
        <Textarea label="Description" value={form.description} onChange={update('description')} />
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Semester"
            type="number"
            min={1}
            max={2}
            value={form.semester}
            onChange={update('semester')}
          />
          <Input
            label="Tutors needed"
            type="number"
            min={1}
            value={form.requiredTutors}
            onChange={update('requiredTutors')}
          />
          <Input
            label="Min. mark %"
            type="number"
            min={0}
            max={100}
            value={form.minMarkRequired}
            onChange={update('minMarkRequired')}
          />
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

export function CoursesPage() {
  const { isOrganiser } = useAuth();
  const { data, loading, error, refetch } = useApi(coursesApi.getCourses);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const courses = data?.data ?? data ?? [];
  const filtered = courses.filter(
    (c) =>
      c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner fullPage label="Loading courses…" />;
  if (error)
    return (
      <ErrorState
        title="Couldn't load courses"
        description={error}
        action={<Button onClick={refetch}>Try again</Button>}
      />
    );

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Courses</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isOrganiser
              ? 'Everything the school is running this semester.'
              : 'The courses you tutor for.'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="w-44 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {isOrganiser && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New course
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description={
            search ? 'Try a different search term.' : 'Courses will appear here once added.'
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <Badge tone="neutral">
                    Sem {course.semester} · {course.year}
                  </Badge>
                </div>
                <h3 className="mt-4 font-bold text-slate-900">{course.code}</h3>
                <p className="text-sm text-slate-500">{course.name}</p>
                {course.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-400">{course.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-400">
                    {course.requiredTutors ?? 1} tutor(s) needed
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                    Details <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {isOrganiser && (
        <CreateCourseModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={refetch}
        />
      )}
    </>
  );
}

export default CoursesPage;
