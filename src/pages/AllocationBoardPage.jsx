/**
 * @file AllocationBoardPage.jsx
 * @description Core Sprint 1 Feature — Organiser's Interactive Course Allocation Board.
 *
 * Responsibilities:
 * - Single-board visual workspace for assigning tutors to course columns.
 * - Displays course columns with staffing targets (e.g. 4/4 tutors allocated) and session times.
 * - Displays available tutor pool with remaining weekly hours and prerequisite marks.
 * - Real-time constraint engine:
 *   - Mark Threshold Check: Validates tutor's mark against course prerequisite minimum.
 *   - Timetable Clash Check: Detects overlaps between tutor busy slots and course tutorial/lab times.
 *   - Weekly Hours Limit Check: Ensures tutor does not exceed their weekly hour cap.
 * - Live constraint badges: Instant visual warnings (amber) or errors (red) before and after saving.
 * - Drag-and-drop or modal-based assignment flow.
 *
 * Role: Organiser Only
 * Endpoint Connections: `GET /allocations`, `POST /allocations`, `DELETE /allocations/:id`, `GET /allocations/validate`
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Upload, Lock, Unlock, Trash2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { tutorsApi } from '../api/tutors';
import { allocationsApi } from '../api/allocations';
import { getInitials, formatHours } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input, Textarea } from '../components/ui/Input';
import { ErrorState, EmptyState } from '../components/ui/EmptyState';

function StatChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function AssignTutorModal({ open, onClose, course, tutors, onAssigned }) {
  const [tutorId, setTutorId] = useState('');
  const [hours, setHours] = useState(2);
  const [reason, setReason] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) {
      setTutorId('');
      setHours(2);
      setReason('');
      setWarnings([]);
      setSubmitError('');
    }
  }, [open]);

  useEffect(() => {
    if (!tutorId || !course) return;
    let cancelled = false;
    setChecking(true);
    allocationsApi
      .validateAllocation({ userId: tutorId, courseId: course.id, hoursPerWeek: hours })
      .then((res) => {
        if (!cancelled) setWarnings(res?.warnings ?? res?.data?.warnings ?? []);
      })
      .catch(() => {
        if (!cancelled) setWarnings([]);
      })
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [tutorId, hours, course]);

  const handleSubmit = async () => {
    if (!tutorId) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await allocationsApi.createAllocation({
        userId: tutorId,
        courseId: course.id,
        hoursPerWeek: Number(hours),
        reason: reason || undefined,
      });
      onAssigned();
      onClose();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err.message || 'Could not create the allocation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign a tutor · ${course?.code ?? ''}`}
      description={course?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!tutorId}>
            Confirm assignment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Tutor" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
          <option value="">Select a tutor…</option>
          {tutors.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.email}
            </option>
          ))}
        </Select>

        <Input
          label="Hours per week"
          type="number"
          min={1}
          max={20}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />

        {checking && <p className="text-xs text-slate-400">Checking marks, timetable & hours…</p>}

        {warnings.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w.message || w}</span>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <Textarea
            label="Reason for overriding the warning above"
            placeholder="e.g. Tutor is being cross-trained for next semester"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}

        {submitError && <p className="text-xs text-rose-600">{submitError}</p>}
      </div>
    </Modal>
  );
}

export function AllocationBoardPage() {
  const { data: courses, loading: coursesLoading, error: coursesError } = useApi(coursesApi.getCourses);
  const { data: tutors, loading: tutorsLoading } = useApi(tutorsApi.getTutors);
  const { data: allocations, loading: allocLoading, refetch: refetchAllocations } = useApi(allocationsApi.getAllocations);

  const [assignTarget, setAssignTarget] = useState(null);

  const loading = coursesLoading || tutorsLoading || allocLoading;
  const courseList = useMemo(() => courses?.data ?? courses ?? [], [courses]);
  const tutorList = useMemo(() => tutors?.data ?? tutors ?? [], [tutors]);
  const allocationList = useMemo(() => allocations?.data ?? allocations ?? [], [allocations]);

  const rows = useMemo(() => {
    return courseList.map((course) => ({
      course,
      allocations: allocationList.filter((a) => a.courseId === course.id),
    }));
  }, [courseList, allocationList]);

  const unfilledCount = rows.filter((r) => r.allocations.length < (r.course.requiredTutors ?? 1)).length;

  const handleToggleLock = async (allocation) => {
    await allocationsApi.updateAllocation(allocation.id, { isLocked: !allocation.isLocked });
    refetchAllocations();
  };

  const handleRemove = async (allocation) => {
    await allocationsApi.deleteAllocation(allocation.id);
    refetchAllocations();
  };

  if (loading) return <Spinner fullPage label="Loading the allocation board…" />;
  if (coursesError) return <ErrorState title="Couldn't load the board" description={coursesError} />;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-primary">2026 Academic Year</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Allocation Board</h1>
          <p className="mt-2 text-sm text-slate-500">
            Assign tutors to courses while checking marks, availability and weekly hours.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary">
            <Upload className="h-4 w-4" /> Import Timetable
          </Button>
          <Button variant="accent">
            <Sparkles className="h-4 w-4" /> Generate Allocation
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Courses" value={courseList.length} />
        <StatChip label="Available Tutors" value={tutorList.length} />
        <StatChip label="Assigned" value={allocationList.length} />
        <StatChip label="Unfilled" value={unfilledCount} />
      </div>

      <Card padded={false}>
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">Current Allocations</h2>
            <p className="mt-1 text-sm text-slate-400">Review and adjust tutor assignments.</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState className="border-0" title="No courses yet" description="Add a course to start building the board." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-4">Course</th>
                  <th className="px-5 py-4">Tutor(s)</th>
                  <th className="px-5 py-4">Hours</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ course, allocations: courseAllocs }) => {
                  const filled = courseAllocs.length >= (course.requiredTutors ?? 1);
                  return (
                    <tr key={course.id} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{course.code}</p>
                        <p className="mt-1 text-xs text-slate-400">{course.name}</p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {courseAllocs.map((a) => (
                            <div key={a.id} className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary">
                                {getInitials(a.user?.name)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{a.user?.name || a.userId}</p>
                                <p className="text-xs text-slate-400">{formatHours(a.hoursPerWeek)} / week</p>
                              </div>
                              {a.isLocked && <Lock className="h-3.5 w-3.5 text-slate-400" title="Locked" />}
                            </div>
                          ))}

                          <button
                            onClick={() => setAssignTarget(course)}
                            className="rounded-lg border border-dashed border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-subtle"
                          >
                            + Assign tutor
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {courseAllocs.reduce((s, a) => s + Number(a.hoursPerWeek || 0), 0)}h
                      </td>

                      <td className="px-5 py-4">
                        <Badge tone={filled ? 'success' : 'danger'}>{filled ? 'Filled' : 'Needs tutor'}</Badge>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <Link to={`/courses/${course.id}`}>
                            <Button size="sm" variant="ghost">
                              View <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {courseAllocs.map((a) => (
                            <span key={a.id} className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleLock(a)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title={a.isLocked ? 'Unlock' : 'Lock'}
                              >
                                {a.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => handleRemove(a)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AssignTutorModal
        open={Boolean(assignTarget)}
        course={assignTarget}
        tutors={tutorList}
        onClose={() => setAssignTarget(null)}
        onAssigned={refetchAllocations}
      />
    </>
  );
}

export default AllocationBoardPage;
