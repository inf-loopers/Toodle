// Optional real-browser acceptance audit using an existing Chromium browser.
// Auth and API fixtures exist only in this isolated browser context. Every API
// request is intercepted, including mutations: no real account data is changed.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(path.join(process.env.B06_BROWSER_TOOLS, 'package.json'));
const { chromium } = require('playwright-core');
const output = process.env.B06_OUTPUT || path.join(os.tmpdir(), 'toodle-b06-results');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.B06_BROWSER,
  headless: true,
});
const context = await browser.newContext();
const page = await context.newPage();
const origin = process.env.B06_ORIGIN || 'http://localhost:5173';
let role = 'admin';
let currentPath = '/dashboard';
let failCourses = false;
const pageErrors = [];
const failedRequests = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400 && !response.url().includes('/api/v1/'))
    failedRequests.push({ url: response.url(), status: response.status() });
});

const eligibility = {
  status: 'eligible',
  missing: [],
  reasons: [],
  approvalReasons: [],
  hoursPerWeek: 2,
};
const course = {
  id: 'c1',
  code: 'COMS3011A',
  name: 'Software Design Project',
  year: 2026,
  semester: 2,
  minMarkRequired: 75,
  requiredTutors: 5,
  applicationsOpen: true,
  coordinators: [],
  sessions: [{ id: 's1', dayOfWeek: 'TUESDAY', startTime: '14:15', endTime: '17:00', type: 'LAB' }],
  eligibility,
};
const user = {
  id: 'u1',
  name: 'Accessibility Audit User',
  email: 'accessibility.acceptance@example.test',
  role: 'TUTOR',
  yearOfStudy: 3,
  maxHoursPerWeek: 10,
  availability: [{ id: 'v1', dayOfWeek: 'TUESDAY', startTime: '08:00', endTime: '18:00' }],
  tutorMarks: [{ courseId: 'c1', mark: 78, status: 'PENDING', course }],
  onboarding: { complete: true, missing: [] },
};
const allocation = {
  id: 'a1',
  userId: 'u1',
  courseId: 'c1',
  status: 'ACTIVE',
  hoursPerWeek: 2,
  user,
  course,
  isLocked: false,
};

await page.route('**/src/AuthShell.jsx*', (request) =>
  request.fulfill({
    contentType: 'application/javascript',
    body: `export { default } from '/src/App.jsx';`,
  })
);
await page.route('**/src/hooks/useAuth.js*', (request) => {
  const profile = {
    ...user,
    role: role.toUpperCase(),
    onboarding: {
      complete: currentPath !== '/onboarding',
      missing: currentPath === '/onboarding' ? ['yearOfStudy', 'availability', 'courseMark'] : [],
    },
  };
  return request.fulfill({
    contentType: 'application/javascript',
    body: `const profile = ${JSON.stringify(profile)};
      export function useAuth() { return {
        user: {...profile, sub: 'auth0|audit'}, dbUser: profile, role: '${role}',
        isAuthenticated: ${role !== 'guest'}, isLoading: false,
        isAdmin: ${role === 'admin'}, isStaff: ${['admin', 'lecturer'].includes(role)},
        isTutor: ${role === 'tutor'}, isStudent: ${role === 'student'},
        isLecturer: ${role === 'lecturer'}, getToken: async () => '',
        updateDbUser: () => {}, logout: async () => {}, login: () => {}
      }; }`,
  });
});
await page.route('**/api/v1/**', async (request) => {
  const endpoint = new URL(request.request().url()).pathname.replace('/api/v1', '');
  if (failCourses && endpoint === '/courses') {
    return request.fulfill({ status: 503, json: { error: 'Course service unavailable' } });
  }
  let data = [];
  if (endpoint === '/auth/me') data = { ...user, role: role.toUpperCase() };
  else if (['/courses', '/courses/opportunities'].includes(endpoint))
    data = [
      course,
      {
        ...course,
        id: 'c2',
        code: 'COMS1015A',
        name: 'Introduction to Data Structures and Algorithms',
      },
    ];
  else if (endpoint === '/courses/c1') data = { ...course, allocations: [allocation] };
  else if (endpoint.endsWith('/eligibility')) data = eligibility;
  else if (endpoint.endsWith('/sessions')) data = course.sessions;
  else if (['/users', '/tutors'].includes(endpoint))
    data = [user, { ...user, id: 'u2', name: 'Second Tutor' }];
  else if (['/allocations', '/swaps/options'].includes(endpoint))
    data = [allocation, { ...allocation, id: 'a2', userId: 'u2', user: { ...user, id: 'u2' } }];
  else if (endpoint === '/overflow-posts')
    data = [
      {
        id: 'p1',
        courseId: 'c1',
        course,
        status: 'OPEN',
        description: 'Cover needed for laboratory session',
        hoursPerWeek: 3,
        claims: [],
        eligibility,
        approvalEligibility: eligibility,
      },
    ];
  else if (endpoint === '/notifications')
    data = [
      {
        id: 'n1',
        title: 'Application needs review',
        body: 'Review the submitted course application.',
        link: '/courses/c1',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];
  else if (endpoint === '/swaps')
    data = [
      {
        id: 'sw1',
        status: 'PENDING',
        requesterId: 'u1',
        requesteeId: 'u2',
        requester: user,
        requestee: { name: 'Second Tutor' },
        requesterAllocation: allocation,
        targetAllocation: allocation,
        validationWarnings: { requester: [], requestee: [] },
      },
    ];
  return request.fulfill({ json: { success: true, data } });
});

async function visit(nextRole, nextPath) {
  role = nextRole;
  currentPath = nextPath;
  await page.goto(origin + nextPath);
  await page.waitForLoadState('networkidle');
  const headingScope = ['/', '/login', '/onboarding'].includes(nextPath)
    ? page
    : page.locator('main');
  await headingScope.locator('h1, h2, h3').first().waitFor();
}

const routes = [
  ['guest', '/'],
  ['guest', '/login'],
  ['admin', '/dashboard'],
  ['student', '/dashboard'],
  ['tutor', '/dashboard'],
  ['student', '/calendar'],
  ['tutor', '/timesheets'],
  ['tutor', '/excusals'],
  ['student', '/courses'],
  ['admin', '/courses'],
  ['student', '/courses/c1'],
  ['admin', '/courses/c1'],
  ['admin', '/allocations'],
  ['admin', '/tutors'],
  ['student', '/volunteers'],
  ['admin', '/volunteers'],
  ['admin', '/reports'],
  ['tutor', '/profile'],
  ['student', '/onboarding'],
  ['tutor', '/swaps'],
  ['admin', '/users'],
];
const results = [];

try {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    for (const [nextRole, nextPath] of routes) {
      await visit(nextRole, nextPath);
      const containment = await page.evaluate(() => ({
        body: document.documentElement.scrollWidth <= innerWidth,
        main: Array.from(document.querySelectorAll('main')).every(
          (element) => element.scrollWidth <= element.clientWidth + 1
        ),
        nestedControls: document.querySelectorAll('a button').length,
        clipped: Array.from(document.querySelectorAll('main button, main input, main select'))
          .filter((element) => {
            // Allocation columns intentionally scroll horizontally inside the board.
            if (element.closest('[data-testid="board-columns"]')) return false;
            const bounds = element.getBoundingClientRect();
            return bounds.width && (bounds.left < -1 || bounds.right > innerWidth + 1);
          })
          .map((element) => element.textContent.trim() || element.getAttribute('aria-label')),
      }));
      assert(containment.body && containment.main, `${width}px ${nextPath}: overflow`);
      assert.deepEqual(containment.clipped, [], `${width}px ${nextPath}: clipped controls`);
      if (nextPath === '/tutors') {
        const rows = page.locator('main button').filter({ hasText: 'marks' });
        assert.equal(await rows.count(), 2, 'Tutor directory retains each tutor');
        const details = await rows.evaluateAll((elements) =>
          elements.map((row) => {
            const bounds = row.getBoundingClientRect();
            return {
              width: bounds.width,
              scrollWidth: row.scrollWidth,
              badges: Array.from(row.querySelectorAll('span'))
                .filter((span) => /marks|h cap/.test(span.textContent))
                .map((span) => ({
                  text: span.textContent,
                  height: span.getBoundingClientRect().height,
                })),
            };
          })
        );
        assert(
          details.every(
            (row) =>
              row.scrollWidth <= row.width + 1 &&
              row.badges.length === 2 &&
              row.badges.every((badge) => badge.height > 0)
          ),
          'Marks and hours are visible without overflowing tutor rows'
        );
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        assert.equal(
          await rows.nth(1).evaluate((row) => getComputedStyle(row).borderTopColor),
          'rgb(38, 56, 77)',
          'Tutor divider uses the dark theme border'
        );
        if (width === 360)
          await page.screenshot({ path: path.join(output, 'tutors-dark-360.png'), fullPage: true });
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
      }
      if (nextPath === '/allocations') {
        const generate = page.getByRole('button', { name: 'Generate Allocation', exact: true });
        const bounds = await generate.boundingBox();
        assert(
          bounds.x >= 0 && bounds.x + bounds.width <= width,
          'Generate allocation fits the page'
        );
        assert(await generate.isEnabled(), 'Integrated generation workflow is available');
        for (const dark of [false, true]) {
          await page.evaluate(
            (enabled) => document.documentElement.classList.toggle('dark', enabled),
            dark
          );
          await page.waitForFunction(
            (element) =>
              getComputedStyle(element).color ===
              getComputedStyle(document.querySelector('main .text-primary')).color,
            await generate.elementHandle()
          );
          assert.equal(
            await generate.evaluate((element) => getComputedStyle(element).color),
            await page
              .locator('main .text-primary')
              .first()
              .evaluate((element) => getComputedStyle(element).color),
            'Generate label uses the existing assignment-action color in both themes'
          );
        }
        if (width === 360) {
          const importBounds = await page
            .getByRole('button', { name: 'Import Timetable', exact: true })
            .boundingBox();
          assert.equal(bounds.y, importBounds.y, 'Allocation actions share one mobile row');
          assert(bounds.x >= importBounds.x + importBounds.width, 'Generate sits beside Import');
          assert(
            bounds.height >= 44 && importBounds.height >= 44,
            'Mobile actions retain accessible touch targets'
          );
          const chips = await page
            .getByText('Available Tutors', { exact: true })
            .evaluate((label) =>
              Array.from(label.parentElement.parentElement.children).map((card) => {
                const bounds = card.getBoundingClientRect();
                return { top: bounds.top, height: bounds.height };
              })
            );
          assert(
            chips.every((chip) => chip.height <= 100),
            'Allocation statistics stay compact'
          );
          assert.equal(chips[0].top, chips[1].top, 'Allocation stats first row');
          assert.equal(chips[2].top, chips[3].top, 'Allocation stats second row');
          await page.screenshot({
            path: path.join(output, 'allocation-board-dark-360.png'),
            fullPage: true,
          });
        }
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
      }
      const featureClose = page.getByRole('link', { name: /^Close .+ and return to Dashboard$/ });
      const topLevelFeature = [
        '/courses',
        '/volunteers',
        '/calendar',
        '/timesheets',
        '/allocations',
        '/tutors',
        '/reports',
        '/profile',
        '/swaps',
        '/excusals',
        '/users',
      ].includes(nextPath);
      if (topLevelFeature && width === 360) {
        await featureClose.waitFor({ state: 'visible' });
        const closeBounds = await featureClose.boundingBox();
        assert(closeBounds.width >= 44 && closeBounds.height >= 44, 'Feature close touch target');
        await featureClose.focus();
        assert.notEqual(
          await featureClose.evaluate((element) => getComputedStyle(element).outlineStyle),
          'none',
          'Feature close focus is visible'
        );
        await page.keyboard.press('Enter');
        await page.waitForURL('**/dashboard');
        await visit(nextRole, nextPath);
      } else {
        assert.equal(
          await featureClose.count(),
          0,
          'No visible dashboard-close control on desktop, dashboard or nested pages'
        );
      }
      if (nextRole === 'student' && nextPath === '/dashboard') {
        const summary = await page
          .getByText('Open Opportunities', { exact: true })
          .evaluate((label) => {
            const grid = label.closest('.grid');
            return Array.from(grid.children).map((card) => {
              const bounds = card.getBoundingClientRect();
              return {
                top: bounds.top,
                left: bounds.left,
                height: bounds.height,
                padding: getComputedStyle(card).paddingTop,
              };
            });
          });
        assert.equal(summary[0].top, summary[1].top, 'Student summary cards share a row');
        assert(summary[1].left > summary[0].left, 'Student summary cards sit side by side');
        if (width === 360) {
          assert(
            summary.every((card) => card.height <= 132),
            'Mobile summary cards stay compact'
          );
          const heading = await page
            .getByRole('heading', { name: 'Overflow work', exact: true })
            .boundingBox();
          const firstPost = await page.getByText('COMS3011A', { exact: true }).boundingBox();
          assert(
            heading.y < 500 && firstPost.y + firstPost.height < 640,
            'Overflow preview is visible in the initial phone viewport'
          );
          const browse = await page.getByRole('link', { name: 'Browse all' }).boundingBox();
          assert(browse.height >= 44, 'Mobile browse action retains a 44px touch target');
          await page.screenshot({
            path: path.join(output, 'student-dashboard-360.png'),
            fullPage: true,
          });
        } else {
          assert(
            summary.every((card) => card.padding === '20px'),
            'Tablet and desktop summary padding is preserved'
          );
        }
      }
      if (nextRole === 'admin' && nextPath === '/dashboard') {
        const summary = await page
          .getByText('Unfilled Courses', { exact: true })
          .evaluate((label) =>
            Array.from(label.closest('.grid').children).map((card) => {
              const bounds = card.getBoundingClientRect();
              return {
                top: bounds.top,
                left: bounds.left,
                height: bounds.height,
                padding: getComputedStyle(card).paddingTop,
              };
            })
          );
        assert.equal(summary.length, 4, 'Staff dashboard retains all four statistics');
        const courseRows = await page
          .getByText('Needs tutor', { exact: true })
          .evaluateAll((badges) =>
            badges.map((badge) => ({
              rowHeight: badge.parentElement.getBoundingClientRect().height,
              badgeHeight: badge.getBoundingClientRect().height,
              nowrap: getComputedStyle(badge).whiteSpace,
              contained: badge.parentElement.scrollWidth <= badge.parentElement.clientWidth,
            }))
          );
        assert(
          courseRows.every((row) => row.rowHeight === courseRows[0].rowHeight),
          'Course preview rows have equal heights despite different name lengths'
        );
        assert(
          courseRows.every(
            (row) =>
              row.nowrap === 'nowrap' &&
              row.contained &&
              row.badgeHeight === courseRows[0].badgeHeight
          ),
          'Needs tutor badges stay on one line without overflow'
        );
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        const rowContrast = await page.getByText('COMS3011A', { exact: true }).evaluate((code) => {
          const row = code.parentElement.parentElement;
          const rgb = (color) =>
            color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
          const luminance = (color) =>
            rgb(color)
              .map((value) => {
                const channel = value / 255;
                return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
              })
              .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const background = getComputedStyle(row).backgroundColor;
          const backgroundLuminance = luminance(background);
          return {
            background,
            ratios: Array.from(row.querySelectorAll('p')).map((text) => {
              const foreground = luminance(getComputedStyle(text).color);
              return (
                (Math.max(foreground, backgroundLuminance) + 0.05) /
                (Math.min(foreground, backgroundLuminance) + 0.05)
              );
            }),
          };
        });
        assert.equal(rowContrast.background, 'rgb(23, 36, 58)', 'Staff rows use a dark surface');
        assert(
          rowContrast.ratios.every((ratio) => ratio >= 4.5),
          'Staff course names and codes have readable dark-mode contrast'
        );
        if (width === 360)
          await page.screenshot({
            path: path.join(output, 'staff-dashboard-dark-360.png'),
            fullPage: true,
          });
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
        if (width === 360) {
          assert(
            summary.every((card) => card.height <= 132),
            'Staff mobile statistics stay compact'
          );
          assert.equal(summary[0].top, summary[1].top, 'First staff summary row');
          assert.equal(summary[2].top, summary[3].top, 'Second staff summary row');
          assert(
            summary[2].top > summary[0].top && summary[1].left > summary[0].left,
            'Staff statistics use a two-column mobile grid'
          );
          await page.screenshot({
            path: path.join(output, 'staff-dashboard-360.png'),
            fullPage: true,
          });
        } else {
          assert(
            summary.every((card) => card.padding === '20px'),
            'Staff tablet and desktop padding stays unchanged'
          );
        }
      }
      assert.equal(
        containment.nestedControls,
        0,
        `${width}px ${nextPath}: nested navigation controls`
      );
      results.push({ width, role: nextRole, path: nextPath, status: 'PASS' });
    }
    console.log(`PASS: ${width}px page containment`);

    await visit('admin', '/courses');
    const search = page.getByRole('textbox', { name: 'Search courses' });
    await search.focus();
    assert.notEqual(
      await search.evaluate((element) => getComputedStyle(element.parentElement).boxShadow),
      'none',
      'Search focus must be visible'
    );

    const bell = page.getByRole('button', { name: /Notifications/ });
    await bell.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('region', { name: /Notifications panel/i });
    await panel.waitFor();
    assert(
      await panel.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight;
      }),
      'Notification panel must fit the viewport'
    );
    await panel.getByRole('button', { name: /Application needs review/ }).focus();
    await page.keyboard.press('Escape');
    assert(await bell.evaluate((element) => element === document.activeElement));

    await visit('admin', '/allocations');
    const lock = page.getByRole('button', { name: 'Lock', exact: true }).first();
    await lock.focus();
    await page.waitForTimeout(250); // Wait for the CSS opacity transition, not application loading.
    assert.equal(
      await lock.evaluate((element) => getComputedStyle(element.parentElement).opacity),
      '1',
      'Allocation actions must be visible on keyboard focus'
    );
    const assign = page.getByRole('button', { name: /Assign tutor/ }).last();
    await assign.focus();
    assert(
      await assign.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth;
      }),
      'Tab focus must scroll the assignment control into view'
    );
    await page.keyboard.press('Enter');
    const assignDialog = page.getByRole('dialog');
    await assignDialog.waitFor();
    assert(await assignDialog.evaluate((element) => element.contains(document.activeElement)));
    await page.keyboard.press('Escape');

    await visit('tutor', '/profile');
    const photo = page.getByLabel('Change profile photo');
    await photo.focus();
    assert(await photo.evaluate((element) => element === document.activeElement));
    assert.notEqual(
      await page
        .locator('label[for="profile-photo"]')
        .evaluate((element) => getComputedStyle(element).outlineStyle),
      'none',
      'Profile photo must have a visible keyboard focus indicator'
    );
    const fileChooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Space');
    assert.equal((await fileChooser).isMultiple(), false);

    await visit('admin', '/courses/c1');
    await page.getByRole('button', { name: 'Import marks (CSV)', exact: true }).click();
    const csv = page.getByLabel('Choose a CSV file');
    await csv.focus();
    assert.notEqual(
      await csv.evaluate((element) => getComputedStyle(element.closest('label')).boxShadow),
      'none',
      'CSV chooser must have a visible keyboard focus indicator'
    );
    await page.keyboard.press('Escape');
  }

  // A short phone viewport reproduces the previously clipped 690px course dialog.
  await page.setViewportSize({ width: 360, height: 640 });
  await visit('admin', '/courses');
  const trigger = page.getByRole('button', { name: 'New course' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'New course' });
  await dialog.waitFor();
  assert(
    await dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.top >= 0 &&
        bounds.bottom <= innerHeight &&
        element.scrollHeight > element.clientHeight
      );
    }),
    'Long dialog must fit the viewport and scroll'
  );
  assert(await dialog.evaluate((element) => element.contains(document.activeElement)));
  const close = dialog.getByRole('button', { name: 'Close', exact: true });
  const save = dialog.getByRole('button', { name: 'Create course', exact: true });
  await save.focus();
  await page.keyboard.press('Tab');
  assert(await close.evaluate((element) => element === document.activeElement));
  await page.keyboard.press('Shift+Tab');
  assert(await save.evaluate((element) => element === document.activeElement));
  await page.keyboard.press('Enter');
  await dialog.getByRole('alert').waitFor();
  assert(await dialog.getByRole('textbox', { name: 'Course code' }).isEditable());
  await page.keyboard.press('Escape');
  assert(await trigger.evaluate((element) => element === document.activeElement));

  await visit('admin', '/dashboard');
  const openNav = page.getByRole('button', { name: 'Open sidebar' });
  await openNav.focus();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    assert(
      await page.evaluate(() => !document.activeElement.closest('[data-testid="app-sidebar"]')),
      'Closed mobile navigation must not receive Tab focus'
    );
  }
  await openNav.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Main navigation' });
  await drawer.waitFor();
  assert(await drawer.evaluate((element) => element.contains(document.activeElement)));
  await page.keyboard.press('Shift+Tab');
  assert(await drawer.evaluate((element) => element.contains(document.activeElement)));
  await page.keyboard.press('Escape');
  assert(await openNav.evaluate((element) => element === document.activeElement));

  // Real page error/retry control exercised with keyboard, not just a primitive.
  failCourses = true;
  await visit('admin', '/courses');
  const retry = page.getByRole('button', { name: 'Try again', exact: true });
  await retry.waitFor();
  failCourses = false;
  await retry.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Search courses' }).waitFor();

  // Original route guards remain active despite the browser-only auth fixture.
  await visit('student', '/users');
  assert.equal(await page.getByRole('textbox', { name: 'Search users' }).count(), 0);
  assert.match(await page.locator('body').innerText(), /permission|access/i);

  assert.deepEqual(pageErrors, [], 'No uncaught rendering errors');
  assert.deepEqual(failedRequests, [], 'No failed frontend module requests');
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(
    `PASS: ${results.length} viewport/role/page checks, keyboard/dialog/error checks. ${output}`
  );
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  await writeFile(path.join(output, 'failure.txt'), await page.locator('body').innerText());
  await writeFile(
    path.join(output, 'failure.json'),
    JSON.stringify({ role, currentPath, pageErrors, failedRequests }, null, 2)
  );
  throw error;
} finally {
  await browser.close();
}
