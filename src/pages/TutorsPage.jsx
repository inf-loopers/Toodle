import FeatureHeading from '../components/layout/FeatureHeading';
/**
 * @file TutorsPage.jsx
 * @description Staff tutor directory, marks, and capacity inspection view.
 *
 * Responsibilities:
 * - Lists all registered tutors with student numbers and contact info.
 * - Search bar to filter tutors by name, student number, or email.
 * - Displays tutor historical course marks.
 * - Displays weekly allocated hours vs. maximum hour capacity.
 * - Displays available weekdays based on tutor availability schedules.
 *
 * Role: Staff Only (Admin, Lecturer)
 * Route: `/tutors`
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users, Clock, Award, Plus, DollarSign } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { tutorsApi } from '../api/tutors';
import { coursesApi } from '../api/courses';
import { ratesApi } from '../api/rates';
import { getInitials, formatDay, formatTime } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import FormError from '../components/ui/FormError';
import { getApiErrorMessage } from '../utils/apiError';

function TutorDetailModal({ tutor, courses, open, onClose, onUpdated }) {
  const { isAdmin, isLecturer } = useAuth();
  const [courseId, setCourseId] = useState('');
  const [mark, setMark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const tutorId = tutor?.id;

  // A lecturer may only manage pay rates for a tutor who currently holds an
  // active allocation on one of the courses that lecturer coordinates — the
  // tutor's `allocations` list is already scoped by the backend, so a
  // non-empty list proves this lecturer manages at least one shared course.
  const canManageRate = isAdmin || (isLecturer && (tutor?.allocations ?? []).length > 0);

  const [rateHistory, setRateHistory] = useState([]);
  const [rateHistoryLoading, setRateHistoryLoading] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [newRateEffectiveFrom, setNewRateEffectiveFrom] = useState('');
  const [rateSubmitting, setRateSubmitting] = useState(false);
  const [rateError, setRateError] = useState('');
  const [correctingId, setCorrectingId] = useState(null);
  const [correctingValue, setCorrectingValue] = useState('');
  const [correctingSubmitting, setCorrectingSubmitting] = useState(false);
  const [correctingError, setCorrectingError] = useState('');

  const loadRateHistory = async () => {
    if (!tutorId || !canManageRate) return;
    setRateHistoryLoading(true);
    try {
      const result = await ratesApi.getRateHistory(tutorId);
      setRateHistory(result?.data ?? result ?? []);
    } catch (err) {
      setRateError(getApiErrorMessage(err, 'Could not load the rate history.'));
    } finally {
      setRateHistoryLoading(false);
    }
  };

  // Clear the mark form when a different tutor is opened. A failed save keeps
  // whatever was typed so the staff member can correct it and retry.
  useEffect(() => {
    setCourseId('');
    setMark('');
    setError('');
    setNewRate('');
    setNewRateEffectiveFrom('');
    setRateError('');
    setCorrectingId(null);
    setCorrectingValue('');
    setCorrectingError('');
    setRateHistory([]);
    if (open) loadRateHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorId, open]);

  if (!tutor) return null;

  const handleAddRate = async () => {
    if (!newRate || !newRateEffectiveFrom) return;
    setRateSubmitting(true);
    setRateError('');
    try {
      await ratesApi.createRate(tutor.id, {
        rate: Number(newRate),
        effectiveFrom: newRateEffectiveFrom,
      });
      setNewRate('');
      setNewRateEffectiveFrom('');
      await loadRateHistory();
      onUpdated();
    } catch (err) {
      setRateError(getApiErrorMessage(err, 'Could not save the rate.'));
    } finally {
      setRateSubmitting(false);
    }
  };

  const handleCorrectRate = async (rateId) => {
    if (correctingValue === '') return;
    setCorrectingSubmitting(true);
    setCorrectingError('');
    try {
      await ratesApi.correctRate(tutor.id, rateId, { rate: Number(correctingValue) });
      setCorrectingId(null);
      setCorrectingValue('');
      await loadRateHistory();
      onUpdated();
    } catch (err) {
      setCorrectingError(getApiErrorMessage(err, 'Could not save the correction.'));
    } finally {
      setCorrectingSubmitting(false);
    }
  };

  const handleAddMark = async () => {
    if (!courseId || mark === '') return;
    setSubmitting(true);
    setError('');
    try {
      await tutorsApi.addOrUpdateMark(tutor.id, { courseId, mark: Number(mark) });
      onUpdated();
      setCourseId('');
      setMark('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save the mark.'));
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
            <FormError message={error} />
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

        {canManageRate && (
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pay rate
            </p>
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
              <DollarSign className="h-4 w-4 text-slate-400" />
              {tutor.currentRate ? (
                <span>
                  Current rate: R{Number(tutor.currentRate.rate).toFixed(2)}/hr since{' '}
                  {new Date(tutor.currentRate.effectiveFrom).toISOString().slice(0, 10)}
                </span>
              ) : (
                <span className="text-amber-600">No pay rate configured yet.</span>
              )}
            </div>

            {rateHistoryLoading ? (
              <p className="text-sm text-slate-400">Loading history…</p>
            ) : (
              <div className="mb-3 space-y-2">
                {rateHistory.length === 0 && (
                  <p className="text-sm text-slate-400">No rate history yet.</p>
                )}
                {rateHistory.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >
                    {correctingId === r.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={correctingValue}
                          onChange={(e) => setCorrectingValue(e.target.value)}
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleCorrectRate(r.id)}
                          loading={correctingSubmitting}
                          disabled={correctingValue === ''}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setCorrectingId(null);
                            setCorrectingValue('');
                            setCorrectingError('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-600">
                          {new Date(r.effectiveFrom).toISOString().slice(0, 10)} — R
                          {Number(r.rate).toFixed(2)}/hr
                        </span>
                        <div className="flex items-center gap-2">
                          {r.isCorrection && <Badge tone="neutral">Correction</Badge>}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setCorrectingId(r.id);
                              setCorrectingValue(String(r.rate));
                              setCorrectingError('');
                            }}
                          >
                            Fix
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <FormError message={correctingError} />
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-slate-100 p-3">
              <FormError message={rateError} />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="New rate from"
                  type="date"
                  value={newRateEffectiveFrom}
                  onChange={(e) => setNewRateEffectiveFrom(e.target.value)}
                />
                <Input
                  label="Rate (R / hr)"
                  type="number"
                  min={0}
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddRate}
                loading={rateSubmitting}
                disabled={!newRate || !newRateEffectiveFrom}
                className="w-full justify-center"
              >
                <Plus className="h-4 w-4" /> Save new rate
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function TutorsPage() {
  const { data, loading, error, refetch } = useApi(tutorsApi.getTutors);
  const { data: coursesData } = useApi(coursesApi.getCourses);
  // Seed the directory filter from `?q=` so a global-search person result
  // deep-links into a pre-filtered tutor list.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selected, setSelected] = useState(null);

  const tutors = data?.data ?? data ?? [];
  const courses = coursesData?.data ?? coursesData ?? [];
  const filtered = tutors.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner fullPage label="Loading tutors…" />;
  if (error)
    return (
      <ErrorState
        title="Couldn't load tutors"
        description={error}
        action={<Button onClick={refetch}>Try again</Button>}
      />
    );

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <FeatureHeading className="text-3xl font-bold tracking-tight text-slate-900">
            Tutors
          </FeatureHeading>
          <p className="mt-2 text-sm text-slate-500">
            Marks, availability and weekly hours for every tutor.
          </p>
        </div>
        <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tutors…"
            aria-label="Search tutors"
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
          <div>
            {filtered.map((tutor) => (
              <button
                key={tutor.id}
                onClick={() => setSelected(tutor)}
                className="flex w-full items-center gap-4 border-t border-slate-100 px-5 py-4 text-left first:border-t-0 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary max-sm:grid max-sm:grid-cols-[2rem_minmax(0,1fr)] max-sm:gap-x-2 max-sm:gap-y-1.5 max-sm:px-3 max-sm:py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary max-sm:h-8 max-sm:w-8 max-sm:text-xs">
                  {getInitials(tutor.name)}
                </div>
                <div className="min-w-0 flex-1 break-words">
                  <p className="text-sm font-semibold text-slate-800 max-sm:text-[13px]">
                    {tutor.name}
                  </p>
                  <p className="text-xs text-slate-400">{tutor.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 max-sm:col-start-2">
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
