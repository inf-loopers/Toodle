/**
 * @file AllocationBoardPage.jsx
 * @description Core Sprint 1 Feature — Organiser's Interactive Course Allocation Board.
 *
 * Responsibilities:
 * - Kanban-style board: left panel (draggable tutor pool) + main area (droppable course columns).
 * - System integration: shared state lives in `AllocationContext`
 *   (src/context/AllocationContext.jsx) — `useApi` fetches tutors and courses on
 *   mount inside the provider; this page is a presentation + DnD wiring layer on
 *   top of that existing data flow.
 * - Drag-and-drop assignment flow via @dnd-kit/core (useDraggable / useDroppable).
 * - Tutor cards show name, remaining weekly hours (visual meter), allocation count.
 * - Course columns show code, name, staffing status, min mark, and assigned tutor cards.
 * - Live drag-over constraint validation via `GET /allocations/validate`
 *   (debounced 300ms in the context to avoid flooding the backend):
 *   drop zones glow green (valid), amber (warnings) or red (errors) with an
 *   inline banner listing the constraint messages while hovering.
 * - On drop, the assign modal opens pre-filled with tutor + course and shows
 *   full constraint details (errors vs warnings, override reason input).
 * - The existing assign modal, lock/unlock, and delete functionality remains —
 *   DnD is an additional interaction pattern, not a replacement.
 * - Responsive & accessible: drag affordances are hidden on mobile (< lg
 *   breakpoint, see `useIsMobile`) where the board degrades to a modal-only
 *   flow (tap tutor card / "+ Assign tutor"), and a KeyboardSensor enables
 *   keyboard-driven dragging on desktop (Space/Enter, arrows, Esc).
 *
 * Role: Organiser Only
 * Endpoint Connections: `GET /allocations`, `POST /allocations`, `DELETE /allocations/:id`, `GET /allocations/validate`
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Upload,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  Search,
  Clock,
  Users,
  GripVertical,
  GraduationCap,
  UserCheck,
  CheckCircle2,
  Loader2,
  XCircle,
  X,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { allocationsApi } from '../api/allocations';
import {
  AllocationProvider,
  useAllocationContext,
  DEFAULT_HOURS,
} from '../context/AllocationContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { getInitials, formatHours } from '../utils/helpers';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input, Textarea } from '../components/ui/Input';
import { ErrorState, EmptyState } from '../components/ui/EmptyState';

// ── Stat Chip ──────────────────────────────────────────────────────────

function StatChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ── Assign Tutor Modal ─────────────────────────────────────────────────

function AssignTutorModal({
  open,
  onClose,
  course,
  tutors,
  initialTutorId,
  initialValidation,
  onAssigned,
}) {
  const [tutorId, setTutorId] = useState('');
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [reason, setReason] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setTutorId(initialTutorId || '');
      setHours(DEFAULT_HOURS);
      setReason('');
      // Seed with the drag-over validation result so feedback is instant;
      // the effect below re-checks against the live hours value.
      setWarnings(initialValidation?.warnings ?? []);
      setSubmitError('');
    }
  }, [open, initialTutorId, initialValidation]);

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

  // Split constraint feedback by severity: errors block, warnings allow override
  const constraintErrors = warnings.filter((w) => w.severity === 'error');
  const constraintWarnings = warnings.filter((w) => w.severity !== 'error');

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
      // Backend error responses use the `error` key ({ success: false, error })
      setSubmitError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not create the allocation.'
      );
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
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
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

        {checking && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking marks, timetable &amp; hours…
          </p>
        )}

        {!checking && tutorId && warnings.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>All constraints passed — no conflicts detected.</span>
          </div>
        )}

        {constraintErrors.length > 0 && (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            {constraintErrors.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-medium text-rose-700">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w.message || w}</span>
              </div>
            ))}
          </div>
        )}

        {constraintWarnings.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            {constraintWarnings.map((w, i) => (
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

// ── Draggable Tutor Card (Left Panel) ──────────────────────────────────

/**
 * Tutor card for the left panel. Desktop (`dragEnabled`): draggable via
 * `useDraggable`, whole header acts as the drag handle. Mobile: drag is
 * disabled and the card degrades to a tap-to-assign action so the flow
 * remains usable without drag-and-drop.
 */
function DraggableTutorCard({
  tutor,
  usedHours,
  allocationCount,
  dragEnabled = true,
  onAssignTap,
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tutor-${tutor.id}`,
    data: { type: 'tutor', tutor },
    disabled: !dragEnabled,
  });

  const maxHours = tutor.maxHoursPerWeek ?? 10;
  const remaining = Math.max(0, maxHours - usedHours);
  const capacityPct = Math.min(100, Math.round((usedHours / maxHours) * 100));
  const isAtCapacity = remaining <= 0;

  const style = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    // Required for pointer dragging on touch-capable devices; skipped on
    // mobile so the pool list keeps its native touch scrolling.
    ...(dragEnabled ? { touchAction: 'none' } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border bg-white p-3 shadow-sm transition-all ${
        isDragging
          ? 'cursor-grabbing border-primary/50 shadow-lg ring-2 ring-primary/20 opacity-40'
          : dragEnabled
            ? 'border-slate-200 hover:border-primary/30 hover:shadow-md cursor-grab'
            : 'border-slate-200 hover:border-primary/30 hover:shadow-md'
      }`}
    >
      {/* Drag handle + header */}
      <div
        className="flex items-start gap-2"
        {...(dragEnabled ? { ...listeners, ...attributes } : {})}
      >
        {dragEnabled && (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {tutor.name || tutor.email}
          </p>
          <p className="truncate text-xs text-slate-400">{tutor.email}</p>
        </div>
        <Badge
          tone={isAtCapacity ? 'danger' : remaining <= 2 ? 'warning' : 'success'}
          className="shrink-0"
        >
          {isAtCapacity ? 'Full' : `${remaining}h left`}
        </Badge>
      </div>

      {/* Hours meter */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {usedHours}h / {maxHours}h
          </span>
          <span>{capacityPct}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              capacityPct >= 100
                ? 'bg-rose-400'
                : capacityPct >= 75
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
            }`}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      {/* Footer: allocation count + interaction affordance */}
      <div className="mt-2.5 flex items-center justify-between">
        <Badge tone="neutral" className="text-[10px]">
          <UserCheck className="h-2.5 w-2.5" /> {allocationCount} allocation
          {allocationCount !== 1 ? 's' : ''}
        </Badge>
        {dragEnabled && <span className="text-[10px] text-slate-400">Drag to assign</span>}
      </div>

      {/* Mobile fallback: tap-to-assign opens the modal (DnD hidden) */}
      {!dragEnabled && (
        <button
          onClick={() => onAssignTap?.(tutor)}
          disabled={isAtCapacity}
          className="mt-2.5 w-full rounded-lg bg-primary-subtle px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Assign to course
        </button>
      )}
    </div>
  );
}

// ── Drag Overlay (ghost preview while dragging) ────────────────────────

function DragOverlayCard({ tutor, usedHours }) {
  const maxHours = tutor.maxHoursPerWeek ?? 10;
  const remaining = Math.max(0, maxHours - usedHours);

  return (
    <div className="w-[260px] rounded-xl border-2 border-primary bg-white p-3 shadow-2xl ring-4 ring-primary/10">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
          {getInitials(tutor.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {tutor.name || tutor.email}
          </p>
          <p className="text-xs text-slate-400">{remaining}h remaining</p>
        </div>
      </div>
    </div>
  );
}

// ── Assigned Tutor Card (inside a course column) ───────────────────────

function AssignedTutorCard({ allocation, onToggleLock, onRemove }) {
  const user = allocation.user;
  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-2.5 transition-colors hover:border-slate-300">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[10px] font-bold text-primary">
          {getInitials(user?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {user?.name || allocation.userId}
          </p>
          <p className="text-[10px] text-slate-400">{formatHours(allocation.hoursPerWeek)}/wk</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onToggleLock(allocation)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title={allocation.isLocked ? 'Unlock' : 'Lock'}
          >
            {allocation.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
          <button
            onClick={() => onRemove(allocation)}
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            title="Remove"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Course Column (droppable) ──────────────────────────────────────────

function CourseColumn({
  course,
  allocations,
  validation,
  dndEnabled = true,
  onToggleLock,
  onRemove,
  onAssignClick,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `course-${course.id}`,
    data: { type: 'course', course },
  });

  const required = course.requiredTutors ?? 1;
  const assigned = allocations.length;
  const isFull = assigned >= required;

  // Live drag-over feedback: green = valid, amber = warnings, red = errors
  const status = validation?.status;
  let dropZoneClass = 'border-slate-200 bg-white';
  if (isOver) {
    if (status === 'error') {
      dropZoneClass = 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100';
    } else if (status === 'warning') {
      dropZoneClass = 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-100';
    } else if (status === 'valid') {
      dropZoneClass = 'border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-100';
    } else {
      dropZoneClass = 'border-primary bg-primary-subtle/30';
    }
  }

  const bannerTone =
    status === 'error'
      ? 'border-rose-200 bg-rose-50/70'
      : status === 'warning'
        ? 'border-amber-200 bg-amber-50/70'
        : 'border-emerald-200 bg-emerald-50/70';

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[260px] flex-1 flex-col rounded-2xl border-2 transition-colors ${dropZoneClass}`}
    >
      {/* Column header */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-slate-900">{course.code}</p>
            <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{course.name}</p>
          </div>
          <Badge tone={isFull ? 'success' : 'warning'} dot className="shrink-0">
            {assigned}/{required}
          </Badge>
        </div>

        {/* Min mark + status */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" className="text-[10px]">
            <GraduationCap className="h-2.5 w-2.5" /> Min {course.minMarkRequired ?? 50}%
          </Badge>
          <Badge tone={isFull ? 'success' : 'danger'} className="text-[10px]">
            {isFull ? 'Staffed' : 'Needs tutor'}
          </Badge>
        </div>
      </div>

      {/* Live constraint feedback while a tutor is dragged over this column */}
      {isOver && (
        <div className="border-b border-slate-100 px-4 py-3">
          {status == null ? (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking constraints…
            </p>
          ) : status === 'valid' ? (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-emerald-700 ${bannerTone}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                Valid assignment
                {validation?.remainingHours != null && ` · ${validation.remainingHours}h remaining`}
              </span>
            </div>
          ) : (
            <div className={`space-y-1.5 rounded-lg border px-3 py-2 ${bannerTone}`}>
              {validation.warnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-1.5 text-[11px] ${
                    w.severity === 'error' ? 'font-medium text-rose-700' : 'text-amber-700'
                  }`}
                >
                  {w.severity === 'error' ? (
                    <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  )}
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assigned tutors */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Users className="h-4 w-4 text-slate-300" />
            </div>
            <p className="text-xs text-slate-400">
              {dndEnabled ? 'Drop a tutor here' : 'No tutors assigned yet'}
            </p>
          </div>
        ) : (
          allocations.map((a) => (
            <AssignedTutorCard
              key={a.id}
              allocation={a}
              onToggleLock={onToggleLock}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {/* Manual assign button */}
      <div className="border-t border-slate-100 p-3">
        <button
          onClick={() => onAssignClick(course)}
          className="w-full rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary-subtle"
        >
          + Assign tutor
        </button>
      </div>
    </div>
  );
}

// ── Main Page Export ───────────────────────────────────────────────────

/**
 * Inner board component. All shared state comes from `AllocationContext`:
 * `useApi` fetches tutors/courses/allocations on mount inside the provider,
 * and the DnD layer (DndContext wiring + sensors below) sits on top of that
 * existing data flow. The assign modal, lock/unlock and delete functionality
 * is unchanged — DnD is an additional interaction pattern, not a replacement.
 *
 * Responsive behaviour: drag-and-drop is desktop-only (≥ lg breakpoint). On
 * mobile the drag affordances are hidden and the board degrades to a
 * modal-only flow — tap "Assign to course" on a tutor card or "+ Assign tutor"
 * on a course column, both of which open the same assign modal.
 */
function AllocationBoard() {
  const {
    courseList,
    tutorList,
    allocationList,
    loading,
    coursesError,
    allocatedHoursMap,
    allocationCountMap,
    courseAllocMap,
    filteredTutors,
    unfilledCount,
    tutorSearch,
    setTutorSearch,
    assignTarget,
    openAssignModal,
    closeAssignModal,
    refetchAll,
    toggleLock,
    removeAllocation,
    mutationError,
    clearMutationError,
    activeTutor,
    startDragTutor,
    dragOverCourse,
    dropOnCourse,
    cancelDrag,
    hoverValidation,
  } = useAllocationContext();

  // Drag-and-drop is enabled on desktop only; mobile gets the modal-only flow.
  const isMobile = useIsMobile();
  const dndEnabled = !isMobile;

  // DnD sensors — pointer for mouse/touch/pen, keyboard for accessibility
  // (Space/Enter to pick up, arrows to move, Space/Enter to drop, Esc to cancel).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ── Mobile fallback: tap-to-assign from the pool ──────────────────────
  // Opens the modal for the first unfilled course (falls back to the first
  // course) with the tapped tutor pre-selected.
  const handleAssignTap = useCallback(
    (tutor) => {
      const target =
        courseList.find((c) => (courseAllocMap[c.id]?.length ?? 0) < (c.requiredTutors ?? 1)) ??
        courseList[0];
      if (target) openAssignModal(target, tutor.id);
    },
    [courseList, courseAllocMap, openAssignModal]
  );

  // ── DnD wiring (delegates to context actions) ────────────────────────
  const handleDragStart = useCallback(
    (event) => {
      const tutor = event.active.data.current?.tutor;
      if (tutor) startDragTutor(tutor);
    },
    [startDragTutor]
  );

  const handleDragOver = useCallback(
    (event) => {
      const courseData = event.over?.data.current;
      dragOverCourse(courseData?.type === 'course' ? courseData.course.id : null);
    },
    [dragOverCourse]
  );

  const handleDragEnd = useCallback(
    (event) => {
      const tutor = event.active.data.current?.tutor;
      const course = event.over?.data.current?.course;
      cancelDrag();
      if (tutor && course) dropOnCourse(tutor, course);
    },
    [cancelDrag, dropOnCourse]
  );

  const handleDragCancel = useCallback(() => cancelDrag(), [cancelDrag]);

  if (loading) return <Spinner fullPage label="Loading the allocation board…" />;
  if (coursesError)
    return <ErrorState title="Couldn't load the board" description={coursesError} />;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-primary">2026 Academic Year</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Allocation Board
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {dndEnabled
              ? 'Drag tutors from the pool and drop them onto course columns to assign.'
              : 'Tap a tutor or a course column to assign tutors to courses.'}
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

      {/* Mutation error banner (lock/unlock/remove failures) */}
      {mutationError && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Action failed</p>
              <p className="mt-0.5 text-sm text-rose-700">{mutationError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearMutationError}
            aria-label="Dismiss error"
            className="rounded-lg p-1 text-rose-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stat chips */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Courses" value={courseList.length} />
        <StatChip label="Available Tutors" value={tutorList.length} />
        <StatChip label="Assigned" value={allocationList.length} />
        <StatChip label="Unfilled" value={unfilledCount} />
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-col gap-6 lg:flex-row" style={{ minHeight: '600px' }}>
          {/* ── Left Panel: Tutor Pool ── */}
          <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[320px] lg:min-w-[280px]">
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-slate-900">Tutor Pool</h2>
                </div>
                <Badge tone="primary">{filteredTutors.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {dndEnabled
                  ? 'Drag a tutor onto a course column.'
                  : 'Tap a tutor’s Assign button to get started.'}
              </p>

              <div className="mt-3 flex items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                <Search className="mr-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={tutorSearch}
                  onChange={(e) => setTutorSearch(e.target.value)}
                  placeholder="Search tutors…"
                  className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {filteredTutors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Users className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No tutors found</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {tutorSearch
                      ? 'Try a different search term.'
                      : 'Tutors will appear here once registered.'}
                  </p>
                </div>
              ) : (
                filteredTutors.map((tutor) => (
                  <DraggableTutorCard
                    key={tutor.id}
                    tutor={tutor}
                    usedHours={allocatedHoursMap[tutor.id] || 0}
                    allocationCount={allocationCountMap[tutor.id] || 0}
                    dragEnabled={dndEnabled}
                    onAssignTap={handleAssignTap}
                  />
                ))
              )}
            </div>
          </aside>

          {/* ── Main Area: Course Columns ── */}
          <div className="min-w-0 flex-1">
            {courseList.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No courses yet"
                description="Add a course to start building the board."
              />
            ) : (
              <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {courseList.map((course) => (
                  <CourseColumn
                    key={course.id}
                    course={course}
                    allocations={courseAllocMap[course.id] ?? []}
                    validation={hoverValidation?.courseId === course.id ? hoverValidation : null}
                    dndEnabled={dndEnabled}
                    onToggleLock={toggleLock}
                    onRemove={removeAllocation}
                    onAssignClick={(course) => openAssignModal(course)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeTutor && (
            <DragOverlayCard
              tutor={activeTutor}
              usedHours={allocatedHoursMap[activeTutor.id] || 0}
            />
          )}
        </DragOverlay>
      </DndContext>

      <AssignTutorModal
        open={Boolean(assignTarget)}
        course={assignTarget}
        tutors={tutorList}
        initialTutorId={assignTarget?._preselectedTutorId}
        initialValidation={assignTarget?._dropValidation}
        onClose={closeAssignModal}
        onAssigned={refetchAll}
      />
    </>
  );
}

/**
 * Route entry point — mounts the shared-state provider around the board so
 * every child (pool, columns, modal, DnD layer) reads one source of truth.
 */
export function AllocationBoardPage() {
  return (
    <AllocationProvider>
      <AllocationBoard />
    </AllocationProvider>
  );
}

export default AllocationBoardPage;
