// Browser geometry check for DeliveryList (issue #21). jsdom has no layout, so this opens the built
// Storybook in a real Chromium (Chrome or Edge) and measures every row at several widths, both
// themes and 100%/200% text. It fails on overflow, a clipped or detached folio, wrong order,
// misalignment, tall desktop rows or an invisible focus ring.
// Usage: pnpm --filter @delivery/ui-web gallery:build && pnpm --filter @delivery/ui-web gallery:geometry
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '../storybook-static');
const STORIES = [
  { id: 'logística-deliverylist--history', compact: true },
  { id: 'logística-deliverylist--long-references', compact: false },
];
const WIDTHS = [320, 360, 375, 768, 1024, 1280, 1440];
const THEMES = ['Claro', 'Oscuro'];
const TEXT_SCALES = [1, 2];
/** Row layout breakpoint of DeliveryListItem: Tailwind `@lg` container query = 32rem. */
const ROW_REM = 32;
const MAX_DESKTOP_ROW = 84;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  const file = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
}).listen(0, '127.0.0.1');

async function launch() {
  const channels = [process.env.GEOMETRY_BROWSER_CHANNEL, 'chrome', 'msedge'].filter(Boolean);
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // Try the next installed browser.
    }
  }
  throw new Error(`No Chromium browser found (tried ${channels.join(', ')}). Set GEOMETRY_BROWSER_CHANNEL.`);
}

/** Runs in the page: measures every row and returns rule violations as text. */
function measure({ scale, compact, rowRem, maxRow }) {
  const issues = [];
  const box = (element) => element.getBoundingClientRect();
  const center = (rect) => rect.top + rect.height / 2;
  if (document.documentElement.scrollWidth > window.innerWidth + 0.5) issues.push(`page scrolls horizontally (${document.documentElement.scrollWidth}px)`);
  const links = [...document.querySelectorAll('ul[aria-label] > li > a')];
  if (links.length === 0) issues.push('no rows rendered');
  links.forEach((link, index) => {
    const tag = `row ${index + 1}`;
    const part = (name) => link.querySelector(`[data-part="${name}"]`);
    const [icon, title, reference, status, amount, chevron] = ['icon', 'title', 'reference', 'status', 'amount', 'chevron'].map(part);
    if (!icon || !title || !reference || !status || !amount || !chevron) { issues.push(`${tag}: missing data-part`); return; }
    const iconShown = box(icon).width > 0;
    if (iconShown !== link.parentElement.clientWidth >= 16 * 16 * scale) issues.push(`${tag}: icon visibility does not match the 16rem rule`);
    const row = box(link);
    const rowMode = box(chevron).width > 0;
    const expectRow = link.parentElement.clientWidth >= rowRem * 16 * scale;
    if (rowMode !== expectRow) issues.push(`${tag}: ${expectRow ? 'stacked although the row fits' : 'single row although it does not fit'}`);
    const [i, t, r, s, a, c] = [icon, title, reference, status, amount, chevron].map(box);
    if (link.scrollWidth > link.clientWidth + 1) issues.push(`${tag}: content overflows the row`);
    if (reference.scrollWidth > reference.clientWidth + 1 || r.right > row.right + 0.5 || r.width === 0) issues.push(`${tag}: folio clipped or outside the row`);
    if (iconShown && t.left < i.right) issues.push(`${tag}: date overlaps the icon`);
    if (Math.abs(r.left - t.left) > 1) issues.push(`${tag}: folio not aligned under the date (${Math.round(r.left)} vs ${Math.round(t.left)})`);
    if (r.top < t.bottom - 1) issues.push(`${tag}: folio is not below the date`);
    if (row.height < 44) issues.push(`${tag}: touch target ${Math.round(row.height)}px < 44px`);
    if (rowMode) {
      if (s.left < Math.max(t.right, r.right) - 1) issues.push(`${tag}: status overlaps date/folio`);
      if (a.left < s.right - 1) issues.push(`${tag}: amount not after status`);
      if (c.left < a.right - 1 || c.width === 0) issues.push(`${tag}: chevron not last`);
      for (const [name, rect] of [['icon', i], ['status', s], ['amount', a], ['chevron', c]].filter(([name]) => name !== 'icon' || iconShown)) {
        if (Math.abs(center(rect) - center(row)) > 4) issues.push(`${tag}: ${name} not vertically centered`);
      }
      if (compact && scale === 1 && row.height > maxRow) issues.push(`${tag}: row ${Math.round(row.height)}px > ${maxRow}px`);
    } else {
      if (s.top < r.bottom - 1) issues.push(`${tag}: status not below the folio when stacked`);
      if (s.left < t.left - 1) issues.push(`${tag}: status not aligned with the text column`);
      const sameLine = Math.abs(center(a) - center(s)) <= 4 && a.left >= s.right - 1;
      if (!sameLine && a.top < s.bottom - 1) issues.push(`${tag}: amount neither beside nor below the status`);
      if (a.right > row.right - 1) issues.push(`${tag}: amount outside the row`);
    }
  });
  return issues;
}

const browser = await launch();
const failures = [];
let checks = 0;
for (const story of STORIES) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      for (const scale of TEXT_SCALES) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`http://127.0.0.1:${server.address().port}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=theme:${theme}`);
        await page.waitForSelector('ul[aria-label] > li > a');
        await page.evaluate(async (fontScale) => {
          document.documentElement.style.fontSize = `${fontScale * 100}%`;
          await document.fonts.ready;
        }, scale);
        const issues = await page.evaluate(measure, { scale, compact: story.compact, rowRem: ROW_REM, maxRow: MAX_DESKTOP_ROW });
        if (scale === 1 && width >= 768) {
          const stacked = await page.evaluate(() => [...document.querySelectorAll('[data-part="chevron"]')].some((node) => node.getBoundingClientRect().width === 0));
          if (stacked) issues.push('desktop/tablet at 100% text must use the compact single-row layout');
        }
        if (scale === 1 && width === 1280) {
          // Keyboard: the first row must show a visible focus indicator.
          await page.keyboard.press('Tab');
          const focus = await page.evaluate(() => {
            const active = document.activeElement;
            if (!active || active.tagName !== 'A') return 'no row link received focus';
            const style = getComputedStyle(active);
            return style.outlineStyle !== 'none' || style.boxShadow !== 'none' ? null : 'focused row has no visible focus ring';
          });
          if (focus) issues.push(focus);
        }
        checks += 1;
        for (const issue of issues) failures.push(`${story.id} · ${theme} · ${width}px · text ${scale * 100}% → ${issue}`);
        await page.close();
      }
    }
  }
}
await browser.close();
server.close();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} geometry problems in ${checks} combinations.`);
  process.exitCode = 1;
} else {
  console.log(`DeliveryList geometry OK: ${checks} combinations (2 stories × 2 themes × ${WIDTHS.length} widths × 2 text sizes).`);
}
