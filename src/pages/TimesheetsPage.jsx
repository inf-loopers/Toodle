/**
 * @file TimesheetsPage.jsx
 * @description Weekly timesheet and hours tracking page for tutors.
 *
 * Responsibilities:
 * - Displays weekly timesheets and logged hours.
 * - Only allows tutors to use courses from active allocations.
 * - Shows logged hours against allocated weekly hours.
 * - Displays the timesheet status flow.
 * - Allows disputed timesheets to be corrected and re-submitted.
 * - Allows staff to approve or dispute submitted timesheets.
 *
 * Route: `/timesheets`
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Clock, Send, CheckCircle2, XCircle, Trash2, ListChecks } from 'lucide-react';

import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

import { timesheetsApi } from '../api/timesheets';
import { allocationsApi } from '../api/allocations';

import { TIMESHEET_STATUS_TONE } from '../utils/constants';
import { formatShortDate } from '../utils/helpers';

import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input, Textarea } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
  );
}

function getCurrentMonday() {
  const today = new Date();
  const monday = new Date(today);

  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  return monday.toISOString().slice(0, 10);
}

function StatusStepper({ status }) {
  let finalStatus = 'APPROVED';

  if (status === 'DISPUTED') {
    finalStatus = 'DISPUTED';
  }

  if (status === 'REJECTED') {
    finalStatus = 'REJECTED';
  }

  const steps = ['DRAFT', 'SUBMITTED', finalStatus];

  let currentIndex = 0;

  if (status === 'SUBMITTED') {
    currentIndex = 1;
  }

  if (
    status === 'APPROVED' ||
    status === 'DISPUTED' ||
    status === 'REJECTED' ||
    status === 'PAID'
  ) {
    currentIndex = 2;
  }

  return (
    <div className="mt-4 flex items-center">
      {steps.map((step, index) => {
        const reached = index <= currentIndex;
        const current = index === currentIndex;

        return (
          <div key={`${step}-${index}`} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  current
                    ? status === 'DISPUTED'
                      ? 'bg-amber-500 text-white'
                      : status === 'REJECTED'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-900 text-white'
                    : reached
                      ? 'bg-slate-300 text-slate-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {index + 1}
              </div>

              <span
                className={`mt-1 text-[10px] font-medium ${
                  current ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  index < currentIndex ? 'bg-slate-300' : 'bg-slate-100'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewTimesheetModal({ open, onClose, courses, onCreated }) {
  const [form, setForm] = useState({
    courseId: '',
    weekStartDate: getCurrentMonday(),
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setForm({
        courseId: '',
        weekStartDate: getCurrentMonday(),
      });

      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.courseId || !form.weekStartDate) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await timesheetsApi.createTimesheet({
        courseId: form.courseId,
        weekStartDate: form.weekStartDate,
      });

      await onCreated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the timesheet.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a timesheet"
      description="Choose one of your actively allocated courses."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!form.courseId || !form.weekStartDate}
          >
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Course"
          value={form.courseId}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              courseId: event.target.value,
            }))
          }
        >
          <option value="">Choose a course…</option>

          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code}
              {course.name ? ` — ${course.name}` : ''}
            </option>
          ))}
        </Select>

        <Input
          label="Week starting"
          type="date"
          value={form.weekStartDate}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              weekStartDate: event.target.value,
            }))
          }
        />

        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function LogHoursModal({ timesheet, open, onClose, onLogged }) {
  const [form, setForm] = useState({
    date: '',
    hours: 1,
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setForm({
        date: '',
        hours: 1,
        description: '',
      });

      setError('');
    }
  }, [open]);

  if (!timesheet) {
    return null;
  }

  const handleSubmit = async () => {
    if (!form.date) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await timesheetsApi.addEntry(timesheet.id, {
        date: form.date,
        hoursWorked: Number(form.hours),
        description: form.description,
      });

      await onLogged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not log the hours.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log hours"
      description={timesheet.course?.code || 'Timesheet entry'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSubmit} loading={submitting} disabled={!form.date}>
            Log entry
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              date: event.target.value,
            }))
          }
        />

        <Input
          label="Hours"
          type="number"
          min={0.25}
          max={24}
          step={0.25}
          value={form.hours}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              hours: event.target.value,
            }))
          }
        />

        <Textarea
          label="What did you work on?"
          value={form.description}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              description: event.target.value,
            }))
          }
        />

        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function ManageEntriesModal({ timesheet, open, onClose, onChanged }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const timesheetId = timesheet?.id;

  const loadTimesheet = useCallback(async () => {
    if (!timesheetId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await timesheetsApi.getTimesheet(timesheetId);

      setDetails(response?.data ?? response ?? null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load timesheet entries.'));
    } finally {
      setLoading(false);
    }
  }, [timesheetId]);

  useEffect(() => {
    if (open && timesheetId) {
      loadTimesheet();
    }

    if (!open) {
      setDetails(null);
      setError('');
    }
  }, [open, timesheetId, loadTimesheet]);

  if (!timesheet) {
    return null;
  }

  const handleDelete = async (entryId) => {
    setDeletingId(entryId);
    setError('');

    try {
      await timesheetsApi.deleteEntry(timesheet.id, entryId);

      await loadTimesheet();
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not remove the entry.'));
    } finally {
      setDeletingId(null);
    }
  };

  const entries = details?.entries ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage timesheet entries"
      description={
        timesheet.status === 'DISPUTED'
          ? 'Remove incorrect entries, then log the corrected hours before re-submitting.'
          : 'Review or remove your logged entries.'
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading entries…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">No entries have been logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {Number(entry.hoursWorked || 0)}h
                    </p>

                    {entry.course?.code && <Badge tone="neutral">{entry.course.code}</Badge>}
                  </div>

                  <p className="mt-1 text-xs text-slate-400">{formatShortDate(entry.date)}</p>

                  {entry.description && (
                    <p className="mt-2 text-sm text-slate-600">{entry.description}</p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(entry.id)}
                  loading={deletingId === entry.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {details && (
          <p className="text-sm font-medium text-slate-700">
            Total logged: {Number(details.totalHours || 0)}h
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function DisputeModal({ timesheet, open, onClose, onDisputed }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      setError('');
    }
  }, [open]);

  if (!timesheet) {
    return null;
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await timesheetsApi.disputeTimesheet(timesheet.id, reason.trim());

      await onDisputed();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not dispute the timesheet.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dispute timesheet"
      description={`${timesheet.user?.name || ''}${
        timesheet.course?.code ? ` · ${timesheet.course.code}` : ''
      }`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!reason.trim()}
          >
            Send back
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Textarea
          label="What needs to change?"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Hours on Tuesday don't match the session length."
        />

        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function TimesheetsPage() {
  const { dbUser: user, isStaff } = useAuth();

  const { data, loading, error, refetch } = useApi(timesheetsApi.getTimesheets);

  /*
   * Allocations are loaded for both Tutors and staff.
   *
   * Tutors use these to:
   * - restrict the New Timesheet course dropdown
   * - show their weekly allocated hours
   *
   * Staff use these to:
   * - compare each Tutor's logged hours with their allocation
   */
  const { data: allocationsData, error: allocationsError } = useApi(allocationsApi.getAllocations);

  const [newOpen, setNewOpen] = useState(false);

  const [logTarget, setLogTarget] = useState(null);

  const [manageTarget, setManageTarget] = useState(null);

  const [disputeTarget, setDisputeTarget] = useState(null);

  const [busyId, setBusyId] = useState(null);

  const [actionError, setActionError] = useState('');

  const timesheets = data?.data ?? data ?? [];

  const allocations = allocationsData?.data ?? allocationsData ?? [];

  /*
   * All ACTIVE allocations.
   *
   * Staff need the full list so we can match each
   * timesheet to the correct Tutor allocation.
   */
  const activeAllocations = allocations.filter((allocation) => allocation.status === 'ACTIVE');

  /*
   * Tutors must only be able to create timesheets for
   * courses they personally have an ACTIVE allocation for.
   */
  const tutorActiveAllocations = activeAllocations.filter(
    (allocation) => allocation.userId === user?.id
  );

  const courses = tutorActiveAllocations
    .map((allocation) => allocation.course)
    .filter(Boolean)
    .filter((course, index, array) => array.findIndex((item) => item.id === course.id) === index);

  /*
   * Match both the Tutor and Course.
   *
   * This is important on the staff page because multiple
   * Tutors can have allocations for the same course.
   */
  const getAllocationForTimesheet = (timesheet) =>
    activeAllocations.find(
      (allocation) =>
        allocation.courseId === timesheet.courseId && allocation.userId === timesheet.userId
    );

  const handleSubmitTimesheet = async (id) => {
    setBusyId(id);
    setActionError('');

    try {
      await timesheetsApi.submitTimesheet(id);

      await refetch();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not submit the timesheet.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (id) => {
    setBusyId(id);
    setActionError('');

    try {
      await timesheetsApi.approveTimesheet(id);

      await refetch();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not approve the timesheet.'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <Spinner fullPage label="Loading timesheets…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load timesheets"
        description={getErrorMessage(error, 'Could not load timesheets.')}
      />
    );
  }

  const allocationErrorMessage = allocationsError
    ? getErrorMessage(allocationsError, 'Could not load allocations.')
    : '';

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Timesheets</h1>

          <p className="mt-2 text-sm text-slate-500">
            {isStaff
              ? 'Approve, dispute or track submitted hours.'
              : 'Log your hours and submit them for approval.'}
          </p>
        </div>

        {!isStaff && (
          <Button onClick={() => setNewOpen(true)} disabled={tutorActiveAllocations.length === 0}>
            <Plus className="h-4 w-4" />
            New timesheet
          </Button>
        )}
      </div>

      {(actionError || allocationErrorMessage) && (
        <p role="alert" className="mb-4 text-sm text-rose-600">
          {actionError || allocationErrorMessage}
        </p>
      )}

      {!isStaff && tutorActiveAllocations.length === 0 && !allocationErrorMessage && (
        <p className="mb-4 text-sm text-slate-500">
          You need an active allocation before you can create a timesheet.
        </p>
      )}

      {timesheets.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timesheets yet"
          description={
            isStaff
              ? 'Nothing has been submitted yet.'
              : 'Start one to log your hours for the week.'
          }
        />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-slate-100">
            {timesheets.map((timesheet) => {
              const allocation = getAllocationForTimesheet(timesheet);

              const loggedHours = Number(timesheet.totalHours || 0);

              const rawAllocatedHours =
                allocation?.hoursPerWeek ?? allocation?.allocatedHours ?? allocation?.weeklyHours;

              const allocatedHours =
                rawAllocatedHours !== undefined && rawAllocatedHours !== null
                  ? Number(rawAllocatedHours)
                  : null;

              return (
                <div key={timesheet.id} className="px-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {timesheet.course?.code || timesheet.courseId}
                        </p>

                        <Badge tone={TIMESHEET_STATUS_TONE[timesheet.status] || 'neutral'}>
                          {timesheet.status}
                        </Badge>
                      </div>

                      {timesheet.course?.name && (
                        <p className="mt-1 text-sm text-slate-500">{timesheet.course.name}</p>
                      )}

                      <p className="mt-2 text-xs text-slate-400">
                        Week of {formatShortDate(timesheet.weekStartDate)}
                        {isStaff && timesheet.user?.name ? ` · ${timesheet.user.name}` : ''}
                      </p>

                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {allocatedHours !== null
                          ? `${loggedHours}h / ${allocatedHours}h allocated`
                          : `${loggedHours}h logged`}
                      </p>

                      {allocatedHours !== null && allocatedHours > 0 && (
                        <div className="mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-700"
                            style={{
                              width: `${Math.min((loggedHours / allocatedHours) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      )}

                      <StatusStepper status={timesheet.status} />

                      {timesheet.status === 'DISPUTED' && timesheet.disputeReason && (
                        <div className="mt-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                            Changes requested
                          </p>

                          <p className="mt-1 text-sm text-amber-800">{timesheet.disputeReason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!isStaff &&
                        (timesheet.status === 'DRAFT' || timesheet.status === 'DISPUTED') && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setManageTarget(timesheet)}
                            >
                              <ListChecks className="h-3.5 w-3.5" />
                              Manage entries
                            </Button>

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setLogTarget(timesheet)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Log hours
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleSubmitTimesheet(timesheet.id)}
                              loading={busyId === timesheet.id}
                            >
                              <Send className="h-3.5 w-3.5" />

                              {timesheet.status === 'DISPUTED' ? 'Resubmit' : 'Submit'}
                            </Button>
                          </>
                        )}

                      {isStaff && timesheet.status === 'SUBMITTED' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDisputeTarget(timesheet)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Dispute
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleApprove(timesheet.id)}
                            loading={busyId === timesheet.id}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!isStaff && (
        <>
          <NewTimesheetModal
            open={newOpen}
            onClose={() => setNewOpen(false)}
            courses={courses}
            onCreated={refetch}
          />

          <LogHoursModal
            timesheet={logTarget}
            open={Boolean(logTarget)}
            onClose={() => setLogTarget(null)}
            onLogged={refetch}
          />

          <ManageEntriesModal
            timesheet={manageTarget}
            open={Boolean(manageTarget)}
            onClose={() => setManageTarget(null)}
            onChanged={refetch}
          />
        </>
      )}

      {isStaff && (
        <DisputeModal
          timesheet={disputeTarget}
          open={Boolean(disputeTarget)}
          onClose={() => setDisputeTarget(null)}
          onDisputed={refetch}
        />
      )}
    </>
  );
}

export default TimesheetsPage;
