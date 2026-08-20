/**
 * @file LandingPage.jsx
 * @description Public marketing landing page for the Toodle tutor management platform.
 *
 * Responsibilities:
 * - Hero section with gradient background, headline, and primary CTA.
 * - Feature highlights showcasing core capabilities.
 * - Stats/social proof bar for credibility.
 * - Footer with copyright and links.
 * - "Get Started" / "Open Dashboard" CTA triggers `onEnter` prop to navigate into the app.
 *
 * Route: `/` (public)
 */

const features = [
  {
    icon: "▦",
    title: "Smart Allocation Board",
    description:
      "Assign tutors to courses with automatic constraint checking for timetables, eligibility, and weekly hour limits.",
  },
  {
    icon: "♙",
    title: "Tutor Directory",
    description:
      "Browse, filter, and manage your full tutor roster — qualifications, availability, and assignment history in one place.",
  },
  {
    icon: "◷",
    title: "Timesheets & Hours",
    description:
      "Track allocated hours per tutor with real-time budget progress and overtime warnings before they happen.",
  },
  {
    icon: "⚡",
    title: "Instant Generation",
    description:
      "Generate optimal allocations in seconds using rule-based matching — no more manual spreadsheets.",
  },
];

const stats = [
  { value: "1,200+", label: "Allocations made" },
  { value: "98%", label: "Tutor satisfaction" },
  { value: "24", label: "Active courses" },
  { value: "4.8★", label: "Avg. rating" },
];

export default function LandingPage({ onEnter }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
              T
            </div>
            <span className="text-lg font-bold tracking-tight">Toodle</span>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blue-600">
              Wits SDP
            </span>
          </div>

          {/* Nav links + CTA */}
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="hidden text-sm font-medium text-slate-500 transition hover:text-slate-900 sm:block"
            >
              Features
            </a>
            <a
              href="#stats"
              className="hidden text-sm font-medium text-slate-500 transition hover:text-slate-900 sm:block"
            >
              Impact
            </a>
            <button
              onClick={onEnter}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Open Dashboard →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Decorative blobs */}
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-24 text-center sm:pt-32 sm:pb-32">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            2026 Academic Year · School of Computer Science
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Tutor allocation,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              done right.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Toodle replaces spreadsheets and guesswork with a smart allocation
            board — matching tutors to courses while respecting timetables,
            eligibility, and hour budgets.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={onEnter}
              className="w-full rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-900 shadow-xl shadow-white/10 transition hover:bg-slate-100 sm:w-auto"
            >
              Get Started — It's Free
            </button>
            <a
              href="#features"
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
            >
              See Features ↓
            </a>
          </div>

          {/* Mock app preview strip */}
          <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur">
            <div className="rounded-xl bg-slate-800/80 px-6 py-4">
              {/* Mini nav dots */}
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-4 text-xs text-slate-500">toodle.app/dashboard</span>
              </div>

              {/* Mini stat row */}
              <div className="grid grid-cols-4 gap-3">
                {["24 Courses", "68 Tutors", "52 Assigned", "4 Alerts"].map(
                  (stat) => (
                    <div
                      key={stat}
                      className="rounded-lg bg-white/5 px-3 py-2 text-center"
                    >
                      <p className="text-xs font-semibold text-slate-300">
                        {stat.split(" ")[0]}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {stat.split(" ").slice(1).join(" ")}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Mini table rows */}
              <div className="mt-3 space-y-2">
                {["COMS3011A · Thabo M.", "COMS3012A · Sarah N.", "COMS3014A · Unassigned"].map(
                  (row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400"
                    >
                      <span>{row}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          row.includes("Unassigned")
                            ? "bg-red-500/20 text-red-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {row.includes("Unassigned") ? "Open" : "Assigned"}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Platform Features
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage tutors
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-500">
            From allocation to reporting — Toodle covers the full lifecycle of
            academic tutor management.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              {/* Subtle gradient on hover */}
              <div className="pointer-events-none absolute inset-0 translate-y-full bg-gradient-to-t from-blue-50/60 to-transparent transition-transform group-hover:translate-y-0" />

              <div className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section
        id="stats"
        className="border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center bg-white px-6 py-10 text-center"
            >
              <p className="text-3xl font-extrabold text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 px-8 py-16 shadow-xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to streamline tutor management?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            Join the School of Computer Science and start allocating tutors in
            minutes — no setup required.
          </p>
          <button
            onClick={onEnter}
            className="mt-8 rounded-2xl bg-white px-10 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
          >
            Open Your Dashboard →
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-700 text-[10px] font-bold text-white">
              T
            </div>
            <span className="text-sm font-semibold text-slate-700">
              Toodle
            </span>
            <span className="text-xs text-slate-400">
              © 2026 · Wits School of Computer Science
            </span>
          </div>

          <div className="flex gap-6 text-xs text-slate-400">
            <a href="#" className="transition hover:text-slate-700">
              Privacy
            </a>
            <a href="#" className="transition hover:text-slate-700">
              Terms
            </a>
            <a href="#" className="transition hover:text-slate-700">
              GitHub
            </a>
            <a href="#features" className="transition hover:text-slate-700">
              Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
