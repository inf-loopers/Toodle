/**
 * @file SessionSwapPage.jsx
 * @description Tutor-facing page for trading sessions between tutors.
 *
 * Responsibilities:
 * - Displays the current tutor's assigned sessions with "Propose Swap" actions.
 * - Provides a swap-proposal modal: pick a partner, select their session,
 *   run real-time constraint checks (timetable clash, weekly hours, eligibility).
 * - Lists incoming swap requests from other tutors (accept / decline).
 * - Lists outgoing swap requests with approval status (pending / approved / rejected).
 * - Routes submitted swaps to the Organiser for final approval.
 *
 * Route: `/swaps`
 */

import { useState } from 'react';

/* ── Mock data ───────────────────────────────────────────────────────────── */

const CURRENT_TUTOR = {
  id: 't1',
  name: 'Thabo Mokoena',
  initials: 'TM',
  weeklyHoursMax: 12,
  weeklyHoursUsed: 8,
};

const mySessions = [
  {
    id: 's1',
    course: 'COMS3011A',
    name: 'Data Structures',
    day: 'Monday',
    time: '10:00–12:00',
    hours: 2,
    venue: 'CB204',
  },
  {
    id: 's2',
    course: 'COMS3022A',
    name: 'Algorithms',
    day: 'Wednesday',
    time: '14:00–16:00',
    hours: 2,
    venue: 'CB301',
  },
  {
    id: 's3',
    course: 'COMS3040A',
    name: 'Machine Learning',
    day: 'Friday',
    time: '08:00–10:00',
    hours: 2,
    venue: 'CB101',
  },
  {
    id: 's4',
    course: 'COMS3055A',
    name: 'Web Development',
    day: 'Friday',
    time: '12:00–14:00',
    hours: 2,
    venue: 'CB202',
  },
];

const otherTutors = [
  {
    id: 't2',
    name: 'Sarah Nkosi',
    initials: 'SN',
    weeklyHoursMax: 12,
    weeklyHoursUsed: 10,
    sessions: [
      {
        id: 's5',
        course: 'COMS3012A',
        name: 'Database Systems',
        day: 'Tuesday',
        time: '12:00–14:00',
        hours: 2,
        venue: 'CB205',
      },
      {
        id: 's6',
        course: 'COMS3033A',
        name: 'Computer Graphics',
        day: 'Thursday',
        time: '10:00–12:00',
        hours: 2,
        venue: 'CB110',
      },
    ],
  },
  {
    id: 't3',
    name: 'Liam Smith',
    initials: 'LS',
    weeklyHoursMax: 10,
    weeklyHoursUsed: 6,
    sessions: [
      {
        id: 's7',
        course: 'COMS3013A',
        name: 'Operating Systems',
        day: 'Wednesday',
        time: '09:00–11:00',
        hours: 2,
        venue: 'CB302',
      },
      {
        id: 's8',
        course: 'COMS3044A',
        name: 'Distributed Systems',
        day: 'Thursday',
        time: '14:00–16:00',
        hours: 2,
        venue: 'CB204',
      },
      {
        id: 's9',
        course: 'COMS3060A',
        name: 'Cybersecurity',
        day: 'Monday',
        time: '14:00–16:00',
        hours: 2,
        venue: 'CB101',
      },
    ],
  },
  {
    id: 't4',
    name: 'Ayesha Khan',
    initials: 'AK',
    weeklyHoursMax: 14,
    weeklyHoursUsed: 8,
    sessions: [
      {
        id: 's10',
        course: 'COMS3015A',
        name: 'Software Engineering',
        day: 'Friday',
        time: '10:00–12:00',
        hours: 2,
        venue: 'CB301',
      },
      {
        id: 's11',
        course: 'COMS3050A',
        name: 'HCI',
        day: 'Tuesday',
        time: '08:00–10:00',
        hours: 2,
        venue: 'CB204',
      },
    ],
  },
];

const initialIncoming = [
  {
    id: 'req1',
    fromTutor: { name: 'Sarah Nkosi', initials: 'SN' },
    theirSession: {
      course: 'COMS3012A',
      name: 'Database Systems',
      day: 'Tuesday',
      time: '12:00–14:00',
    },
    yourSession: {
      course: 'COMS3011A',
      name: 'Data Structures',
      day: 'Monday',
      time: '10:00–12:00',
    },
    status: 'pending',
    submittedAt: '2 hours ago',
  },
];

const initialOutgoing = [
  {
    id: 'req2',
    toTutor: { name: 'Liam Smith', initials: 'LS' },
    yourSession: { course: 'COMS3022A', name: 'Algorithms', day: 'Wednesday', time: '14:00–16:00' },
    theirSession: {
      course: 'COMS3060A',
      name: 'Cybersecurity',
      day: 'Monday',
      time: '14:00–16:00',
    },
    status: 'pending',
    submittedAt: '1 day ago',
  },
];

/* ── Constraint checker ──────────────────────────────────────────────────── */

function checkConstraints(mySession, partnerSession, partner) {
  const issues = [];

  // Timetable clash: check if either tutor already has a session at the proposed time
  const myDays = mySessions.map((s) => `${s.day}|${s.time}`);
  const partnerDays = partner.sessions.map((s) => `${s.day}|${s.time}`);

  // After swap: I give away mySession, I get partnerSession
  // My new schedule = mySessions - mySession + partnerSession
  const myNewDays = myDays.filter((d) => d !== `${mySession.day}|${mySession.time}`);
  const myNewSlot = `${partnerSession.day}|${partnerSession.time}`;
  if (myNewDays.includes(myNewSlot)) {
    issues.push({
      type: 'clash',
      message: `You already have a session on ${partnerSession.day} at ${partnerSession.time}.`,
    });
  }

  // Partner's new schedule = partner.sessions - partnerSession + mySession
  const partnerNewDays = partnerDays.filter(
    (d) => d !== `${partnerSession.day}|${partnerSession.time}`
  );
  const partnerNewSlot = `${mySession.day}|${mySession.time}`;
  if (partnerNewDays.includes(partnerNewSlot)) {
    issues.push({
      type: 'clash',
      message: `${partner.name} already has a session on ${mySession.day} at ${mySession.time}.`,
    });
  }

  // Weekly hours check
  const myNewHours = CURRENT_TUTOR.weeklyHoursUsed - mySession.hours + partnerSession.hours;
  if (myNewHours > CURRENT_TUTOR.weeklyHoursMax) {
    issues.push({
      type: 'hours',
      message: `Swap would push you to ${myNewHours}h/${CURRENT_TUTOR.weeklyHoursMax}h weekly limit.`,
    });
  }

  const partnerNewHours = partner.weeklyHoursUsed - partnerSession.hours + mySession.hours;
  if (partnerNewHours > partner.weeklyHoursMax) {
    issues.push({
      type: 'hours',
      message: `Swap would push ${partner.name} to ${partnerNewHours}h/${partner.weeklyHoursMax}h weekly limit.`,
    });
  }

  return { valid: issues.length === 0, issues };
}

/* ── Components ──────────────────────────────────────────────────────────── */

function SwapModal({ session, onClose }) {
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const partner = otherTutors.find((t) => t.id === selectedTutor);
  const constraints =
    partner && selectedSession ? checkConstraints(session, selectedSession, partner) : null;

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <span className="text-3xl">&#10003;</span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Swap request submitted!</h3>
          <p className="mt-2 text-sm text-slate-500">
            Your swap proposal has been sent to the Organiser for approval. You&apos;ll be notified
            once a decision is made.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Propose Session Swap</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Trade one of your sessions with another tutor.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            &#10005;
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {/* Your session */}
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              You are offering
            </p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {session.course} — {session.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {session.day} · {session.time} · {session.venue}
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {session.hours}h
              </span>
            </div>
          </div>

          {/* Pick tutor */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Swap with
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {otherTutors.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTutor(t.id);
                    setSelectedSession(null);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selectedTutor === t.id
                      ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {t.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {t.weeklyHoursUsed}/{t.weeklyHoursMax}h used
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pick their session */}
          {partner && (
            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Request their session
              </label>
              <div className="space-y-2">
                {partner.sessions.map((ps) => (
                  <button
                    key={ps.id}
                    onClick={() => setSelectedSession(ps)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${
                      selectedSession?.id === ps.id
                        ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {ps.course} — {ps.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {ps.day} · {ps.time} · {ps.venue}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {ps.hours}h
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Constraint checks */}
          {constraints && (
            <div
              className={`rounded-xl border p-4 ${constraints.valid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${constraints.valid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                >
                  {constraints.valid ? '&#10003;' : '!'}
                </span>
                <p
                  className={`text-sm font-semibold ${constraints.valid ? 'text-emerald-800' : 'text-amber-800'}`}
                >
                  {constraints.valid ? 'All constraints passed' : 'Constraint issues detected'}
                </p>
              </div>

              {constraints.valid ? (
                <p className="mt-2 text-xs text-emerald-600">
                  No timetable clashes or hour-limit violations. This swap is safe to submit.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {constraints.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={!constraints?.valid}
            onClick={() => setSubmitted(true)}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              constraints?.valid
                ? 'bg-blue-700 text-white hover:bg-blue-800'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] || styles.pending}`}
    >
      {status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {status === 'approved' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {status === 'rejected' && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
      {status}
    </span>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function SessionSwapPage() {
  const [swapSession, setSwapSession] = useState(null);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing] = useState(initialOutgoing);

  const hoursRemaining = CURRENT_TUTOR.weeklyHoursMax - CURRENT_TUTOR.weeklyHoursUsed;

  function handleAccept(reqId) {
    setIncoming((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'approved' } : r)));
  }

  function handleDecline(reqId) {
    setIncoming((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r)));
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">Session Trading</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Swap Sessions</h1>
          <p className="mt-2 max-w-lg text-sm text-slate-500">
            Trade sessions with other tutors. Every swap is validated against timetable clashes and
            weekly hour limits, then routed to the Organiser for approval.
          </p>
        </div>

        {/* Hours budget */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-w-[240px]">
          <p className="text-xs font-medium text-slate-500">Weekly Hours Budget</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-bold text-slate-900">{CURRENT_TUTOR.weeklyHoursUsed}h</p>
            <p className="text-sm text-slate-400">/ {CURRENT_TUTOR.weeklyHoursMax}h</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${hoursRemaining <= 2 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{
                width: `${(CURRENT_TUTOR.weeklyHoursUsed / CURRENT_TUTOR.weeklyHoursMax) * 100}%`,
              }}
            />
          </div>
          <p
            className={`mt-1.5 text-xs font-medium ${hoursRemaining <= 2 ? 'text-amber-600' : 'text-emerald-600'}`}
          >
            {hoursRemaining}h remaining
          </p>
        </div>
      </div>

      {/* My Sessions */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Your Sessions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Click "Propose Swap" on any session to start a trade.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {mySessions.map((s) => (
            <div
              key={s.id}
              className="group flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:border-blue-200 hover:shadow-sm"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">{s.course}</p>
                <p className="text-xs text-slate-500">{s.name}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                  <span>{s.day}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{s.time}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{s.venue}</span>
                </div>
              </div>
              <button
                onClick={() => setSwapSession(s)}
                className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                &#8644; Propose Swap
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Two-column: Incoming + Outgoing */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Incoming requests */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-800">Incoming Requests</h2>
              <p className="mt-1 text-sm text-slate-400">Other tutors wanting to swap with you.</p>
            </div>
            {incoming.filter((r) => r.status === 'pending').length > 0 && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {incoming.filter((r) => r.status === 'pending').length} new
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {incoming.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No incoming requests.</p>
            )}
            {incoming.map((req) => (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {req.fromTutor.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{req.fromTutor.name}</p>
                      <p className="text-xs text-slate-400">{req.submittedAt}</p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {/* Swap visual */}
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">They give</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                      {req.theirSession.course}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {req.theirSession.day} · {req.theirSession.time}
                    </p>
                  </div>
                  <span className="text-slate-300">&#8644;</span>
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">You give</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                      {req.yourSession.course}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {req.yourSession.day} · {req.yourSession.time}
                    </p>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Outgoing requests */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">Outgoing Requests</h2>
            <p className="mt-1 text-sm text-slate-400">
              Swaps you&apos;ve proposed, awaiting Organiser approval.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {outgoing.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No outgoing requests.</p>
            )}
            {outgoing.map((req) => (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {req.toTutor.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">To {req.toTutor.name}</p>
                      <p className="text-xs text-slate-400">{req.submittedAt}</p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">You give</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                      {req.yourSession.course}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {req.yourSession.day} · {req.yourSession.time}
                    </p>
                  </div>
                  <span className="text-slate-300">&#8644;</span>
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">You get</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                      {req.theirSession.course}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {req.theirSession.day} · {req.theirSession.time}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Awaiting Organiser review. You&apos;ll be notified of the decision.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* How it works */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">How Session Swaps Work</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            {
              step: '1',
              title: 'Propose',
              desc: 'Select your session and pick a tutor to trade with.',
            },
            {
              step: '2',
              title: 'Validate',
              desc: 'The platform checks for timetable clashes and hour-limit violations.',
            },
            { step: '3', title: 'Mutual Agree', desc: 'Both tutors must accept the swap terms.' },
            {
              step: '4',
              title: 'Approval',
              desc: 'The Organiser reviews and gives final approval.',
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      {swapSession && <SwapModal session={swapSession} onClose={() => setSwapSession(null)} />}
    </div>
  );
}
