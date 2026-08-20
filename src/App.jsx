import { useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import SessionSwapPage from "./pages/SessionSwapPage";
import TutorsPage from "./pages/TutorsPage";
import CoursesPage from "./pages/CoursesPage";
import TimesheetsPage from "./pages/TimesheetsPage";
import VolunteersPage from "./pages/VolunteersPage";
import ReportsPage from "./pages/ReportsPage";

const pageComponents = {
  Dashboard: DashboardPage,
  Swaps: SessionSwapPage,
  Tutors: TutorsPage,
  Courses: CoursesPage,
  Timesheets: TimesheetsPage,
  Volunteers: VolunteersPage,
  Reports: ReportsPage,
};

const allocations = [
  {
    course: "COMS3011A",
    name: "Data Structures",
    tutor: "Thabo Mokoena",
    session: "Monday · 10:00–12:00",
    hours: 2,
    status: "Assigned",
    locked: true,
  },
  {
    course: "COMS3012A",
    name: "Database Systems",
    tutor: "Sarah Nkosi",
    session: "Tuesday · 12:00–14:00",
    hours: 2,
    status: "Assigned",
    locked: false,
  },
  {
    course: "COMS3013A",
    name: "Operating Systems",
    tutor: "Liam Smith",
    session: "Wednesday · 09:00–11:00",
    hours: 2,
    status: "Assigned",
    locked: false,
  },
  {
    course: "COMS3014A",
    name: "Computer Networks",
    tutor: null,
    session: "Thursday · 14:00–16:00",
    hours: 2,
    status: "Unassigned",
    locked: false,
  },
  {
    course: "COMS3015A",
    name: "Software Engineering",
    tutor: "Ayesha Khan",
    session: "Friday · 10:00–12:00",
    hours: 2,
    status: "Assigned",
    locked: false,
  },
];

const navSections = [
  {
    heading: "Overview",
    items: [
      { name: "Dashboard", icon: "⌂" },
    ],
  },
  {
    heading: "Manage",
    items: [
      { name: "Allocation", icon: "▦" },
      { name: "Tutors", icon: "♙" },
      { name: "Courses", icon: "▤" },
    ],
  },
  {
    heading: "Tutor Tools",
    items: [
      { name: "Timesheets", icon: "◷" },
      { name: "Swaps", icon: "⇄", badge: "1" },
    ],
  },
  {
    heading: "Admin",
    items: [
      { name: "Volunteers", icon: "♧" },
      { name: "Reports", icon: "▥" },
    ],
  },
];

function StatCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <div className="mt-2 flex items-end justify-between">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>

      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [showLanding, setShowLanding] = useState(true);

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">
              T
            </div>

            <div>
              <h1 className="text-lg font-bold">Toodle</h1>
              <p className="text-xs text-slate-400">Tutor Management</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-6">
            {navSections.map((section) => (
              <div key={section.heading} className="sidebar-section">
                <p className="sidebar-heading">{section.heading}</p>

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = activePage === item.name;

                    return (
                      <button
                        key={item.name}
                        onClick={() => setActivePage(item.name)}
                        className={`sidebar-nav-item${active ? " active" : ""}`}
                      >
                        <span className="icon-box">{item.icon}</span>
                        {item.name}
                        {item.badge && (
                          <span className="sidebar-badge">{item.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-400">API</p>
              <p className="mt-1 truncate text-xs text-slate-600">
                localhost:3000/api/v1
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          {/* Header */}
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-8">
            <div>
              <p className="text-sm text-slate-400">School of Computer Science</p>
              <h2 className="font-semibold">{activePage}</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 md:flex">
                <span className="mr-2 text-slate-400">⌕</span>
                <input
                  className="w-48 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Search..."
                />
              </div>

              <button className="relative rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50">
                🔔
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  KO
                </div>

                <div className="hidden lg:block">
                  <p className="text-sm font-semibold">Kwezi</p>
                  <p className="text-xs text-slate-400">Organiser</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 lg:p-8">
            {pageComponents[activePage] ? (
              (() => { const Page = pageComponents[activePage]; return <Page />; })()
            ) : (
            <>
            {/* Page heading */}
            <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  2026 Academic Year
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  Allocation Board
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Assign tutors to courses while checking marks, availability
                  and weekly hours.
                </p>
              </div>

              <div className="flex gap-3">
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  Import Timetable
                </button>

                <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">
                  ✨ Generate Allocation
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Courses"
                value="24"
                description="Courses requiring tutors"
              />

              <StatCard
                label="Available Tutors"
                value="68"
                description="Tutors available this term"
              />

              <StatCard
                label="Assigned"
                value="52"
                description="Assignments currently made"
              />

              <StatCard
                label="Unfilled"
                value="4"
                description="Courses still needing tutors"
              />
            </div>

            {/* Allocation board */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
                <div>
                  <h2 className="font-semibold">Current Allocations</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Review and adjust tutor assignments.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                    Filter
                  </button>

                  <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                    Sort
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4">Course</th>
                      <th className="px-5 py-4">Tutor</th>
                      <th className="px-5 py-4">Session</th>
                      <th className="px-5 py-4">Hours</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {allocations.map((allocation) => (
                      <tr
                        key={allocation.course}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {allocation.course}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {allocation.name}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {allocation.tutor ? (
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                {allocation.tutor
                                  .split(" ")
                                  .map((word) => word[0])
                                  .join("")}
                              </div>

                              <div>
                                <p className="text-sm font-medium">
                                  {allocation.tutor}
                                </p>
                                <p className="text-xs text-emerald-600">
                                  Eligible
                                </p>
                              </div>
                            </div>
                          ) : (
                            <button className="rounded-lg border border-dashed border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                              + Assign tutor
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {allocation.session}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium">
                          {allocation.hours}h
                        </td>

                        <td className="px-5 py-4">
                          {allocation.status === "Assigned" ? (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Assigned
                              </span>

                              {allocation.locked && (
                                <span title="Locked">🔒</span>
                              )}
                            </div>
                          ) : (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Needs tutor
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <button className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Bottom cards */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Allocation Warnings</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Things that need your attention.
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    3 warnings
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      COMS3014A has no tutor
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      2 hours still need to be allocated.
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Timetable clash detected
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      One proposed assignment overlaps with a tutor's
                      timetable.
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Weekly hours nearly full
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Sarah Nkosi has only 2 hours remaining.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="font-semibold">Upcoming Sessions</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Sessions happening soon.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    ["Today", "COMS3011A", "10:00–12:00", "Thabo Mokoena"],
                    ["Tomorrow", "COMS3012A", "12:00–14:00", "Sarah Nkosi"],
                    ["Wed", "COMS3013A", "09:00–11:00", "Liam Smith"],
                  ].map(([day, course, time, tutor]) => (
                    <div
                      key={course}
                      className="flex items-center gap-4 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="w-16 text-center">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          {day}
                        </p>
                      </div>

                      <div className="h-9 w-px bg-slate-200" />

                      <div>
                        <p className="text-sm font-semibold">{course}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {time} · {tutor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;