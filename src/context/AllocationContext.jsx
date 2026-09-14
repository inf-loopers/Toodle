/**
 * @file AllocationContext.jsx
 * @description Shared state container for the Allocation Board.
 *
 * Responsibilities:
 * - Owns the board's data flow: `useApi` fetches courses, tutors and allocations on mount.
 * - Derives per-tutor hour/allocation maps and per-course allocation buckets.
 * - Owns the drag-and-drop layer state (active tutor, hovered course, live validation).
 * - Validation calls during drag are debounced (300ms) to avoid flooding the backend.
 * - Exposes the existing mutation actions (assign modal target, lock/unlock, remove,
 *   refetch) so DnD and the modal/table interactions share one source of truth —
 *   DnD is an additional interaction pattern on top of the same data flow, not a
 *   replacement. Mutation failures are caught and exposed as `mutationError`
 *   (with `clearMutationError`) so the board can surface them as a banner
 *   instead of unhandled promise rejections.
 *
 * Expected Usage:
 * ```jsx
 * <AllocationProvider>
 *   <AllocationBoard />
 * </AllocationProvider>
 * ```
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { tutorsApi } from '../api/tutors';
import { allocationsApi } from '../api/allocations';

/** Default weekly hours for drag-over validation previews and the assign modal. */
export const DEFAULT_HOURS = 2;

/** Debounce window (ms) for drag-over validation calls. */
const VALIDATION_DEBOUNCE_MS = 300;

export const AllocationContext = createContext(null);

/**
 * Read the allocation board state provided by `<AllocationProvider>`.
 * Returns `null` when rendered outside the provider (e.g. in unit tests).
 */
export function useAllocationContext() {
  return useContext(AllocationContext);
}

export function AllocationProvider({ children }) {
  // ── Data flow: useApi fetches on mount ───────────────────────────────
  const {
    data: courses,
    loading: coursesLoading,
    error: coursesError,
  } = useApi(coursesApi.getCourses);
  const { data: tutors, loading: tutorsLoading } = useApi(tutorsApi.getTutors);
  const {
    data: allocations,
    loading: allocLoading,
    refetch: refetchAllocations,
  } = useApi(allocationsApi.getAllocations);

  // ── Shared UI state ──────────────────────────────────────────────────
  /** Course the assign modal targets (with optional `_preselectedTutorId` / `_dropValidation`). */
  const [assignTarget, setAssignTarget] = useState(null);
  const [tutorSearch, setTutorSearch] = useState('');

  // ── Drag-and-drop layer state ────────────────────────────────────────
  const [activeTutor, setActiveTutor] = useState(null);
  const [overCourseId, setOverCourseId] = useState(null);
  const [hoverValidation, setHoverValidation] = useState(null);

  const loading = coursesLoading || tutorsLoading || allocLoading;
  const courseList = useMemo(() => courses?.data ?? courses ?? [], [courses]);
  const tutorList = useMemo(() => tutors?.data ?? tutors ?? [], [tutors]);
  const allocationList = useMemo(() => allocations?.data ?? allocations ?? [], [allocations]);

  // ── Derived maps ─────────────────────────────────────────────────────
  const allocatedHoursMap = useMemo(() => {
    const map = {};
    allocationList.forEach((a) => {
      map[a.userId] = (map[a.userId] || 0) + Number(a.hoursPerWeek || 0);
    });
    return map;
  }, [allocationList]);

  const allocationCountMap = useMemo(() => {
    const map = {};
    allocationList.forEach((a) => {
      map[a.userId] = (map[a.userId] || 0) + 1;
    });
    return map;
  }, [allocationList]);

  const courseAllocMap = useMemo(() => {
    const map = {};
    allocationList.forEach((a) => {
      if (!map[a.courseId]) map[a.courseId] = [];
      map[a.courseId].push(a);
    });
    return map;
  }, [allocationList]);

  const filteredTutors = useMemo(() => {
    const q = tutorSearch.toLowerCase();
    return tutorList.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.studentNumber || '').toLowerCase().includes(q)
    );
  }, [tutorList, tutorSearch]);

  const unfilledCount = useMemo(
    () =>
      courseList.filter((c) => (courseAllocMap[c.id]?.length ?? 0) < (c.requiredTutors ?? 1))
        .length,
    [courseList, courseAllocMap]
  );

  // ── Existing mutations (shared by DnD, modal and table) ──────────────
  const refetchAll = useCallback(() => {
    refetchAllocations();
  }, [refetchAllocations]);

  /** Last mutation failure (lock/unlock/remove), surfaced as a board banner. */
  const [mutationError, setMutationError] = useState(null);

  /** Pull the human-readable message out of an axios/API error. */
  const extractApiError = (err, fallback) =>
    err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;

  const clearMutationError = useCallback(() => setMutationError(null), []);

  const toggleLock = useCallback(
    async (allocation) => {
      try {
        setMutationError(null);
        await allocationsApi.updateAllocation(allocation.id, {
          isLocked: !allocation.isLocked,
        });
        refetchAllocations();
      } catch (err) {
        setMutationError(extractApiError(err, 'Could not update the allocation.'));
      }
    },
    [refetchAllocations]
  );

  const removeAllocation = useCallback(
    async (allocation) => {
      try {
        setMutationError(null);
        await allocationsApi.deleteAllocation(allocation.id);
        refetchAllocations();
      } catch (err) {
        setMutationError(extractApiError(err, 'Could not remove the allocation.'));
      }
    },
    [refetchAllocations]
  );

  // ── Assign modal control ─────────────────────────────────────────────
  /** Open the assign modal for a course, optionally pre-filled from a drag drop. */
  const openAssignModal = useCallback((course, tutorId = null, dropValidation = null) => {
    setAssignTarget({
      ...course,
      ...(tutorId ? { _preselectedTutorId: tutorId } : {}),
      ...(dropValidation ? { _dropValidation: dropValidation } : {}),
    });
  }, []);

  const closeAssignModal = useCallback(() => setAssignTarget(null), []);

  // ── Drag-and-drop layer actions ──────────────────────────────────────
  const startDragTutor = useCallback((tutor) => {
    setActiveTutor(tutor);
  }, []);

  const dragOverCourse = useCallback((courseId) => {
    setOverCourseId(courseId);
  }, []);

  const cancelDrag = useCallback(() => {
    setActiveTutor(null);
    setOverCourseId(null);
  }, []);

  /** Resolve a drop (tutor → course) into an assign modal target. */
  const dropOnCourse = useCallback(
    (tutor, course) => {
      const dropValidation =
        hoverValidation && hoverValidation.courseId === course.id ? hoverValidation : null;
      openAssignModal(course, tutor.id, dropValidation);
    },
    [hoverValidation, openAssignModal]
  );

  // ── Live drag-over validation (debounced 300ms) ──────────────────────
  // Calls GET /allocations/validate while a dragged tutor hovers a column
  // and maps the result to a drop-zone status:
  // 'valid' (green) | 'warning' (amber) | 'error' (red).
  useEffect(() => {
    if (!activeTutor || !overCourseId) {
      setHoverValidation(null);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      allocationsApi
        .validateAllocation({
          userId: activeTutor.id,
          courseId: overCourseId,
          hoursPerWeek: DEFAULT_HOURS,
        })
        .then((res) => {
          if (cancelled) return;
          const result = res?.data ?? res;
          const warnings = result?.warnings ?? [];
          const hasError =
            result?.isValid === false || warnings.some((w) => w.severity === 'error');
          setHoverValidation({
            courseId: overCourseId,
            status: hasError ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
            warnings,
            remainingHours: result?.remainingHours ?? null,
          });
        })
        .catch(() => {
          if (cancelled) return;
          setHoverValidation({
            courseId: overCourseId,
            status: 'warning',
            warnings: [
              {
                severity: 'warning',
                message: "Couldn't reach the validation service — check after dropping.",
              },
            ],
            remainingHours: null,
          });
        });
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeTutor, overCourseId]);

  const value = useMemo(
    () => ({
      // Data
      courseList,
      tutorList,
      allocationList,
      loading,
      coursesError,
      // Derived
      allocatedHoursMap,
      allocationCountMap,
      courseAllocMap,
      filteredTutors,
      unfilledCount,
      // Search
      tutorSearch,
      setTutorSearch,
      // Assign modal
      assignTarget,
      openAssignModal,
      closeAssignModal,
      // Mutations
      refetchAll,
      toggleLock,
      removeAllocation,
      mutationError,
      clearMutationError,
      // DnD layer
      activeTutor,
      startDragTutor,
      dragOverCourse,
      dropOnCourse,
      cancelDrag,
      hoverValidation,
    }),
    [
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
    ]
  );

  return <AllocationContext.Provider value={value}>{children}</AllocationContext.Provider>;
}

export default AllocationContext;
