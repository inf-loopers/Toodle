/**
 * @file TutorsPage.jsx
 * @description Organiser's tutor directory, marks, and capacity inspection view.
 *
 * Responsibilities:
 * - Lists all registered tutors with student numbers and contact info.
 * - Search bar to filter tutors by name, student number, or email.
 * - Displays tutor historical course marks.
 * - Displays weekly allocated hours vs. maximum hour capacity.
 * - Displays available weekdays based on tutor availability schedules.
 *
 * Role: Organiser Only
 * Route: `/tutors`
 */

import { useState } from 'react';

const tutors = [
  {
    id: 't1',
    name: 'Thabo Mokoena',
    initials: 'TM',
    studentNo: '218045631',
    email: 'thabo.mokoena@students.wits.ac.za',
    hoursUsed: 8,
    hoursMax: 12,
    days: ['Mon', 'Wed', 'Fri'],
    marks: [
      { course: 'COMS3011A', mark: 85 },
      { course: 'COMS3022A', mark: 78 },
      { course: 'COMS2001A', mark: 92 },
    ],
  },
  {
    id: 't2',
    name: 'Sarah Nkosi',
    initials: 'SN',
    studentNo: '219012847',
    email: 'sarah.nkosi@students.wits.ac.za',
    hoursUsed: 10,
    hoursMax: 12,
    days: ['Tue', 'Thu', 'Fri'],
    marks: [
      { course: 'COMS3012A', mark: 90 },
      { course: 'COMS3033A', mark: 82 },
      { course: 'COMS2001A', mark: 88 },
    ],
  },
  {
    id: 't3',
    name: 'Liam Smith',
    initials: 'LS',
    studentNo: '220067493',
    email: 'liam.smith@students.wits.ac.za',
    hoursUsed: 6,
    hoursMax: 10,
    days: ['Mon', 'Wed', 'Thu'],
    marks: [
      { course: 'COMS3013A', mark: 76 },
      { course: 'COMS3044A', mark: 81 },
      { course: 'COMS3060A', mark: 74 },
    ],
  },
  {
    id: 't4',
    name: 'Ayesha Khan',
    initials: 'AK',
    studentNo: '217089124',
    email: 'ayesha.khan@students.wits.ac.za',
    hoursUsed: 8,
    hoursMax: 14,
    days: ['Tue', 'Wed', 'Fri'],
    marks: [
      { course: 'COMS3015A', mark: 94 },
      { course: 'COMS3050A', mark: 88 },
      { course: 'COMS2001A', mark: 91 },
    ],
  },
  {
    id: 't5',
    name: 'Priya Dlamini',
    initials: 'PD',
    studentNo: '221034519',
    email: 'priya.dlamini@students.wits.ac.za',
    hoursUsed: 4,
    hoursMax: 10,
    days: ['Mon', 'Tue', 'Thu'],
    marks: [
      { course: 'COMS1015A', mark: 87 },
      { course: 'COMS2001A', mark: 79 },
    ],
  },
  {
    id: 't6',
    name: 'James van Wyk',
    initials: 'JV',
    studentNo: '219055672',
    email: 'james.vanwyk@students.wits.ac.za',
    hoursUsed: 10,
    hoursMax: 12,
    days: ['Wed', 'Thu', 'Fri'],
    marks: [
      { course: 'COMS3011A', mark: 80 },
      { course: 'COMS3022A', mark: 83 },
      { course: 'COMS3013A', mark: 77 },
    ],
  },
];

const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function markColor(mark) {
  if (mark >= 85) return 'bg-emerald-50 text-emerald-700';
  if (mark >= 75) return 'bg-blue-50 text-blue-700';
  if (mark >= 65) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export default function TutorsPage() {
  const [search, setSearch] = useState('');

  const filtered = tutors.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.studentNo.includes(search) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">Directory</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Tutors</h1>
          <p className="mt-2 text-sm text-slate-500">
            Browse registered tutors, inspect their course marks, and monitor weekly hour capacity.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          {tutors.length} registered
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          ⌕
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, student number, or email..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
        />
      </div>

      {/* Tutor grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t) => {
          const hoursPct = Math.round((t.hoursUsed / t.hoursMax) * 100);
          const hoursCritical = hoursPct >= 80;

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 border-b border-slate-100 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {t.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.studentNo}</p>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {/* Email */}
                <p className="truncate text-xs text-slate-500">{t.email}</p>

                {/* Hours bar */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">Weekly hours</span>
                    <span
                      className={`font-bold ${hoursCritical ? 'text-amber-600' : 'text-slate-700'}`}
                    >
                      {t.hoursUsed}/{t.hoursMax}h
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${hoursCritical ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${hoursPct}%` }}
                    />
                  </div>
                </div>

                {/* Available days */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Available</p>
                  <div className="flex gap-1.5">
                    {allDays.map((d) => (
                      <span
                        key={d}
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                          t.days.includes(d)
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-50 text-slate-300'
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Course marks */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Course marks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.marks.map((m) => (
                      <span
                        key={m.course}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${markColor(m.mark)}`}
                      >
                        {m.course}: {m.mark}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400">No tutors match your search.</p>
      )}
    </div>
  );
}
