/**
 * @file CoursesPage.jsx
 * @description Course catalog and management page.
 *
 * Responsibilities:
 * - Lists all active computer science courses with staffing status.
 * - Real-time client-side search and filtering by code or title.
 * - Displays staffing status badges and prerequisite minimum marks.
 * - "Add New Course" button for Organiser.
 *
 * Route: `/courses`
 */

import { useState } from 'react';

const courses = [
  { id: 1, code: 'COMS1015A', title: 'Intro to Programming', tutorsNeeded: 3, tutorsAssigned: 3, minMark: 65, students: 320, status: 'full' },
  { id: 2, code: 'COMS2001A', title: 'Data Structures & Algorithms', tutorsNeeded: 4, tutorsAssigned: 4, minMark: 70, students: 210, status: 'full' },
  { id: 3, code: 'COMS3011A', title: 'Data Structures', tutorsNeeded: 2, tutorsAssigned: 1, minMark: 75, students: 85, status: 'partial' },
  { id: 4, code: 'COMS3012A', title: 'Database Systems', tutorsNeeded: 2, tutorsAssigned: 1, minMark: 70, students: 92, status: 'partial' },
  { id: 5, code: 'COMS3013A', title: 'Operating Systems', tutorsNeeded: 2, tutorsAssigned: 1, minMark: 72, students: 78, status: 'partial' },
  { id: 6, code: 'COMS3014A', title: 'Computer Networks', tutorsNeeded: 2, tutorsAssigned: 0, minMark: 70, students: 65, status: 'none' },
  { id: 7, code: 'COMS3015A', title: 'Software Engineering', tutorsNeeded: 3, tutorsAssigned: 2, minMark: 68, students: 110, status: 'partial' },
  { id: 8, code: 'COMS3022A', title: 'Algorithms', tutorsNeeded: 2, tutorsAssigned: 2, minMark: 75, students: 88, status: 'full' },
  { id: 9, code: 'COMS3033A', title: 'Computer Graphics', tutorsNeeded: 1, tutorsAssigned: 1, minMark: 70, students: 42, status: 'full' },
  { id: 10, code: 'COMS3044A', title: 'Distributed Systems', tutorsNeeded: 2, tutorsAssigned: 1, minMark: 73, students: 56, status: 'partial' },
  { id: 11, code: 'COMS3050A', title: 'Human-Computer Interaction', tutorsNeeded: 1, tutorsAssigned: 1, minMark: 65, students: 70, status: 'full' },
  { id: 12, code: 'COMS3060A', title: 'Cybersecurity', tutorsNeeded: 2, tutorsAssigned: 1, minMark: 70, students: 63, status: 'partial' },
];

const statusConfig = {
  full:    { label: 'Fully Staffed',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  partial: { label: 'Needs Tutors',   bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  none:    { label: 'Unassigned',     bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500' },
};

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: courses.length,
    full: courses.filter((c) => c.status === 'full').length,
    partial: courses.filter((c) => c.status === 'partial').length,
    none: courses.filter((c) => c.status === 'none').length,
  };

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">Catalog</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Courses</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage course offerings, staffing status, and prerequisite requirements.
          </p>
        </div>
        <button className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
          + Add Course
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or title..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'full', 'partial', 'none'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                filter === f
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'full' ? 'Staffed' : f === 'partial' ? 'Partial' : 'Unassigned'}
              <span className="ml-1.5 opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const s = statusConfig[c.status];
          const fillPct = Math.round((c.tutorsAssigned / c.tutorsNeeded) * 100);

          return (
            <div key={c.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">{c.code}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{c.title}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>

              {/* Tutor fill bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tutor fill</span>
                  <span className="font-semibold text-slate-700">{c.tutorsAssigned}/{c.tutorsNeeded}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${fillPct === 100 ? 'bg-emerald-500' : fillPct > 0 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              {/* Meta */}
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                <span>Min mark: <strong className="text-slate-600">{c.minMark}%</strong></span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{c.students} students</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400">No courses match your search.</p>
      )}
    </div>
  );
}
