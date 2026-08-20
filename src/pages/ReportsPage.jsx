/**
 * @file ReportsPage.jsx
 * @description Analytics and reporting dashboard for the Organiser.
 *
 * Responsibilities:
 * - Summary metric cards (allocation rate, avg hours, unfilled courses, swap rate).
 * - Visual bar charts for tutor workload distribution and course fill rates.
 * - Recent reports table with download actions.
 * - Period selector for weekly/monthly/semester views.
 *
 * Route: `/reports`
 */

import { useState } from 'react';

const periods = ['This Week', 'This Month', 'This Semester'];

const allocationData = [
  { course: 'COMS1015A', fillPct: 100 },
  { course: 'COMS2001A', fillPct: 100 },
  { course: 'COMS3011A', fillPct: 50 },
  { course: 'COMS3012A', fillPct: 50 },
  { course: 'COMS3013A', fillPct: 50 },
  { course: 'COMS3014A', fillPct: 0 },
  { course: 'COMS3015A', fillPct: 67 },
  { course: 'COMS3022A', fillPct: 100 },
  { course: 'COMS3033A', fillPct: 100 },
  { course: 'COMS3044A', fillPct: 50 },
  { course: 'COMS3050A', fillPct: 100 },
  { course: 'COMS3060A', fillPct: 50 },
];

const workloadData = [
  { name: 'Thabo M.', hours: 8, max: 12 },
  { name: 'Sarah N.', hours: 10, max: 12 },
  { name: 'Liam S.', hours: 6, max: 10 },
  { name: 'Ayesha K.', hours: 8, max: 14 },
  { name: 'Priya D.', hours: 4, max: 10 },
  { name: 'James vW.', hours: 10, max: 12 },
];

const recentReports = [
  { id: 1, name: 'Semester 1 Allocation Summary', date: 'Jun 30, 2026', type: 'PDF', size: '1.2 MB' },
  { id: 2, name: 'Tutor Hours Report — July', date: 'Aug 01, 2026', type: 'CSV', size: '340 KB' },
  { id: 3, name: 'Course Staffing Audit', date: 'Aug 12, 2026', type: 'PDF', size: '890 KB' },
  { id: 4, name: 'Swap Activity Log — July', date: 'Aug 02, 2026', type: 'PDF', size: '210 KB' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('This Semester');

  const avgFill = Math.round(allocationData.reduce((sum, c) => sum + c.fillPct, 0) / allocationData.length);
  const fullyStaffed = allocationData.filter((c) => c.fillPct === 100).length;
  const unfilled = allocationData.filter((c) => c.fillPct === 0).length;
  const totalTutorHours = workloadData.reduce((sum, t) => sum + t.hours, 0);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">Analytics</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Reports</h1>
          <p className="mt-2 text-sm text-slate-500">
            Allocation metrics, workload distribution, and downloadable reports for the current academic period.
          </p>
        </div>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                period === p
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Allocation Rate', value: `${avgFill}%`, desc: 'Average course fill rate', accent: 'text-blue-700' },
          { label: 'Fully Staffed', value: `${fullyStaffed}/${allocationData.length}`, desc: 'Courses at full capacity', accent: 'text-emerald-600' },
          { label: 'Unfilled Courses', value: unfilled, desc: 'Courses with no tutor assigned', accent: 'text-red-600' },
          { label: 'Total Tutor Hours', value: `${totalTutorHours}h`, desc: 'Across all active tutors', accent: 'text-violet-600' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.accent}`}>{card.value}</p>
            <p className="mt-2 text-xs text-slate-400">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Course fill rate */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Course Fill Rate</h2>
          <p className="mb-4 text-xs text-slate-400">Percentage of required tutors assigned per course.</p>
          <div className="space-y-2.5">
            {allocationData.map((c) => (
              <div key={c.course} className="flex items-center gap-3">
                <span className="w-24 truncate text-xs font-medium text-slate-600">{c.course}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className={`h-full rounded transition-all ${
                      c.fillPct === 100 ? 'bg-emerald-500' : c.fillPct > 0 ? 'bg-amber-400' : 'bg-red-300'
                    }`}
                    style={{ width: `${c.fillPct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-bold text-slate-600">{c.fillPct}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tutor workload */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Tutor Workload</h2>
          <p className="mb-4 text-xs text-slate-400">Weekly hours used vs. maximum capacity per tutor.</p>
          <div className="space-y-3">
            {workloadData.map((t) => {
              const pct = Math.round((t.hours / t.max) * 100);
              const critical = pct >= 80;
              return (
                <div key={t.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{t.name}</span>
                    <span className={critical ? 'font-bold text-amber-600' : 'text-slate-500'}>
                      {t.hours}/{t.max}h
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${critical ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent reports table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Recent Reports</h2>
          <p className="mt-0.5 text-sm text-slate-400">Downloadable reports generated by the system.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Report Name</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-800">{r.name}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">{r.date}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      r.type === 'PDF' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">{r.size}</td>
                  <td className="px-5 py-3">
                    <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
