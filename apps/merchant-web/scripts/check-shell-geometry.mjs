// Browser geometry check for the real merchant-web shell (issue #10). Starts the app in demo mode
// with Vite, signs in with synthetic data and measures the header in Chrome/Edge at 9 widths, both
// themes, browser zoom 100% and 200% and with a normal or very long branch name.
// Zoom 200% is emulated like a browser does it: half the CSS viewport at twice the pixel density
// (1280px → 640 CSS px). Media queries respond to that, unlike scaling the root font-size.
// Following WCAG 1.4.10 the zoomed viewport never goes below 320 CSS px. It fails on horizontal
// overflow, controls outside the screen or too small, navigation/theme/account not reachable, menus
// that open off-screen, an invisible focus ring or a trigger whose accessible name hides the branch.
// Usage: pnpm --filter @delivery/merchant-web geometry:shell
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const WIDTHS = [320, 360, 375, 390, 430, 600, 768, 1024, 1280];
const THEMES = ['light', 'dark'];
const CASES = [
  { branch: 'Sucursal demo Centro', zoom: 1 },
  { branch: 'Sucursal demo Centro', zoom: 2 },
  { branch: 'Sucursal demo Plaza Comercial Marina Vallarta Norte', zoom: 1 },
];
/** WCAG 2.5.8 minimum target size in CSS px. */
const MIN_TARGET = 24;
const MIN_CSS_WIDTH = 320;

async function launch() {
  for (const channel of [process.env.GEOMETRY_BROWSER_CHANNEL, 'chrome', 'msedge'].filter(Boolean)) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // Try the next installed browser.
    }
  }
  throw new Error('No Chromium browser found. Set GEOMETRY_BROWSER_CHANNEL.');
}

/** Runs in the page: overflow and header controls that leave the screen or are too small. */
function inspect(minTarget) {
  const vw = window.innerWidth;
  const issues = [];
  const overflow = document.documentElement.scrollWidth - vw;
  if (overflow > 0) issues.push(`page scrolls horizontally by ${overflow}px`);
  for (const control of document.querySelectorAll('header a, header button, header [role="radio"]')) {
    const rect = control.getBoundingClientRect();
    // Skip hidden and visually-hidden (1px) controls such as native radio inputs.
    if (rect.width <= 1 || rect.height <= 1) continue;
    const name = control.getAttribute('aria-label') || control.textContent?.trim() || control.tagName;
    if (rect.left < -0.5 || rect.right > vw + 0.5) issues.push(`«${name}» outside the screen (${Math.round(rect.left)}–${Math.round(rect.right)})`);
    if (rect.height < minTarget || rect.width < minTarget) issues.push(`«${name}» target ${Math.round(rect.width)}×${Math.round(rect.height)}px`);
  }
  return issues;
}

/** Runs in the page: every visible element matching the selector is fully on screen. */
function onScreen(selector) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const nodes = [...document.querySelectorAll(selector)].filter((node) => node.getBoundingClientRect().width > 1 && node.getBoundingClientRect().height > 1);
  if (nodes.length === 0) return [`nothing visible for ${selector}`];
  return nodes.flatMap((node) => {
    const r = node.getBoundingClientRect();
    return r.left < -0.5 || r.right > vw + 0.5 || r.top < -0.5 || r.bottom > vh + 0.5 ? [`${selector} «${node.textContent?.trim().slice(0, 24)}» off screen`] : [];
  });
}

/** Measure only after enter animations (drawer slide, popover fade) have finished. */
const settle = (page) => page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));

async function signIn(page, base, branch) {
  await page.goto(`${base}/acceso`);
  await page.getByLabel('Correo electrónico').fill('comercio@demo.test');
  await page.locator('input[name=password]').fill('demo');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByRole('radio', { name: new RegExp(branch) }).check({ force: true });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Envíos de tu sucursal' }).waitFor();
}

async function checkCombination(page, { branch }) {
  const issues = [];
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  issues.push(...await page.evaluate(inspect, MIN_TARGET));

  const account = page.getByRole('button', { name: /menú de cuenta/ }).locator('visible=true').first();
  const accountName = await account.getAttribute('aria-label') ?? await account.textContent();
  if (!accountName?.includes(branch)) issues.push('account trigger name does not include the branch');

  // Keyboard: the first header control shows a focus ring.
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active || !active.closest('header, [data-skip]')) return null;
    const style = getComputedStyle(active);
    return style.outlineStyle !== 'none' || style.boxShadow !== 'none' ? null : `focused «${active.textContent?.trim()}» has no visible ring`;
  });
  if (focus) issues.push(focus);

  // Account menu opens fully on screen and closes back to its trigger.
  await account.click();
  await page.getByRole('menuitem', { name: /Cerrar sesión/ }).waitFor();
  await settle(page);
  issues.push(...await page.evaluate(onScreen, '[role="menu"]'));
  issues.push(...(await page.evaluate(inspect, MIN_TARGET)).filter((issue) => issue.startsWith('page scrolls')));
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'detached' });

  // Keyboard: Enter opens the menu with focus inside; Escape closes it and returns focus.
  await account.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('menu').waitFor();
  if (!(await page.evaluate(() => document.activeElement?.closest('[role="menu"]') !== null))) issues.push('Enter on the account trigger does not move focus into the menu');
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'detached' });
  // react-aria restores focus once the exit animation ends; give it up to 2 s.
  const returned = await page.waitForFunction(() => document.activeElement?.getAttribute('aria-haspopup') === 'true', null, { timeout: 2000 }).then(() => true, () => false);
  if (!returned) issues.push('Escape does not return focus to the account trigger');

  // Navigation and theme: inline links, or reachable through the mobile drawer.
  const desktopNav = page.getByRole('navigation', { name: 'Principal', exact: true });
  if (await desktopNav.isVisible()) {
    for (const label of ['Inicio', 'Nuevo envío', 'Sucursal']) {
      const box = await desktopNav.getByRole('link', { name: label }).boundingBox();
      if (!box || box.height > 48) issues.push(`desktop link «${label}» wraps or is missing`);
    }
    if (!(await page.getByRole('radiogroup', { name: 'Tema de color' }).locator('visible=true').count())) issues.push('theme control not visible on desktop');
  } else {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const drawer = page.getByRole('dialog');
    await drawer.waitFor();
    await settle(page);
    for (const label of ['Inicio', 'Nuevo envío', 'Sucursal']) {
      if (!(await drawer.getByRole('link', { name: label }).isVisible())) issues.push(`drawer link «${label}» not visible`);
    }
    if (!(await drawer.getByRole('radiogroup', { name: 'Tema de color' }).isVisible())) issues.push('theme control missing in the drawer');
    if (!(await drawer.getByRole('button', { name: /menú de cuenta/ }).isVisible())) issues.push('account menu missing in the drawer');
    issues.push(...await page.evaluate(onScreen, '[role="dialog"] a, [role="dialog"] [role="radio"]'));
    // The account menu also opens from inside the drawer, fully on screen.
    await drawer.getByRole('button', { name: /menú de cuenta/ }).click();
    await page.getByRole('menuitem', { name: /Cerrar sesión/ }).waitFor();
    await settle(page);
    issues.push(...await page.evaluate(onScreen, '[role="menu"]'));
    await page.keyboard.press('Escape');
    await page.getByRole('menu').waitFor({ state: 'detached' });
    // Focus returns to the trigger inside the drawer; then Escape closes the drawer itself.
    const back = await page.waitForFunction(() => document.activeElement?.closest('[role="dialog"]') !== null, null, { timeout: 2000 }).then(() => true, () => false);
    if (!back) issues.push('closing the account menu loses focus outside the drawer');
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });
  }
  return issues;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, mode: 'demo', logLevel: 'error', server: { port: 0, host: '127.0.0.1', strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await launch();
const failures = [];
let checks = 0;
try {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      for (const scenario of CASES) {
        const cssWidth = Math.round(width / scenario.zoom);
        if (cssWidth < MIN_CSS_WIDTH) continue;
        const context = await browser.newContext({ viewport: { width: cssWidth, height: Math.round(760 / scenario.zoom) }, deviceScaleFactor: scenario.zoom, colorScheme: theme });
        const page = await context.newPage();
        await signIn(page, base, scenario.branch);
        const issues = await checkCombination(page, scenario);
        checks += 1;
        for (const issue of issues) failures.push(`${theme} · ${width}px · zoom ${scenario.zoom * 100}% · «${scenario.branch}» → ${issue}`);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} shell geometry problems in ${checks} combinations.`);
  process.exitCode = 1;
} else {
  console.log(`merchant-web shell geometry OK: ${checks} combinations (${WIDTHS.length} widths × 2 themes × zoom 100%, zoom 200% down to ${MIN_CSS_WIDTH} CSS px, long branch name).`);
}
