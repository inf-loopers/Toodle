/**
 * @file DashboardPage.jsx
 * @description Central dashboard view for the Toodle tutor platform.
 *
 * Responsibilities:
 * - Renders the main dashboard layout with a search bar and notification button.
 * - Displays summary stat cards for courses, tutors, assignments, and unfilled slots.
 * - Shows recent activity feed and upcoming sessions.
 *
 * Route: `/dashboard`
 */

import { useState } from 'react';

const notifications = [
  { id: 1, text: 'COMS3014A still needs a tutor assigned', type: 'warning', time: '5 min ago' },
  { id: 2, text: 'Timetable clash detected for Wed 09:00', type: 'error', time: '1 hour ago' },
  { id: 3, text: 'Sarah Nkosi is nearing weekly hour limit', type: 'info', time: '2 hours ago' },
  { id: 4, text: 'New tutor application from Priya D.', type: 'info', time: 'Yesterday' },
];

const recentActivity = [
  { id: 1, action: 'Assigned', detail: 'Thabo Mokoena → COMS3011A', time: '10 min ago' },
  { id: 2, action: 'Updated', detail: 'COMS3012A session moved to Tuesday', time: '1 hour ago' },
  { id: 3, action: 'Removed', detail: 'Liam Smith unassigned from COMS3050A', time: '3 hours ago' },
  { id: 4, action: 'Added', detail: 'New course COMS3020A submitted', time: 'Yesterday' },
];

function StatCard({ label, value, description, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent || 'text-slate-900'}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => n.type === 'warning' || n.type === 'error').length;

  return (
    <div className="space-y-8">
      {/* Top bar: Search + Notifications */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            ⌕
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, tutors, sessions..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Notification Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className={`relative rounded-xl border p-2.5 transition hover:bg-slate-50 ${
              showNotifications
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600'
            }`}
            aria-label="Notifications"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                  {unreadCount} new
                </span>
              </div>

              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3 transition hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          n.type === 'error'
                            ? 'bg-red-500'
                            : n.type === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm text-slate-700">{n.text}</p>
                        <p className="mt-1 text-xs text-slate-400">{n.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Courses" value="24" description="Courses requiring tutors this term" accent="text-blue-700" />
        <StatCard label="Active Tutors" value="68" description="Tutors available this semester" accent="text-emerald-600" />
        <StatCard label="Allocated Slots" value="52" description="Assignments currently active" accent="text-violet-600" />
        <StatCard label="Constraint Alerts" value="4" description="Issues needing your attention" accent="text-amber-600" />
      </div>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Recent Activity</h2>
          <p className="mt-1 text-sm text-slate-400">Latest changes to allocations and courses.</p>
        </div>

        <ul className="divide-y divide-slate-100">
          {recentActivity.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/50">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  item.action === 'Assigned'
                    ? 'bg-emerald-50 text-emerald-700'
                    : item.action === 'Updated'
                    ? 'bg-blue-50 text-blue-700'
                    : item.action === 'Removed'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-violet-50 text-violet-700'
                }`}
              >
                {item.action}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{item.detail}</p>
              </div>
              <span className="text-xs text-slate-400">{item.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
