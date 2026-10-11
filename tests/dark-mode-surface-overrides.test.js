/**
 * @file dark-mode-surface-overrides.test.js
 * @description Guards the centralised dark-mode override layer in
 * `src/styles/index.css`.
 *
 * Dark mode is implemented as a full override layer: plain Tailwind light-mode
 * utilities (`bg-slate-50`, `bg-white`, …) are re-mapped to dark hex values by
 * selectors scoped to `html.dark .toodle-app`. An opacity-modified utility
 * (`bg-slate-50/60`) compiles to a DIFFERENT escaped class than its plain
 * counterpart, so it silently misses the override and renders as a washed-out
 * grey panel over the dark page — the bug behind the volunteers claim rows and
 * the generate-allocation toolbar. This suite scans the app shell for every
 * light-surface background utility in use and fails if any of them lacks a
 * matching dark override.
 */
import { expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Vitest runs with the repository root as cwd (see the npm `test` script), and
// jsdom replaces import.meta.url with a non-file URL, so cwd is the only
// reliable anchor here.
const SRC_DIR = join(globalThis.process.cwd(), 'src');
const CSS_PATH = join(SRC_DIR, 'styles', 'index.css');

// The landing page renders OUTSIDE `.toodle-app`, so its intentional
// glassmorphism (`bg-white/10`) is not expected to carry a dark override.
const SKIPPED_DIRS = new Set(['LandingPage Components']);

// Light-surface families the override layer is responsible for re-mapping.
// Dark backdrops (`bg-slate-900/50` scrims) are correct in both modes.
const TOKEN_RE = /(?<!dark:)(hover:)?bg-(white|slate-50|slate-100|slate-200)(\/\d+)?(?![\w/-])/g;

const collectSourceFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return SKIPPED_DIRS.has(entry) ? [] : collectSourceFiles(path);
    }
    return /\.(jsx|js)$/.test(entry) ? [path] : [];
  });

/** The escaped selector the override layer must define for a utility token. */
const selectorFor = (prefix, token) => {
  const escaped = token.replace(/\//g, '\\/');
  return prefix === 'hover:' ? `.hover\\:${escaped}:hover` : `.${escaped}`;
};

const scanUsedSurfaceTokens = () => {
  const tokens = new Map(); // token -> { prefix, file }
  for (const file of collectSourceFiles(SRC_DIR)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(TOKEN_RE)) {
      const token = match[0].replace(/^hover:/, '');
      if (!tokens.has(token)) tokens.set(token, { prefix: match[1] ?? '', file });
    }
  }
  return tokens;
};

test('every light-surface background utility used in the app shell has a dark override', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const tokens = scanUsedSurfaceTokens();

  // Sanity: the scan must actually see the known muted-panel surfaces,
  // otherwise a refactor of the regex could vacuously pass the suite.
  expect(tokens.has('bg-slate-50/60')).toBe(true);

  const missing = [];
  for (const [token, { prefix, file }] of tokens) {
    if (!css.includes(selectorFor(prefix, token))) {
      missing.push(`${token} (used in ${file})`);
    }
  }
  expect(missing).toEqual([]);
});

test('the muted panel surface from the volunteers and allocation surfaces is overridden', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  // `bg-slate-50/60` is the class behind the volunteers claim rows, the
  // generate-allocation review toolbar and the allocation board filter row.
  expect(css).toContain('html.dark .toodle-app .bg-slate-50\\/60');
});
