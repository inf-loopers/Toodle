# B07 — Performance Verification & Optimisation

This document records the frontend performance work for card **B07**, explains
**how to measure performance with Lighthouse** (so the team and the lecturer can
reproduce the numbers), and stores the **before/after evidence**.

Scope: the Toodle Vite/React SPA only (`Toodle/`). Core behaviour, role-based
routing and navigation are intentionally unchanged — see the verification
checklist at the bottom.

---

## 1. How to measure performance with Lighthouse

Lighthouse audits a **running production build**, not the dev server. The dev
server (`npm run dev`) is unminified and serves unbundled modules, so its numbers
are not representative. Always measure the built site.

### Step 1 — Build and serve the production site

From the `Toodle/` directory:

```bash
npm run build      # produces the optimised dist/ bundle
npm run preview    # serves dist/ at http://localhost:4173
```

Leave `npm run preview` running in its own terminal.

> The preview server prints the URL it is listening on (Vite defaults to
> `http://localhost:4173`). Use that URL in the steps below.

### Step 2 — Run Lighthouse in Chrome DevTools (easiest, no install)

1. Open the preview URL in **Chrome** (or Edge).
2. Open DevTools: `F12` (or `Ctrl+Shift+I`).
3. Click the **Lighthouse** tab (if hidden, click the `»` overflow tab).
4. Choose **Mode: Navigation**, tick the **Performance** category (you can also
   tick Accessibility/SEO/Best Practices).
5. Select the **Device: Desktop** _and_ run once for **Mobile** — the mobile run
   is the stricter, more meaningful score.
6. Click **Analyze page load**.

Lighthouse reports a 0–100 Performance score plus the core metrics:

| Metric                             | What it measures                                           |
| ---------------------------------- | ---------------------------------------------------------- |
| **FCP** (First Contentful Paint)   | first pixel painted                                        |
| **LCP** (Largest Contentful Paint) | when the biggest element (here, the hero image) is visible |
| **TBT** (Total Blocking Time)      | main-thread work that blocks interaction                   |
| **CLS** (Cumulative Layout Shift)  | visual stability / unexpected layout jumps                 |
| **Speed Index**                    | how fast content appears to load                           |

Expand the **Diagnostics** and **"Treemap"**/_"Reduce unused JavaScript"_ and
_"Use efficient image formats"_ audits to see the byte-level detail.

### Step 2 (alternative) — Lighthouse from the command line

If you prefer a repeatable, scriptable run (produces an HTML/JSON report):

```bash
npx --yes lighthouse http://localhost:4173/ \
  --only-categories=performance \
  --preset=desktop \
  --output=html --output=json \
  --output-path=./lighthouse-landing \
  --chrome-flags="--headless=new"
```

This writes `lighthouse-landing.report.html` and `.report.json`. Repeat with
`--form-factor=mobile` (drop `--preset=desktop`) for the mobile score, and change
the URL path to audit other routes (e.g. `/dashboard`, `/allocations`).

> Authenticated routes (`/dashboard`, `/courses`, `/allocations`, …) sit behind
> Auth0. To audit them, log in through the browser first and run the DevTools
> Lighthouse on the live page, or audit the public landing page (`/`) which needs
> no login.

### Step 3 — Measuring JavaScript bundle sizes (no browser needed)

`npm run build` prints every emitted chunk with its raw and gzip size. This is
the fastest, most objective before/after evidence and needs no Lighthouse run:

```bash
npm run build
```

Compare the `dist/assets/*.js` sizes against the baseline in section 3.

### Tips for fair, comparable measurements

- Measure the **same route**, same **device mode**, and same **network/CPU
  throttling** each time (Lighthouse defaults: Mobile = 4x CPU slowdown + slow
  4G).
- Run **3 times and take the median**; single runs vary by a few points.
- Use an **incognito window** so extensions and cached service workers do not
  skew results.
- Close other heavy tabs; Lighthouse is sensitive to machine load.
- Always compare **production builds** (`preview`), never `npm run dev`.

---

## 2. What was changed

### 2.1 Route-level code splitting (lazy loading)

Previously only `CalendarPage` was lazy-loaded; every other page (including the
988-line `AllocationBoardPage`, 879-line `TimesheetsPage`, dashboards, reports,
etc.) was eagerly imported into a single ~924 kB main bundle.

Now **every authenticated page is lazy-loaded** in
[`src/routes/AppRoutes.jsx`](../src/routes/AppRoutes.jsx) via
`React.lazy(() => import(...))`, so each page becomes its own on-demand chunk.
Public entry routes (landing, login, callback, 404) stay eager for a fast first
paint.

A single `<Suspense>` boundary was added around the `<Outlet/>` in
[`src/components/layout/PageLayout.jsx`](../src/components/layout/PageLayout.jsx),
so navigating to a not-yet-loaded page shows an in-shell spinner while keeping
the navbar and sidebar mounted (no blank full-page flash). `/onboarding` (which
renders outside the shell) has its own `<Suspense>`.

### 2.2 Vendor chunking

[`vite.config.js`](../vite.config.js) now defines `build.rollupOptions.output.manualChunks`,
splitting third-party code into stable, cacheable chunks:
`vendor-react`, `vendor-auth0`, `vendor-router`, `vendor-axios`, `vendor-icons`,
`vendor-motion`, `vendor-dnd` (dnd-kit) and `vendor-calendar` (FullCalendar).
Heavy per-route libraries are only downloaded when the relevant route loads —
`vendor-dnd` on `/allocations`, `vendor-calendar` on `/calendar`.

### 2.3 Image optimisation (WebP + correct sizing)

The landing hero and the app logo were shipped as oversized PNGs (1001 kB and
533 kB). They are now re-encoded to WebP, and the logo — displayed at only
36–64 px — is downscaled from 1254×1254 to 256×256.

A reproducible helper, [`scripts/optimize-images.mjs`](../scripts/optimize-images.mjs)
(run with `npm run images:optimize`, uses `sharp`), regenerates the optimised
assets; the outputs are committed so CI does not need `sharp` at build time:

- `src/assets/toodle_hero_part1.webp` — hero, WebP
- `src/assets/toodle_logo_256.webp` / `toodle_logo_256.png` — logo, WebP + PNG fallback

A new shared component
[`src/components/ui/AppLogo.jsx`](../src/components/ui/AppLogo.jsx) renders the
logo inside a `<picture>` (WebP `<source>` + PNG `<img>` fallback) with square
`width`/`height` attributes to reserve aspect ratio (prevents CLS). It replaced
the raw `<img>` in the navbar, landing navbar, login and onboarding pages. The
hero uses the same `<picture>` pattern with `fetchPriority="high"` (it is the LCP
element) and explicit dimensions.

The original PNG masters stay in `src/assets` as the source of truth; the 533 kB
master logo is no longer imported, so it is no longer emitted to `dist/`.

### 2.4 Removed an unnecessary repeated request

The tutor dashboard (`TutorDashboard` in
[`src/pages/DashboardPage.jsx`](../src/pages/DashboardPage.jsx)) called
`usersApi.getCurrentUser()` (`GET /users/me`) on every load, even though
`AuthProvider` already fetches that exact profile once at login and exposes it as
`dbUser` through `useAuth()`. The dashboard now reuses `dbUser`, removing one
redundant round-trip per tutor dashboard view. Behaviour is identical because
both values come from the same `/auth/me` response.

---

## 3. Before / after evidence

### 3.1 Build output (objective, `npm run build`)

**Before** (single eager bundle; only calendar split):

| Chunk                                                      | Raw           | gzip          |
| ---------------------------------------------------------- | ------------- | ------------- |
| `index.js` (main, all pages + all vendors except calendar) | **923.78 kB** | **276.70 kB** |
| `CalendarPage.js`                                          | 277.23 kB     | 82.70 kB      |
| `index.css`                                                | 68.49 kB      | 12.31 kB      |
| `toodle_hero_part1.png`                                    | 1001.43 kB    | —             |
| `toodle_tutor_management_logo.png`                         | 533.32 kB     | —             |

**After** (route-split + vendor chunks; entry chunk highlighted):

| Chunk                            | Raw              | gzip         | Loaded on               |
| -------------------------------- | ---------------- | ------------ | ----------------------- |
| **`index.js` (app entry)**       | **87.23 kB**     | **25.56 kB** | every route             |
| `vendor-react`                   | 211.61 kB        | 67.20 kB     | every route             |
| `vendor-auth0`                   | 216.62 kB        | 62.80 kB     | every route             |
| `vendor-router`                  | 37.84 kB         | 13.68 kB     | every route             |
| `vendor-axios`                   | 48.54 kB         | 18.63 kB     | every route             |
| `vendor-icons`                   | 29.04 kB         | 6.13 kB      | every route             |
| `vendor-motion`                  | 127.82 kB        | 41.80 kB     | landing (framer-motion) |
| `vendor-dnd`                     | 43.48 kB         | 14.44 kB     | **only `/allocations`** |
| `vendor-calendar`                | 250.60 kB        | 72.57 kB     | **only `/calendar`**    |
| `AllocationBoardPage.js`         | 26.65 kB         | 8.32 kB      | `/allocations`          |
| `CourseDetailPage.js`            | 24.76 kB         | 7.45 kB      | `/courses/:id`          |
| `TimesheetsPage.js`              | 12.14 kB         | 3.88 kB      | `/timesheets`           |
| `DashboardPage.js`               | 11.14 kB         | 3.03 kB      | `/dashboard`            |
| other page chunks                | 4.7–10.6 kB each | —            | their route             |
| `index.css`                      | 68.49 kB         | 12.31 kB     | every route             |
| `toodle_hero_part1.webp`         | 127.79 kB        | —            | landing                 |
| `toodle_logo_256.webp`           | 13.37 kB         | —            | every route (navbar)    |
| `toodle_logo_256.png` (fallback) | 30.02 kB         | —            | non-WebP browsers only  |

**Main app entry chunk: 923.78 kB → 87.23 kB (−90.6%); gzip 276.70 → 25.56 kB (−90.8%).**

### 3.2 Landing page (`/`) total transfer weight

JS + CSS + images actually downloaded by a modern (WebP-capable) browser:

|            | Before           | After            | Change   |
| ---------- | ---------------- | ---------------- | -------- |
| JavaScript | 923.78 kB        | ~758.7 kB        | −18%     |
| CSS        | 68.49 kB         | 68.49 kB         | —        |
| Hero image | 1001.43 kB (PNG) | 127.79 kB (WebP) | −87%     |
| Logo       | 533.32 kB (PNG)  | 13.37 kB (WebP)  | −97%     |
| **Total**  | **~2.47 MB**     | **~0.95 MB**     | **−62%** |

The hero (LCP element) dropping from ~1 MB to ~128 kB is the single largest
Lighthouse win: it directly improves **LCP**, **Total Byte Weight**, and clears
the _"Use efficient image formats"_ and _"Properly size images"_ audits. The
`vendor-calendar` (250 kB) and `vendor-dnd` (43 kB) chunks are no longer part of
any initial load — they are fetched only on `/calendar` and `/allocations`.

### 3.3 Image conversion log (`npm run images:optimize`)

```
toodle_hero_part1.png (978.0 kB) -> toodle_hero_part1.webp (124.8 kB)
toodle_tutor_management_logo.png (520.8 kB) -> toodle_logo_256.webp (13.1 kB) + toodle_logo_256.png (29.3 kB) fallback
```

### 3.4 Recording your own Lighthouse before/after

To attach Lighthouse reports as evidence:

1. `git stash` (or check out `main`) → `npm run build && npm run preview`.
2. Run Lighthouse (section 1) on `/` for Mobile and Desktop; export/save the HTML
   reports as `lighthouse-BEFORE-*.html`.
3. `git stash pop` (or check out this branch) → rebuild → re-run on the same
   routes/settings; save as `lighthouse-AFTER-*.html`.
4. Compare the Performance scores and the FCP/LCP/TBT/CLS metrics.

---

## 4. Verification — no regressions

Card B07 requires that core behaviour, permissions and navigation are unchanged.

- **Automated tests:** full frontend suite passes — **187 tests / 30 files**
  (`npm test`). Two new suites were added for this work:
  - `tests/app-logo.test.jsx` — asserts the `<picture>` serves WebP with a PNG
    fallback and forwards `alt`/`className`/square dimensions.
  - `tests/dashboard-tutor-profile.test.jsx` — asserts the tutor dashboard reuses
    the auth-context profile and does **not** issue `getCurrentUser()`.
- **Lint:** `npm run lint` clean.
- **Role-based routing:** unchanged — `ProtectedRoute` / `allowedRoles` rules in
  `AppRoutes.jsx` are identical; only the page _elements_ became lazy. Existing
  routing/role tests still pass.
- **Navigation:** unchanged — same paths and route tree; lazy pages resolve
  through the `PageLayout` Suspense boundary, so links behave as before (with a
  brief spinner on first visit to a chunk).
- **Core workflows:** dashboards, courses, allocation board, timesheets, swaps,
  volunteers, reports, users, calendar, profile and onboarding all render through
  their existing components; only their loading mechanism changed.

> Note on Prettier: `npm run format:check` may report CRLF warnings for many
> files when run on Windows. This is a local line-ending artifact (the committed
> blobs are LF and CI on Linux passes); it is not caused by these changes.
