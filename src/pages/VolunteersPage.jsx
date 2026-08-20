/**
 * @file VolunteersPage.jsx
 * @description Volunteer registration and management page.
 *
 * Responsibilities:
 * - Lists registered volunteers with contact info and course interests.
 * - Shows volunteer availability and preferred subjects.
 * - Status tracking: pending review, active, or inactive.
 * - Quick actions to approve or archive volunteers.
 *
 * Route: `/volunteers`
 */

import { useState } from 'react';

const volunteers = [
  {
    id: 1, name: 'Naledi Moyo', initials: 'NM', studentNo: '222041789',
    email: 'naledi.moyo@students.wits.ac.za', phone: '+27 72 123 4567',
    courses: ['COMS1015A', 'COMS2001A'], status: 'active', registeredAt: 'Jan 15, 2026',
  },
  {
    id: 2, name: 'Ryan Pillay', initials: 'RP', studentNo: '221078234',
    email: 'ryan.pillay@students.wits.ac.za', phone: '+27 83 456 7890',
    courses: ['COMS3011A', 'COMS3022A'], status: 'active', registeredAt: 'Feb 02, 2026',
  },
  {
    id: 3, name: 'Zanele Khumalo', initials: 'ZK', studentNo: '220056321',
    email: 'zanele.khumalo@students.wits.ac.za', phone: '+27 61 789 0123',
    courses: ['COMS3012A', 'COMS3033A'], status: 'pending', registeredAt: 'Aug 10, 2026',
  },
  {
    id: 4, name: 'David Chen', initials: 'DC', studentNo: '219023876',
    email: 'david.chen@students.wits.ac.za', phone: '+27 82 345 6789',
    courses: ['COMS3060A'], status: 'pending', registeredAt: 'Aug 15, 2026',
  },
  {
    id: 5, name: 'Amara Okonkwo', initials: 'AO', studentNo: '221094512',
    email: 'amara.okonkwo@students.wits.ac.za', phone: '+27 76 234 5678',
    courses: ['COMS3013A', 'COMS3044A'], status: 'active', registeredAt: 'Mar 20, 2026',
  },
  {
    id: 6, name: 'Sipho Ndlovu', initials: 'SN', studentNo: '220067891',
    email: 'sipho.ndlovu@students.wits.ac.za', phone: '+27 79 876 5432',
    courses: ['COMS1015A'], status: 'inactive', registeredAt: 'Jan 05, 2026',
  },
];

const statusConfig = {
  active:   { label: 'Active',          bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending:  { label: 'Pending Review',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  inactive: { label: 'Inactive',        bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400' },
};

export default function VolunteersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = volunteers.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.studentNo.includes(search);
    const matchesFilter = filter === 'all' || v.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">Volunteers</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Volunteer Directory</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage student volunteers — approve registrations, track interests, and contact candidates.
          </p>
        </div>
        <button className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
          + Register Volunteer
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or student number..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'pending', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
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

      {/* Volunteer cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => {
          const s = statusConfig[v.status];
          return (
            <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                    {v.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{v.name}</p>
                    <p className="text-xs text-slate-400">{v.studentNo}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p>{v.email}</p>
                <p>{v.phone}</p>
                <p className="text-slate-400">Registered: {v.registeredAt}</p>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Interested in</p>
                <div className="flex flex-wrap gap-1.5">
                  {v.courses.map((c) => (
                    <span key={c} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {v.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">
                    Approve
                  </button>
                  <button className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                    Archive
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400">No volunteers match your search.</p>
      )}
    </div>
  );
}
