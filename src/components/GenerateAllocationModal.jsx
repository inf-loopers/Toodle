/**
 * @file GenerateAllocationModal.jsx
 * @description Modal for the Allocation Engine flow.
 *
 * State machine:
 *   idle → generating → review → saving | committing → done
 *
 * Review panel:
 *   - Proposed allocations grouped by course.
 *   - Each row: tutor name, course code, editable hours, explanation badge, checkbox.
 *   - Unmatched courses/tutors panel with short reason.
 *
 * Actions:
 *   "Save as Draft" — persists the plan without creating live allocations.
 *   "Commit Selected" — converts checked rows to live allocations immediately.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  X,
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { allocationEngineApi } from '../api/allocationEngine';

// ── Explanation Badge ────────────────────────────────────────────────────────

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
  } = explanation;

  const markLabel =
    mark != null ? (meetsMinMark ? `${mark}% ✓` : `${mark}% (min ${minMarkRequired}%)`) : 'No mark';

  const availLabel =
    sessionsTotal === 0
      ? 'No sessions'
      : sessionsCovered === sessionsTotal
        ? `${sessionsTotal}/${sessionsTotal} sessions`
        : `${sessionsCovered}/${sessionsTotal} sessions`;

  const hoursLabel = `${remainingHours}h remaining`;

  const _tone = !meetsMinMark ? 'warning' : sessionsCovered < sessionsTotal ? 'warning' : 'success';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
      >
        <span>Why?</span>
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-10 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Match explanation
          </p>
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
                Hours: {hoursLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Proposed Entry Row ───────────────────────────────────────────────────────

function EntryRow({ entry, selected, onToggle, onHoursChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:border-slate-200">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">
            {entry.tutorName || entry.tutorEmail}
          </span>
          <Badge tone="primary" className="text-[10px]">
            {entry.courseCode}
          </Badge>
          <span className="text-xs text-slate-400">{entry.courseName}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-slate-500">h/wk:</label>
            <input
              type="number"
              min={1}
              max={40}
              value={entry.hoursPerWeek}
              onChange={(e) => onHoursChange(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="w-14 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <ExplanationBadge explanation={entry.explanation} />
        </div>
      </div>
    </label>
  );
}

// ── Course Group ─────────────────────────────────────────────────────────────

function CourseGroup({
  courseCode,
  courseName,
  entries,
  selectedIds,
  onToggleEntry,
  onHoursChange,
}) {
  const allSelected = entries.every((e) => selectedIds.has(e.id ?? e.tutorId + e.courseId));
  const someSelected = entries.some((e) => selectedIds.has(e.id ?? e.tutorId + e.courseId));

  const toggleAll = () => {
    if (allSelected) {
      entries.forEach((e) => {
        const key = e.id ?? e.tutorId + e.courseId;
        if (selectedIds.has(key)) onToggleEntry(key, false);
      });
    } else {
      entries.forEach((e) => {
        const key = e.id ?? e.tutorId + e.courseId;
        if (!selectedIds.has(key)) onToggleEntry(key, true);
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-slate-300 text-primary"
        />
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-semibold text-slate-800">{courseCode}</span>
        <span className="text-xs text-slate-500">{courseName}</span>
        <Badge tone="neutral" className="text-[10px]">
          {entries.length} tutor{entries.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="ml-6 space-y-1.5">
        {entries.map((entry) => {
          const key = entry.id ?? entry.tutorId + entry.courseId;
          return (
            <EntryRow
              key={key}
              entry={entry}
              selected={selectedIds.has(key)}
              onToggle={() => onToggleEntry(key, !selectedIds.has(key))}
              onHoursChange={(h) => onHoursChange(key, h)}
            />
          );
        })}
      </div>
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
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-amber-800">
            {total} unmatched item{total !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-amber-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-500" />
        )}
      </button>
      {open && (
        <div className="border-t border-amber-200 px-4 pb-4 pt-3 space-y-3">
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

// ── Main Modal ───────────────────────────────────────────────────────────────

/**
 * Modal for the Allocation Engine flow.
 *
 * @param {{ open: boolean, onClose: () => void, onCommitted: () => void }} props
 */
export default function GenerateAllocationModal({ open, onClose, onCommitted }) {
  // phase: 'idle' | 'generating' | 'review' | 'saving' | 'committing' | 'done'
  const [phase, setPhase] = useState('idle');
  const [proposed, setProposed] = useState([]); // mutable copy with editable hoursPerWeek
  const [unmatched, setUnmatched] = useState({ tutors: [], courses: [] });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState('');
  const [commitResult, setCommitResult] = useState(null);

  // Reset when the modal opens.
  useEffect(() => {
    if (open) {
      setPhase('idle');
      setProposed([]);
      setUnmatched({ tutors: [], courses: [] });
      setSelectedIds(new Set());
      setDraftName('');
      setError('');
      setCommitResult(null);
    }
  }, [open]);

  // Trigger generation.
  const runEngine = useCallback(async () => {
    setPhase('generating');
    setError('');
    try {
      const res = await allocationEngineApi.generate();
      const plan = res?.data ?? res;
      const entries = (plan.proposed ?? []).map((p, _idx) => ({
        ...p,
        id: `${p.tutorId}-${p.courseId}`,
      }));
      setProposed(entries);
      setUnmatched(plan.unmatched ?? { tutors: [], courses: [] });
      setSelectedIds(new Set(entries.map((e) => e.id)));
      setPhase('review');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Engine failed — please try again.');
      setPhase('idle');
    }
  }, []);

  // Group proposed entries by course.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const entry of proposed) {
      const key = entry.courseCode;
      if (!map.has(key))
        map.set(key, { courseCode: entry.courseCode, courseName: entry.courseName, entries: [] });
      map.get(key).entries.push(entry);
    }
    return [...map.values()];
  }, [proposed]);

  // Toggle entry selection.
  const toggleEntry = useCallback((id, value) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Update hours for an entry.
  const updateHours = useCallback((id, hours) => {
    setProposed((prev) => prev.map((e) => (e.id === id ? { ...e, hoursPerWeek: hours } : e)));
  }, []);

  // Select / deselect all.
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
      setPhase('done');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not save draft.');
      setPhase('review');
    }
  }, [draftName, proposed, selectedIds]);

  // Commit directly to live allocations (no draft step).
  const handleCommit = useCallback(async () => {
    const selected = proposed.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;

    // We need a draft ID to call commit. Create a temporary draft first.
    setPhase('committing');
    setError('');
    try {
      const draftRes = await allocationEngineApi.saveDraft({
        name: `Auto-commit ${new Date().toLocaleDateString()}`,
        proposed: selected,
      });
      const draft = draftRes?.data ?? draftRes;
      const entryIds = draft.draftAllocationEntries.map((e) => e.id);
      const result = await allocationEngineApi.commitDraft(draft.id, entryIds);
      setCommitResult(result?.data ?? result);
      setPhase('done');
      onCommitted?.();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Commit failed — please try again.');
      setPhase('review');
    }
  }, [proposed, selectedIds, onCommitted]);

  const busy = phase === 'generating' || phase === 'saving' || phase === 'committing';
  const selectedCount = selectedIds.size;
  const allSelected = proposed.length > 0 && selectedCount === proposed.length;
  const noneSelected = selectedCount === 0;

  // ── Render ───────────────────────────────────────────────────────────────

  const renderBody = () => {
    if (phase === 'idle' || phase === 'generating') {
      return (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Allocation Engine</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Runs a Gale-Shapley stable-matching algorithm across all tutors and courses using
              marks, availability, and capacity constraints.
            </p>
          </div>
          {error && (
            <div className="flex w-full items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-700">
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
            <Button onClick={runEngine}>
              <Sparkles className="h-4 w-4" /> Run Engine
            </Button>
          )}
        </div>
      );
    }

    if (phase === 'done') {
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
                The draft has been saved. You can commit it later from the board.
              </p>
            )}
          </div>
          {skipped.length > 0 && (
            <div className="w-full space-y-1 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-left">
              <p className="text-xs font-semibold text-amber-700">Skipped entries</p>
              {skipped.map((s, i) => (
                <p key={i} className="text-xs text-amber-700">
                  {s.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    // phase === 'review' | 'saving' | 'committing'
    return (
      <div className="space-y-5">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
          <div className="flex items-center gap-3 text-sm">
            <Badge tone="success">{proposed.length} proposed</Badge>
            {(unmatched.courses?.length ?? 0) + (unmatched.tutors?.length ?? 0) > 0 && (
              <Badge tone="warning">
                {(unmatched.courses?.length ?? 0) + (unmatched.tutors?.length ?? 0)} unmatched
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{selectedCount} selected</span>
            <button
              type="button"
              onClick={() => toggleAll(true)}
              disabled={allSelected}
              className="rounded px-2 py-1 text-xs text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              disabled={noneSelected}
              className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Deselect all
            </button>
          </div>
        </div>

        {/* Proposed groups */}
        {proposed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No allocations proposed</p>
            <p className="mt-1 text-xs text-slate-400">
              No eligible tutor-course pairs were found. Check marks, availability, and course
              sessions.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <CourseGroup
                key={group.courseCode}
                {...group}
                selectedIds={selectedIds}
                onToggleEntry={toggleEntry}
                onHoursChange={updateHours}
              />
            ))}
          </div>
        )}

        {/* Unmatched summary */}
        <UnmatchedPanel unmatched={unmatched} />

        {/* Draft name input for "Save as Draft" flow */}
        {proposed.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="block text-xs font-semibold text-slate-700">
              Draft name (optional)
            </label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={`Engine run ${new Date().toLocaleDateString()}`}
              disabled={busy}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Save the plan to review later without creating live allocations.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  };

  const renderFooter = () => {
    if (phase === 'idle' || phase === 'generating') return null;

    if (phase === 'done') {
      return (
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      );
    }

    // review / saving / committing
    return (
      <div className="flex w-full items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setPhase('idle')} disabled={busy}>
          ← Re-run
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            loading={phase === 'saving'}
            disabled={busy || noneSelected}
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={handleCommit}
            loading={phase === 'committing'}
            disabled={busy || noneSelected}
          >
            <Zap className="h-4 w-4" />
            Commit Selected ({selectedCount})
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Generate Allocation"
      description="Gale-Shapley stable matching across tutors and courses"
      footer={renderFooter()}
      size="lg"
    >
      <div className="max-h-[65vh] overflow-y-auto pr-1">{renderBody()}</div>
    </Modal>
  );
}
