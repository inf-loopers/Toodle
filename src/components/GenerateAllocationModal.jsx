/**
 * @file GenerateAllocationModal.jsx
 * @description Modal for the Allocation Engine flow (C01 tutor ranking & bulk allocation).
 *
 * Two tabs:
 *   "Generate" — run the engine, review the ranked preview, save a draft or commit.
 *   "Drafts"   — list saved plans, reopen one in the same review UI, delete it.
 *
 * Generate state machine:
 *   idle → generating → review → saving | committing → done
 *
 * Review panel:
 *   - Proposed allocations grouped by course; each row shows its 1-based rank,
 *     editable weekly hours and a "Why?" popover listing the engine's reasons[].
 *   - A per-course "Ranked candidates" disclosure listing every eligible tutor in
 *     rank order plus the excluded ones with their blocking reasons, so a
 *     reviewer sees who was considered and why they were not chosen.
 *   - Unmatched courses/tutors panel showing the specific reason from the API.
 *   - A "Revalidate" affordance: the preview is a snapshot, and committing
 *     re-checks every constraint server-side, so anything that went stale is
 *     reported as skipped rather than applied.
 *
 * Actions:
 *   "Save Draft"      — persists the plan without creating live allocations.
 *   "Commit Selected" — converts checked rows to live allocations. Edited hours
 *                       travel as `hoursOverrides` so they are not silently
 *                       replaced by the hours stored on the entry. A throwaway
 *                       draft created only to carry a direct commit is deleted
 *                       again once the commit succeeds.
 */

import { useState, useCallback, useMemo, useEffect, useId } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  Clock,
  GraduationCap,
  Save,
  Zap,
  Trash2,
  FolderOpen,
  RefreshCw,
  Ban,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { allocationEngineApi } from '../api/allocationEngine';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/helpers';

/** Pull the server message out of an Axios error, falling back to a default. */
const errorMessage = (err, fallback) => err?.response?.data?.error || err?.message || fallback;

/** A generated row: no server entry id yet, keyed by the tutor/course pair. */
const engineRow = (p) => ({ ...p, id: `${p.tutorId}-${p.courseId}`, entryId: null });

/** A row loaded from a persisted draft: the entry id is the commit handle. */
const draftRow = (entry) => ({
  id: entry.id,
  entryId: entry.id,
  tutorId: entry.userId,
  tutorName: entry.user?.name ?? null,
  tutorEmail: entry.user?.email ?? null,
  courseId: entry.courseId,
  courseCode: entry.course?.code ?? '',
  courseName: entry.course?.name ?? '',
  hoursPerWeek: entry.hoursPerWeek,
  rank: entry.explanation?.rank ?? null,
  explanation: entry.explanation ?? null,
});

// ── Explanation Badge ────────────────────────────────────────────────────────

/**
 * "Why?" popover for one ranking decision.
 *
 * Renders the engine's human-readable `reasons[]` when present (C01 requires an
 * understandable reason per suggestion) and keeps the numeric fields underneath
 * so the compact badge stays informative without the popover.
 */
function ExplanationBadge({ explanation }) {
  const [open, setOpen] = useState(false);
  if (!explanation) return null;

  const {
    mark,
    markStatus,
    minMarkRequired,
    meetsMinMark,
    sessionsCovered,
    sessionsTotal,
    remainingHours,
    rank,
    eligibleCount,
    reasons,
  } = explanation;

  const markLabel =
    mark != null ? (meetsMinMark ? `${mark}% ✓` : `${mark}% (min ${minMarkRequired}%)`) : 'No mark';

  const availLabel =
    sessionsTotal === 0
      ? 'No sessions'
      : sessionsCovered === sessionsTotal
        ? `${sessionsTotal}/${sessionsTotal} sessions`
        : `${sessionsCovered}/${sessionsTotal} sessions`;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
      >
        <span>Why?</span>
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-20 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Match explanation
          </p>
          {rank != null && (
            <p className="mb-2 text-xs font-semibold text-primary">
              Rank #{rank}
              {eligibleCount != null ? ` of ${eligibleCount} eligible` : ''}
            </p>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <GraduationCap className="h-3 w-3 shrink-0 text-slate-400" />
              <span className={meetsMinMark ? 'text-emerald-700' : 'text-amber-700'}>
                Mark: {markLabel}
                {markStatus && markStatus !== 'VERIFIED' ? ` (${markStatus})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="h-3 w-3 shrink-0 text-slate-400" />
              <span
                className={
                  sessionsCovered === sessionsTotal ? 'text-emerald-700' : 'text-amber-700'
                }
              >
                Availability: {availLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3 w-3 shrink-0 text-slate-400" />
              <span className={remainingHours >= 2 ? 'text-emerald-700' : 'text-amber-700'}>
                Hours: {remainingHours}h remaining
              </span>
            </div>
          </div>
          {reasons?.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5 text-xs text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Proposed Entry Row ───────────────────────────────────────────────────────

function EntryRow({ entry, selected, onToggle, onHoursChange }) {
  const who = entry.tutorName || entry.tutorEmail || 'Tutor';
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3',
        selected ? 'border-primary/40' : 'border-slate-100 hover:border-slate-200'
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${who} for ${entry.courseCode}`}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {entry.rank != null && (
              <Badge tone="gold" className="px-2 py-0.5 text-[10px]">
                #{entry.rank}
              </Badge>
            )}
            <span className="text-sm font-semibold text-slate-800">{who}</span>
            <Badge tone="primary" className="text-[10px]">
              {entry.courseCode}
            </Badge>
            <span className="text-xs text-slate-400">{entry.courseName}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">h/wk:</span>
              <input
                type="number"
                min={1}
                max={40}
                value={entry.hoursPerWeek}
                aria-label={`Weekly hours for ${who} on ${entry.courseCode}`}
                onChange={(e) => onHoursChange(Number(e.target.value))}
                className="w-16 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <ExplanationBadge explanation={entry.explanation} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ranked candidates disclosure ─────────────────────────────────────────────

/**
 * Per-course candidate list from `plan.candidates[]`: the eligible tutors in
 * rank order (mark, proposed flag, "Why?") and the excluded ones with the exact
 * blocking messages. This is what satisfies "explain why each tutor is ranked
 * or excluded" without a second endpoint.
 */
function RankedCandidates({ group }) {
  const ranked = group.ranked ?? [];
  const excluded = group.excluded ?? [];

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <Badge tone="neutral" className="px-2 py-0.5 text-[10px]">
          {group.vacancies ?? 0} vacant
        </Badge>
        <span>
          {group.activeAllocations ?? 0} of {group.requiredTutors ?? 0} filled
        </span>
      </div>

      {ranked.length > 0 && (
        <>
          <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Eligible, best first
          </p>
          <ul className="mt-1 space-y-1.5">
            {ranked.map((candidate) => (
              <li
                key={candidate.id}
                className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2 py-1.5"
              >
                <span className="w-8 shrink-0 text-xs font-bold text-primary">
                  #{candidate.rank}
                </span>
                <span className="text-xs font-medium text-slate-800">
                  {candidate.name || candidate.email}
                </span>
                <Badge
                  tone={candidate.mark != null ? 'success' : 'neutral'}
                  className="px-2 py-0.5 text-[10px]"
                >
                  {candidate.mark != null ? `${candidate.mark}%` : 'No mark'}
                </Badge>
                {candidate.proposed && (
                  <Badge tone="primary" className="px-2 py-0.5 text-[10px]">
                    Proposed
                  </Badge>
                )}
                <ExplanationBadge explanation={candidate.explanation} />
              </li>
            ))}
          </ul>
        </>
      )}

      {excluded.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Excluded
          </p>
          <ul className="mt-1 space-y-1.5">
            {excluded.map((candidate) => (
              <li key={candidate.id} className="rounded-md bg-white px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Ban className="h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-xs font-medium text-slate-700">
                    {candidate.name || candidate.email}
                  </span>
                </div>
                <ul className="mt-1 space-y-0.5 pl-5">
                  {(candidate.reasons ?? []).map((reason) => (
                    <li key={reason} className="text-[11px] text-amber-700">
                      {reason}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Course Group ─────────────────────────────────────────────────────────────

function CourseGroup({ group, selectedIds, onToggleEntry, onHoursChange }) {
  const [expanded, setExpanded] = useState(false);
  const { courseCode, courseName, entries, candidate } = group;
  const keys = entries.map((e) => e.id);
  const allSelected = keys.length > 0 && keys.every((key) => selectedIds.has(key));
  const someSelected = keys.some((key) => selectedIds.has(key));
  const candidateCount = (candidate?.ranked?.length ?? 0) + (candidate?.excluded?.length ?? 0);

  const toggleAll = () => {
    keys.forEach((key) => onToggleEntry(key, !allSelected));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {keys.length > 0 && (
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
            onChange={toggleAll}
            aria-label={`Select all ${courseCode} proposals`}
            className="h-4 w-4 rounded border-slate-300 text-primary"
          />
        )}
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-semibold text-slate-800">{courseCode}</span>
        <span className="text-xs text-slate-500">{courseName}</span>
        {keys.length > 0 ? (
          <Badge tone="neutral" className="text-[10px]">
            {keys.length} proposed
          </Badge>
        ) : (
          <Badge tone="warning" className="text-[10px]">
            Nothing proposed
          </Badge>
        )}
        {candidateCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Ranked candidates — {courseCode}
          </button>
        )}
      </div>

      {expanded && candidate && <RankedCandidates group={candidate} />}

      {keys.length > 0 && (
        <div className="ml-0 space-y-1.5 sm:ml-6">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              selected={selectedIds.has(entry.id)}
              onToggle={() => onToggleEntry(entry.id, !selectedIds.has(entry.id))}
              onHoursChange={(hours) => onHoursChange(entry.id, hours)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Unmatched Panel ──────────────────────────────────────────────────────────

function UnmatchedPanel({ unmatched }) {
  const [open, setOpen] = useState(false);
  const total = (unmatched?.courses?.length ?? 0) + (unmatched?.tutors?.length ?? 0);
  if (total === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="text-sm font-semibold text-amber-800">
            {total} unmatched item{total !== 1 ? 's' : ''}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-amber-500" />
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-amber-200 px-4 pb-4 pt-3">
          {unmatched.courses?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-amber-700">Unfilled courses</p>
              {unmatched.courses.map((c) => (
                <div key={c.id} className="flex items-start gap-2 py-1 text-xs text-amber-800">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>
                    <strong>{c.code}</strong> — {c.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
          {unmatched.tutors?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-amber-700">Unplaced tutors</p>
              {unmatched.tutors.map((t) => (
                <div key={t.id} className="flex items-start gap-2 py-1 text-xs text-amber-800">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>
                    <strong>{t.name || t.email}</strong> — {t.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Drafts tab ───────────────────────────────────────────────────────────────

function DraftsPanel({
  drafts,
  loading,
  error,
  openingId,
  deletingId,
  canDelete,
  onOpen,
  onDelete,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading drafts…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onRetry} className="text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {drafts.length === 0 && !error && (
        <div className="flex flex-col items-center py-10 text-center">
          <FolderOpen className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No saved drafts</p>
          <p className="mt-1 max-w-xs text-xs text-slate-400">
            Run the engine and choose “Save Draft” to park a plan here. Drafts are re-checked when
            you commit them, so a stale suggestion can never be applied silently.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {drafts.map((draft) => {
          const entries = draft._count?.draftAllocationEntries ?? 0;
          return (
            <li
              key={draft.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-white p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{draft.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {entries} entr{entries === 1 ? 'y' : 'ies'}
                  {draft.createdBy?.name ? ` · by ${draft.createdBy.name}` : ''}
                  {draft.createdAt ? ` · ${new Date(draft.createdAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpen(draft.id)}
                  loading={openingId === draft.id}
                  disabled={Boolean(openingId) || Boolean(deletingId)}
                  className="flex-1 sm:flex-none"
                >
                  Open
                </Button>
                {canDelete(draft) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(draft.id)}
                    loading={deletingId === draft.id}
                    disabled={Boolean(openingId) || Boolean(deletingId)}
                    aria-label={`Delete draft ${draft.name}`}
                    className="flex-1 sm:flex-none"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sm:hidden">Delete</span>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

/**
 * Modal for the Allocation Engine flow.
 *
 * @param {{ open: boolean, onClose: () => void, onCommitted: () => void }} props
 */
export default function GenerateAllocationModal({ open, onClose, onCommitted }) {
  const { dbUser, isAdmin } = useAuth();
  const tabIdBase = useId();

  // phase: 'idle' | 'generating' | 'review' | 'saving' | 'committing' | 'done'
  const [tab, setTab] = useState('generate');
  const [phase, setPhase] = useState('idle');
  const [proposed, setProposed] = useState([]); // rows with editable hoursPerWeek
  const [candidates, setCandidates] = useState([]);
  const [unmatched, setUnmatched] = useState({ tutors: [], courses: [] });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState('');
  const [commitResult, setCommitResult] = useState(null);
  const [savedName, setSavedName] = useState('');
  // Set while reviewing a persisted draft; null for a fresh engine preview.
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [activeDraftName, setActiveDraftName] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState('');
  const [openingId, setOpeningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Reset when the modal opens.
  useEffect(() => {
    if (open) {
      setTab('generate');
      setPhase('idle');
      setProposed([]);
      setCandidates([]);
      setUnmatched({ tutors: [], courses: [] });
      setSelectedIds(new Set());
      setDraftName('');
      setError('');
      setCommitResult(null);
      setSavedName('');
      setActiveDraftId(null);
      setActiveDraftName('');
    }
  }, [open]);

  // A lecturer may only delete their own drafts; an admin may delete any.
  const canDelete = useCallback(
    (draft) => isAdmin || draft.createdById === dbUser?.id,
    [isAdmin, dbUser]
  );

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftsError('');
    try {
      const res = await allocationEngineApi.getDrafts();
      setDrafts(res?.data ?? res ?? []);
    } catch (err) {
      setDraftsError(errorMessage(err, 'Could not load drafts.'));
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === 'drafts') loadDrafts();
  }, [open, tab, loadDrafts]);

  // Run (or re-run) the engine. Clears any draft context: the preview is a
  // fresh snapshot of the current database state.
  const runEngine = useCallback(async () => {
    setPhase('generating');
    setError('');
    setActiveDraftId(null);
    setActiveDraftName('');
    setCommitResult(null);
    try {
      const res = await allocationEngineApi.generate();
      const plan = res?.data ?? res;
      const entries = (plan.proposed ?? []).map(engineRow);
      setProposed(entries);
      setCandidates(plan.candidates ?? []);
      setUnmatched(plan.unmatched ?? { tutors: [], courses: [] });
      setSelectedIds(new Set(entries.map((e) => e.id)));
      setPhase('review');
    } catch (err) {
      setError(errorMessage(err, 'Engine failed — please try again.'));
      setPhase('idle');
    }
  }, []);

  // Open a persisted draft in the same review UI.
  const openDraft = useCallback(async (id) => {
    setOpeningId(id);
    setError('');
    try {
      const res = await allocationEngineApi.getDraft(id);
      const draft = res?.data ?? res;
      const rows = (draft.draftAllocationEntries ?? []).map(draftRow);
      setActiveDraftId(draft.id);
      setActiveDraftName(draft.name ?? '');
      setDraftName(draft.name ?? '');
      setProposed(rows);
      setCandidates([]);
      setUnmatched({ tutors: [], courses: [] });
      setSelectedIds(new Set(rows.map((row) => row.id)));
      setCommitResult(null);
      setSavedName('');
      setTab('generate');
      // An empty draft still opens in review so the reviewer can see it and go back.
      setPhase('review');
    } catch (err) {
      setError(errorMessage(err, 'Could not open the draft.'));
    } finally {
      setOpeningId(null);
    }
  }, []);

  const removeDraft = useCallback(async (id) => {
    setDeletingId(id);
    setDraftsError('');
    try {
      await allocationEngineApi.deleteDraft(id);
      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch (err) {
      setDraftsError(errorMessage(err, 'Could not delete the draft.'));
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Merge the proposals and the per-course candidate lists into one group per
  // course, so a course with nothing proposed still explains who was excluded.
  const courseGroups = useMemo(() => {
    const byCourse = new Map();
    const ensure = (courseId, courseCode, courseName) => {
      const key = courseId ?? courseCode;
      if (!byCourse.has(key)) {
        byCourse.set(key, { courseId, courseCode, courseName, entries: [], candidate: null });
      }
      return byCourse.get(key);
    };
    for (const entry of proposed) {
      ensure(entry.courseId, entry.courseCode, entry.courseName).entries.push(entry);
    }
    for (const candidate of candidates) {
      const group = ensure(candidate.courseId, candidate.courseCode, candidate.courseName);
      group.candidate = candidate;
      if (!group.courseName) group.courseName = candidate.courseName;
    }
    return [...byCourse.values()];
  }, [proposed, candidates]);

  const toggleEntry = useCallback((id, value) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const updateHours = useCallback((id, hours) => {
    setProposed((prev) => prev.map((e) => (e.id === id ? { ...e, hoursPerWeek: hours } : e)));
  }, []);

  const toggleAll = useCallback(
    (select) => {
      setSelectedIds(select ? new Set(proposed.map((e) => e.id)) : new Set());
    },
    [proposed]
  );

  // Save as draft (no live allocations).
  const handleSaveDraft = useCallback(async () => {
    if (!draftName.trim()) return;
    setPhase('saving');
    setError('');
    try {
      const selected = proposed.filter((e) => selectedIds.has(e.id));
      await allocationEngineApi.saveDraft({ name: draftName.trim(), proposed: selected });
      setSavedName(draftName.trim());
      setCommitResult(null);
      setPhase('done');
    } catch (err) {
      setError(errorMessage(err, 'Could not save draft.'));
      setPhase('review');
    }
  }, [draftName, proposed, selectedIds]);

  /**
   * Commit the checked rows.
   *
   * The commit endpoint works on draft entries, so a direct commit first parks
   * the selection in a throwaway draft and deletes it again afterwards. Edited
   * hours are sent as `hoursOverrides` keyed by the server entry id — without
   * them the server would commit the hours stored on the entry and the
   * reviewer's edit would be silently dropped.
   */
  const handleCommit = useCallback(async () => {
    const selected = proposed.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;

    setPhase('committing');
    setError('');
    try {
      let draftId = activeDraftId;
      let entryIds;
      let hoursOverrides;
      let temporary = false;

      if (draftId) {
        entryIds = selected.map((row) => row.entryId);
        hoursOverrides = Object.fromEntries(selected.map((row) => [row.entryId, row.hoursPerWeek]));
      } else {
        const draftRes = await allocationEngineApi.saveDraft({
          name: draftName.trim() || `Auto-commit ${new Date().toLocaleDateString()}`,
          proposed: selected,
        });
        const draft = draftRes?.data ?? draftRes;
        draftId = draft.id;
        temporary = true;
        // Map the freshly created entries back to the reviewed rows by the
        // tutor/course pair, so each override targets the right entry id.
        const byPair = new Map(selected.map((row) => [`${row.tutorId}::${row.courseId}`, row]));
        entryIds = [];
        hoursOverrides = {};
        for (const created of draft.draftAllocationEntries ?? []) {
          entryIds.push(created.id);
          const row = byPair.get(`${created.userId}::${created.courseId}`);
          if (row) hoursOverrides[created.id] = row.hoursPerWeek;
        }
      }

      const result = await allocationEngineApi.commitDraft(draftId, entryIds, hoursOverrides);
      setCommitResult(result?.data ?? result);
      setSavedName('');

      // The throwaway draft existed only to carry the commit; drop it so the
      // Drafts tab is not littered with "Auto-commit" rows.
      if (temporary) await allocationEngineApi.deleteDraft(draftId).catch(() => {});

      setActiveDraftId(null);
      setActiveDraftName('');
      setPhase('done');
      onCommitted?.();
    } catch (err) {
      setError(errorMessage(err, 'Commit failed — please try again.'));
      setPhase('review');
    }
  }, [proposed, selectedIds, activeDraftId, draftName, onCommitted]);

  const busy = phase === 'generating' || phase === 'saving' || phase === 'committing';
  const selectedCount = selectedIds.size;
  const allSelected = proposed.length > 0 && selectedCount === proposed.length;
  const noneSelected = selectedCount === 0;
  const unmatchedCount = (unmatched.courses?.length ?? 0) + (unmatched.tutors?.length ?? 0);

  const backToStart = useCallback(() => {
    if (activeDraftId) {
      setActiveDraftId(null);
      setActiveDraftName('');
      setPhase('idle');
      setTab('drafts');
      return;
    }
    setPhase('idle');
  }, [activeDraftId]);

  // ── Render ───────────────────────────────────────────────────────────────

  const renderIdle = () => (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">Allocation Engine</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Ranks every tutor per course by verified mark, then runs a Gale-Shapley stable matching
          against availability, timetable clashes, course capacity and weekly-hours budgets. The
          same data always produces the same ranking.
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="flex w-full items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {phase === 'generating' ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Running matching algorithm…
        </div>
      ) : (
        <Button onClick={runEngine} className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4" /> Run Engine
        </Button>
      )}
    </div>
  );

  const renderDone = () => {
    const committed = commitResult?.committed ?? [];
    const skipped = commitResult?.skipped ?? [];
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {commitResult ? 'Allocations committed' : 'Draft saved'}
          </h3>
          {commitResult ? (
            <p className="mt-2 text-sm text-slate-500">
              {committed.length} allocation{committed.length !== 1 ? 's' : ''} created
              {skipped.length > 0 ? `, ${skipped.length} skipped` : ''}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {savedName ? `“${savedName}” is saved. ` : 'The draft is saved. '}
              Open it from the Drafts tab to commit it later.
            </p>
          )}
        </div>
        {skipped.length > 0 && (
          <div className="w-full space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-left">
            <p className="text-xs font-semibold text-amber-700">
              Skipped — re-checked at commit and no longer valid
            </p>
            {skipped.map((s, index) => (
              <p key={s.entryId ?? index} className="text-xs text-amber-700">
                <strong>
                  {[s.tutorName, s.courseCode].filter(Boolean).join(' · ') || 'Draft entry'}
                </strong>{' '}
                — {s.reason}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => (
    <div className="space-y-5">
      {activeDraftId && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2 text-xs text-sky-800">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">Reviewing saved draft “{activeDraftName}”</span>
          <span className="text-sky-600">
            Every entry is re-checked when you commit; stale ones are skipped, not applied.
          </span>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="success">{proposed.length} proposed</Badge>
          {unmatchedCount > 0 && <Badge tone="warning">{unmatchedCount} unmatched</Badge>}
          <span className="text-xs text-slate-500">{selectedCount} selected</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            disabled={allSelected || busy}
            className="rounded px-2 py-1 text-xs text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            disabled={noneSelected || busy}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Deselect all
          </button>
          <button
            type="button"
            onClick={runEngine}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className={cn('h-3 w-3', phase === 'generating' && 'animate-spin')} />
            Revalidate
          </button>
        </div>
      </div>

      {/* Proposed groups + per-course candidate ranking */}
      {courseGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Users className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No allocations proposed</p>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            No eligible tutor-course pairs were found. Check marks, availability, and course
            sessions.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {courseGroups.map((group) => (
            <CourseGroup
              key={group.courseId ?? group.courseCode}
              group={group}
              selectedIds={selectedIds}
              onToggleEntry={toggleEntry}
              onHoursChange={updateHours}
            />
          ))}
        </div>
      )}

      {/* Unmatched summary */}
      <UnmatchedPanel unmatched={unmatched} />

      {/* Draft name for the "Save Draft" flow */}
      {proposed.length > 0 && !activeDraftId && (
        <div className="rounded-xl border border-slate-200 p-3">
          <label
            className="block text-xs font-semibold text-slate-700"
            htmlFor={`${tabIdBase}-name`}
          >
            Draft name
          </label>
          <input
            id={`${tabIdBase}-name`}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={`Engine run ${new Date().toLocaleDateString()}`}
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Required to save the plan for later. Committing re-checks every constraint, so nothing
            stale is applied.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );

  const renderBody = () => {
    if (tab === 'drafts') {
      return (
        <DraftsPanel
          drafts={drafts}
          loading={draftsLoading}
          error={draftsError}
          openingId={openingId}
          deletingId={deletingId}
          canDelete={canDelete}
          onOpen={openDraft}
          onDelete={removeDraft}
          onRetry={loadDrafts}
        />
      );
    }
    if (phase === 'idle' || phase === 'generating') return renderIdle();
    if (phase === 'done') return renderDone();
    return renderReview();
  };

  const renderFooter = () => {
    if (tab === 'drafts') {
      return (
        <Button onClick={() => setTab('generate')} variant="secondary" className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4" />
          New engine run
        </Button>
      );
    }
    if (phase === 'idle' || phase === 'generating') return null;

    if (phase === 'done') {
      return (
        <Button onClick={onClose} variant="secondary" className="w-full sm:w-auto">
          Close
        </Button>
      );
    }

    // review / saving / committing
    return (
      <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Button variant="ghost" onClick={backToStart} disabled={busy} className="w-full sm:w-auto">
          ← {activeDraftId ? 'Back to drafts' : 'Start over'}
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!activeDraftId && (
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              loading={phase === 'saving'}
              disabled={busy || noneSelected || !draftName.trim()}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          )}
          <Button
            onClick={handleCommit}
            loading={phase === 'committing'}
            disabled={busy || noneSelected}
            className="w-full sm:w-auto"
          >
            <Zap className="h-4 w-4" />
            Commit Selected ({selectedCount})
          </Button>
        </div>
      </div>
    );
  };

  const tabClass = (active) =>
    cn(
      'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
      active ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
    );

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Generate Allocation"
      description="Ranked, explained tutor-course matching you review before committing"
      footer={renderFooter()}
      size="lg"
    >
      <div
        role="tablist"
        aria-label="Allocation engine"
        className="mb-5 flex w-full gap-1 rounded-xl bg-slate-100 p-1"
      >
        <button
          type="button"
          role="tab"
          id={`${tabIdBase}-tab-generate`}
          aria-selected={tab === 'generate'}
          aria-controls={`${tabIdBase}-panel`}
          onClick={() => setTab('generate')}
          className={tabClass(tab === 'generate')}
        >
          <Sparkles className="h-4 w-4" />
          Generate
        </button>
        <button
          type="button"
          role="tab"
          id={`${tabIdBase}-tab-drafts`}
          aria-selected={tab === 'drafts'}
          aria-controls={`${tabIdBase}-panel`}
          onClick={() => setTab('drafts')}
          className={tabClass(tab === 'drafts')}
        >
          <FolderOpen className="h-4 w-4" />
          Drafts
        </button>
      </div>

      <div
        role="tabpanel"
        id={`${tabIdBase}-panel`}
        aria-labelledby={`${tabIdBase}-tab-${tab}`}
        className="max-h-[58vh] overflow-y-auto pr-1 lg:max-h-[65vh]"
      >
        {renderBody()}
      </div>
    </Modal>
  );
}
