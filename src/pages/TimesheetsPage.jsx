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

const weekLabel = 'Aug 18 – Aug 22, 2026';

const timesheetEntries = [
  { id: 1, tutor: 'Thabo Mokoena', initials: 'TM', course: 'COMS3011A', session: 'Data Structures Tutorial', day: 'Monday', date: 'Aug 18', time: '10:00–12:00', hours: 2, status: 'approved' },
  { id: 2, tutor: 'Sarah Nkosi', initials: 'SN', course: 'COMS3012A', session: 'Database Systems Lab', day: 'Tuesday', date: 'Aug 19', time: '12:00–14:00', hours: 2, status: 'approved' },
  { id: 3, tutor: 'Liam Smith', initials: 'LS', course: 'COMS3013A', session: 'Operating Systems Tutorial', day: 'Wednesday', date: 'Aug 20', time: '09:00–11:00', hours: 2, status: 'submitted' },
  { id: 4, tutor: 'Thabo Mokoena', initials: 'TM', course: 'COMS3022A', session: 'Algorithms Lab', day: 'Wednesday', date: 'Aug 20', time: '14:00–16:00', hours: 2, status: 'submitted' },
  { id: 5, tutor: 'Ayesha Khan', initials: 'AK', course: 'COMS3015A', session: 'Software Engineering Tutorial', day: 'Friday', date: 'Aug 22', time: '10:00–12:00', hours: 2, status: 'draft' },
  { id: 6, tutor: 'Thabo Mokoena', initials: 'TM', course: 'COMS3040A', session: 'Machine Learning Lab', day: 'Friday', date: 'Aug 22', time: '08:00–10:00', hours: 2, status: 'draft' },
];

const statusConfig = {
  approved:  { label: 'Approved',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  submitted: { label: 'Submitted', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  draft:     { label: 'Draft',     bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400' },
};

const dayTotals = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({
  day,
  hours: timesheetEntries.filter((e) => e.day === day).reduce((sum, e) => sum + e.hours, 0),
}));

export default function TimesheetsPage() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? timesheetEntries : timesheetEntries.filter((e) => e.status === filter);
  const totalHours = timesheetEntries.reduce((sum, e) => sum + e.hours, 0);
  const approvedHours = timesheetEntries.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">Tracking</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="mt-2 text-sm text-slate-500">
            Review weekly session hours, approve submissions, and monitor tutor workload.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          {weekLabel}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Logged</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalHours}h</p>
          <p className="mt-1 text-xs text-slate-400">{timesheetEntries.length} entries this week</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Approved</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{approvedHours}h</p>
          <p className="mt-1 text-xs text-slate-400">Confirmed by Organiser</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totalHours - approvedHours}h</p>
          <p className="mt-1 text-xs text-slate-400">Awaiting approval</p>
        </div>
      </div>

      {/* Daily breakdown */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Daily Hours</h2>
        <div className="flex items-end gap-3">
          {dayTotals.map(({ day, hours }) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700">{hours}h</span>
              <div className="relative h-20 w-full overflow-hidden rounded-lg bg-slate-100">
                <div
                  className="absolute bottom-0 w-full rounded-lg bg-blue-500 transition-all"
                  style={{ height: `${Math.min((hours / 6) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-400">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Entries table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold text-slate-800">Session Entries</h2>
            <p className="mt-0.5 text-sm text-slate-400">Individual timesheet line items for this week.</p>
          </div>
          <div className="flex gap-2">
            {['all', 'draft', 'submitted', 'approved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f
                    ? 'bg-blue-700 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Tutor</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Day</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const s = statusConfig[entry.status];
                return (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                          {entry.initials}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{entry.tutor}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-800">{entry.course}</p>
                      <p className="text-xs text-slate-400">{entry.session}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{entry.day}<span className="ml-1 text-xs text-slate-400">({entry.date})</span></td>
                    <td className="px-5 py-3 text-sm text-slate-600">{entry.time}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{entry.hours}h</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No entries match the selected filter.</p>
        )}
      </section>
    </div>
  );
}
