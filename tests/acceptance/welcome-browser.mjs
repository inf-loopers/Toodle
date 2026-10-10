// Isolated public welcome acceptance: no real authentication or data mutations.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(path.join(process.env.B06_BROWSER_TOOLS, 'package.json'));
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: process.env.B06_BROWSER, headless: true });
const output = path.join(os.tmpdir(), 'toodle-welcome-results');
await mkdir(output, { recursive: true });
async function createContext(options) {
  const context = await browser.newContext(options);
  // External font delivery must not make isolated acceptance captures flaky.
  // Use the application's existing system-font fallback consistently.
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await context.route('**/src/AuthShell.jsx*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export { default } from '/src/App.jsx';",
    })
  );
  await context.route('**/src/hooks/useAuth.js*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export const useAuth = () => ({ isAuthenticated: false, isLoading: false, getToken: async () => '', login: async (options) => { window.__welcomeLogin = options; if (window.__failWelcomeLogin) throw new Error('Test redirect failure'); } });",
    })
  );
  return context;
}
try {
  for (const [width, height] of [
    [360, 636],
    [360, 568],
    [768, 1024],
    [1440, 900],
    [844, 390],
    [320, 480],
  ]) {
    const context = await createContext({
      viewport: { width, height },
      deviceScaleFactor: width === 1440 ? 2 : 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.error(`${width}x${height} browser error: ${error.message}`);
    });
    const captureStages = (width === 360 && height === 636) || width === 1440 || width === 320;
    if (captureStages) await page.clock.install();
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.locator('.welcome-intro.is-playing').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Skip animation' }).count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Contact Support' }).count(), 0);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight > innerHeight),
      false,
      `${width}x${height} intro vertical overflow`
    );
    if (captureStages) {
      await page.locator('.welcome-intro[data-intro-ready="true"]').waitFor();
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
      const seek = async (time) => {
        await page.evaluate((time) => {
          for (const animation of document.getAnimations()) {
            animation.pause();
            animation.currentTime = time;
          }
        }, time);
        await page.clock.runFor(32);
      };
      const brandBounds = () =>
        page.locator('.welcome-intro-brand').evaluate((element) => {
          const { top, width } = element.getBoundingClientRect();
          return { top, width };
        });
      await seek(50);
      const initial = await brandBounds();
      const initialGlow = await page
        .locator('.welcome-logo-frame img')
        .evaluate((element) => getComputedStyle(element).filter);
      await seek(500);
      const peakGlow = await page
        .locator('.welcome-logo-frame img')
        .evaluate((element) => getComputedStyle(element).filter);
      assert.notEqual(peakGlow, initialGlow, 'Logo lighting gently blooms during the first second');
      assert.equal(await page.locator('canvas').count(), 0, 'No pixelation or particle canvas');
      assert.ok(
        await page
          .locator('.welcome-logo-frame')
          .evaluate((element) => element.getBoundingClientRect().width >= 170),
        'Opening logo stays prominent on short mobile screens'
      );
      await page.screenshot({ path: path.join(output, `welcome-glow-${width}.png`) });
      await seek(950);
      assert.deepEqual(
        await brandBounds(),
        initial,
        'Logo remains centered for one second before sliding'
      );
      assert.equal(
        await page
          .locator('.welcome-signin-content')
          .evaluate((element) => getComputedStyle(element).opacity),
        '0'
      );
      await seek(1300);
      assert.ok(
        await page
          .locator('.welcome-signin-content')
          .evaluate((element) => Number(getComputedStyle(element).opacity) > 0),
        'Sign-in begins appearing before the footer'
      );
      assert.equal(
        await page
          .locator('.welcome-footer')
          .evaluate((element) => getComputedStyle(element).opacity),
        '0',
        'Footer stays hidden until sign-in has started appearing'
      );
      await seek(1500);
      const sliding = await brandBounds();
      assert.ok(sliding.top < initial.top, 'Logo slides upwards after the first second');
      assert.ok(sliding.width < initial.width, 'Logo becomes slightly smaller as it rises');
      assert.ok(
        await page
          .locator('.welcome-signin-content')
          .evaluate((element) => Number(getComputedStyle(element).opacity) > 0),
        'Sign-in fades in beneath the rising logo'
      );
      await page.screenshot({ path: path.join(output, `welcome-slide-${width}.png`) });
      if (width === 320) {
        await seek(500);
        await page.setViewportSize({ width: 360, height: 568 });
        await page.clock.runFor(32);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          'Resize preserves responsive containment'
        );
        await page.setViewportSize({ width, height });
        await page.clock.runFor(32);
      }
      await page.clock.runFor(2000);
      await page.getByRole('button', { name: 'Sign in or sign up', exact: true }).waitFor();
      await page.clock.resume();
    } else {
      await page.getByRole('button', { name: 'Sign in or sign up', exact: true }).waitFor();
    }
    await page.keyboard.press('Tab');
    assert.equal(
      await page
        .getByRole('textbox', { name: 'Email address' })
        .evaluate((element) => element === document.activeElement),
      true,
      'Email remains reachable by keyboard'
    );
    await page.keyboard.press('Tab');
    assert.equal(
      await page
        .getByRole('button', { name: 'Sign in or sign up', exact: true })
        .evaluate((element) => element === document.activeElement),
      true,
      'Sign-in remains reachable by keyboard'
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `${width}px overflow`
    );
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const support = page.getByRole('link', { name: 'Contact Support' });
    assert.equal(await support.getAttribute('href'), 'mailto:toodle.issues@gmail.com');
    assert.equal(
      await support.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.left + bounds.width / 2 - innerWidth / 2) < 1;
      }),
      true,
      'Contact Support is centered at every viewport width'
    );
    assert.equal(
      await page
        .locator('.welcome-footer section')
        .evaluate((element) => getComputedStyle(element).textAlign),
      'center',
      'Footer attribution and copyright are centered at every viewport width'
    );
    assert.equal(
      await support.evaluate((element) => getComputedStyle(element).borderTopWidth),
      '0px',
      'Contact Support has no permanent border'
    );
    if (width < 768) {
      const mobileFooter = await page.locator('.welcome-footer').evaluate((element) => {
        const attribution = element.querySelector('section > p');
        const copyright = element.querySelector('section > p + p').getBoundingClientRect();
        const support = element.querySelector('a').getBoundingClientRect();
        return {
          attribution: attribution.innerText.replace(/\s+/g, ' ').trim(),
          copyrightCentered: Math.abs(copyright.left + copyright.width / 2 - innerWidth / 2) < 1,
          supportCentered: Math.abs(support.left + support.width / 2 - innerWidth / 2) < 1,
          supportBelowCopyright: support.top >= copyright.bottom,
        };
      });
      assert.deepEqual(mobileFooter, {
        attribution: 'Developed by Infinite Loopers for CSAM',
        copyrightCentered: true,
        supportCentered: true,
        supportBelowCopyright: true,
      });
    } else {
      assert.match(
        await page.locator('.welcome-footer section').innerText(),
        /School of Computer Science and Applied Mathematics, University of the Witwatersrand/
      );
    }
    assert.equal(
      await page.locator('.welcome-footer').evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.height <= 96 && bounds.bottom === innerHeight;
      }),
      true,
      'Footer stays within a shallow 2.5cm band at the very bottom of the page'
    );
    assert.equal(
      await page
        .locator('.welcome-footer > footer')
        .evaluate((element) => getComputedStyle(element).borderTopWidth),
      '1px',
      'Footer retains its divider'
    );
    assert.equal(
      await page
        .locator('.welcome-footer > footer')
        .evaluate((element) => getComputedStyle(element).backgroundColor),
      'rgba(0, 0, 0, 0)',
      'Footer shares the continuous welcome-page background'
    );
    assert.equal(
      await support.evaluate((element) => element === document.activeElement),
      true,
      'Footer support remains reachable by keyboard after sign-in controls'
    );
    assert.equal(
      await support.evaluate((element) => element.getBoundingClientRect().height >= 44),
      true,
      'Footer support retains an accessible touch target'
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight > innerHeight),
      false,
      `${width}x${height} sign-in vertical overflow`
    );
    const composition = await page.locator('.welcome-intro-original').evaluate((brand) => {
      const logo = brand.querySelector('.welcome-logo-frame').getBoundingClientRect();
      const wordmark = brand.querySelector('span').getBoundingClientRect();
      const card = document.querySelector('.welcome-signin-card').getBoundingClientRect();
      const footer = document.querySelector('.welcome-footer').getBoundingClientRect();
      return {
        stacked: logo.bottom <= wordmark.top + 1,
        centered: Math.abs(logo.left + logo.width / 2 - innerWidth / 2) < 1,
        cardBelow: card.top > wordmark.bottom,
        cardVisible: card.top >= 0 && card.bottom <= footer.top,
        logoVisible: logo.top >= 0,
        footerVisible: footer.top >= 0 && footer.bottom <= innerHeight,
      };
    });
    assert.deepEqual(
      composition,
      {
        stacked: true,
        centered: true,
        cardBelow: true,
        cardVisible: true,
        logoVisible: true,
        footerVisible: true,
      },
      `${width}x${height} composition`
    );
    await page.screenshot({ path: path.join(output, `welcome-signin-${width}-${height}.png`) });
    await page.reload();
    await page.getByRole('button', { name: 'Sign in or sign up', exact: true }).waitFor();
    assert.equal(await page.locator('.welcome-intro.is-playing').count(), 0);
    await page.goto('http://localhost:5173/login');
    await page.getByRole('button', { name: 'Sign in or sign up', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.__welcomeLogin), {
      appState: { returnTo: '/dashboard' },
    });
    await page.getByRole('textbox', { name: 'Email address' }).fill('tutor@example.com');
    await page.getByRole('button', { name: 'Sign in or sign up', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.__welcomeLogin.authorizationParams), {
      login_hint: 'tutor@example.com',
    });
    await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.__welcomeLogin.authorizationParams), {
      connection: 'google-oauth2',
    });
    await page.evaluate(() => {
      window.__failWelcomeLogin = true;
    });
    await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(
      await page.getByRole('textbox', { name: 'Email address' }).inputValue(),
      'tutor@example.com'
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight > innerHeight),
      false,
      `${width}x${height} error vertical overflow`
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'Continue with Google' })
        .evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight),
      true,
      'Retry action remains visible'
    );
    assert.deepEqual(errors, []);
    await context.close();
  }
  const context = await createContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Sign in or sign up', exact: true }).waitFor();
  assert.equal(await page.locator('.welcome-intro.is-playing').count(), 0);
  await context.close();
  console.log(
    'PASS: logo glow and upward slide, sign-in followed by original dark footer, six viewport sizes, keyboard sign-in and support controls, session persistence, existing login actions, reduced motion, no horizontal/vertical overflow or runtime errors'
  );
} finally {
  await browser.close();
}
