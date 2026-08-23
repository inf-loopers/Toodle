/**
 * @file TimesheetsPage.jsx
 * @description Weekly timesheet and hours tracking page for tutors.
 *
 * Responsibilities:
 * - Displays a weekly timesheet grid with session entries.
 * - Shows daily and weekly hour totals.
 * - Status tracking: submitted, approved, or draft.
 * - Tutors can see their logged hours; Organisers can approve entries.
 *
 * Route: `/timesheets`
 */

import { useState } from 'react';
import { Plus, Clock, Send, CheckCircle2, XCircle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { timesheetsApi } from '../api/timesheets';
import { coursesApi } from '../api/courses';
import { useAuth } from '../hooks/useAuth';
import { TIMESHEET_STATUS_TONE } from '../utils/constants';
import { formatShortDate } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input, Textarea } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

function NewTimesheetModal({ open, onClose, courses, onCreated }) {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - ((today.getDay() + 6) % 7)));
  const [form, setForm] = useState({ courseId: '', weekStarting: monday.toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.courseId) return;
    setSubmitting(true);
    try {
      await timesheetsApi.createTimesheet(form);
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
      title="Start a timesheet"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!form.courseId}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Course" value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}>
          <option value="">Choose a course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.code}</option>
          ))}
        </Select>
        <Input
          label="Week starting"
          type="date"
          value={form.weekStarting}
          onChange={(e) => setForm((f) => ({ ...f, weekStarting: e.target.value }))}
        />
      </div>
    </Modal>
  );
}

function LogHoursModal({ timesheet, open, onClose, onLogged }) {
  const [form, setForm] = useState({ date: '', hours: 1, description: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!timesheet) return null;

  const handleSubmit = async () => {
    if (!form.date) return;
    setSubmitting(true);
    try {
      await timesheetsApi.addEntry(timesheet.id, { ...form, hours: Number(form.hours) });
      onLogged();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log hours"
      description={timesheet.course?.code}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!form.date}>Log entry</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <Input label="Hours" type="number" min={0.25} step={0.25} value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
        <Textarea label="What did you work on?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
    </Modal>
  );
}

function DisputeModal({ timesheet, open, onClose, onDisputed }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!timesheet) return null;

  const handleSubmit = async () => {
    if (!note) return;
    setSubmitting(true);
    try {
      await timesheetsApi.disputeTimesheet(timesheet.id, note);
      onDisputed();
      onClose();
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dispute timesheet"
      description={`${timesheet.user?.name || ''} · ${timesheet.course?.code || ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} loading={submitting} disabled={!note}>Send back</Button>
        </>
      }
    >
      <Textarea label="What needs to change?" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Hours on Tuesday don't match the session length." />
    </Modal>
  );
}

export function TimesheetsPage() {
  const { isOrganiser } = useAuth();
  const { data, loading, error, refetch } = useApi(timesheetsApi.getTimesheets);
  const { data: coursesData } = useApi(coursesApi.getCourses, { immediate: !isOrganiser });
  const [newOpen, setNewOpen] = useState(false);
  const [logTarget, setLogTarget] = useState(null);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const timesheets = data?.data ?? data ?? [];
  const courses = coursesData?.data ?? coursesData ?? [];

  const handleSubmitTimesheet = async (id) => {
    setBusyId(id);
    try {
      await timesheetsApi.submitTimesheet(id);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      await timesheetsApi.approveTimesheet(id);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner fullPage label="Loading timesheets…" />;
  if (error) return <ErrorState title="Couldn't load timesheets" description={error} />;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Timesheets</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isOrganiser ? 'Approve, dispute or track submitted hours.' : 'Log your hours and submit them for approval.'}
          </p>
        </div>
        {!isOrganiser && (
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New timesheet
          </Button>
        )}
      </div>

      {timesheets.length === 0 ? (
        <EmptyState icon={Clock} title="No timesheets yet" description={isOrganiser ? 'Nothing has been submitted yet.' : 'Start one to log your hours for the week.'} />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-slate-100">
            {timesheets.map((ts) => (
              <div key={ts.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{ts.course?.code || ts.courseId}</p>
                    <Badge tone={TIMESHEET_STATUS_TONE[ts.status] || 'neutral'}>{ts.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Week of {formatShortDate(ts.weekStarting)} {isOrganiser && ts.user?.name ? `· ${ts.user.name}` : ''} · {Number(ts.totalHours || 0)}h logged
                  </p>
                  {ts.disputeNote && ts.status === 'DISPUTED' && (
                    <p className="mt-1 text-xs text-amber-700">"{ts.disputeNote}"</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isOrganiser && (ts.status === 'DRAFT' || ts.status === 'DISPUTED') && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setLogTarget(ts)}>
                        <Plus className="h-3.5 w-3.5" /> Log hours
                      </Button>
                      <Button size="sm" onClick={() => handleSubmitTimesheet(ts.id)} loading={busyId === ts.id}>
                        <Send className="h-3.5 w-3.5" /> Submit
                      </Button>
                    </>
                  )}

                  {isOrganiser && ts.status === 'SUBMITTED' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setDisputeTarget(ts)}>
                        <XCircle className="h-3.5 w-3.5" /> Dispute
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(ts.id)} loading={busyId === ts.id}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isOrganiser && (
        <>
          <NewTimesheetModal open={newOpen} onClose={() => setNewOpen(false)} courses={courses} onCreated={refetch} />
          <LogHoursModal timesheet={logTarget} open={Boolean(logTarget)} onClose={() => setLogTarget(null)} onLogged={refetch} />
        </>
      )}
      {isOrganiser && (
        <DisputeModal timesheet={disputeTarget} open={Boolean(disputeTarget)} onClose={() => setDisputeTarget(null)} onDisputed={refetch} />
      )}
    </>
  );
}

export default TimesheetsPage;
