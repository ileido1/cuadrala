#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
let pixelmatch;
let PNG;

const PHONE = { width: 402, height: 874 };
const scriptDir = dirname(fileURLToPath(import.meta.url));

function help() {
  console.log(`Pixel-level visual diff for a handoff screen and a target URL.

Usage:
  npm run visual:diff -- --handoff /path/to/Cuadrala\ App.html --target https://www.cuadrala.app/#/quick-match

Options:
  --handoff <path>       Handoff HTML. Defaults to VISUAL_HANDOFF_HTML.
  --target <url>         Target URL/route. Defaults to VISUAL_TARGET_URL.
  --screen-label <text>  Substring matched in data-screen-label. Defaults to "02 Configurar".
  --handoff-selector <s> Explicit handoff element selector for legacy HTML without data-screen-label.
  --output <dir>         Artifact directory. Defaults to VISUAL_OUTPUT_DIR or visual-artifacts.
  --max-diff-ratio <n>   Allowed changed pixel ratio. Defaults to VISUAL_MAX_DIFF_RATIO or 0.01.
  --help                 Show this help.

Environment:
  VISUAL_HANDOFF_HTML    Absolute path to the local handoff HTML.
  VISUAL_TARGET_URL      Target URL, including the route/hash to capture.
  VISUAL_AUTH_STATE      Optional Playwright storage-state JSON path; never commit it.
  VISUAL_SCREEN_LABEL    Label substring override.
  VISUAL_HANDOFF_SELECTOR
                         Selector override, for example ".cz" for the supplied legacy handoff.
  VISUAL_OUTPUT_DIR      Artifact directory override.
  VISUAL_MAX_DIFF_RATIO  Pass threshold; 0.01 means at most 1% changed pixels.

The runner always uses a 402x874 CSS-pixel viewport and deviceScaleFactor 1.
It writes baseline.png, target.png, diff.png, and report.json, then exits 1 on failure.
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--help' || value === '-h') return { help: true };
    if (!value.startsWith('--')) throw new Error(`Unknown argument: ${value}`);
    const key = value.slice(2).replaceAll('-', '_');
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) throw new Error(`Missing value for --${key.replaceAll('_', '-')}`);
    args[key] = next;
    i += 1;
  }
  return args;
}

function required(value, name) {
  if (!value) throw new Error(`Missing ${name}. Use --${name.replaceAll('_', '-')} or the documented environment variable.`);
  return value;
}

function mimeType(path) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.jsx': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
  }[extname(path).toLowerCase()] || 'application/octet-stream';
}

async function serveDirectory(root) {
  const server = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const candidate = resolve(root, `.${requestPath}`);
      if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(candidate);
      response.writeHead(200, { 'content-type': mimeType(candidate), 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveServer);
  });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function waitForStablePage(page) {
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; caret-color: transparent !important; }' });
  await page.waitForTimeout(150);
}

async function findHandoffElement(page, label, selector) {
  if (selector) {
    const explicit = page.locator(selector).first();
    if (await explicit.count() === 0) throw new Error(`Handoff selector did not match: ${selector}`);
    return explicit;
  }
  const labelled = page.locator('[data-screen-label]');
  const matchIndex = await labelled.evaluateAll((elements, wanted) => elements.findIndex((element) => (
    element.getAttribute('data-screen-label') || ''
  ).includes(wanted)), label);
  if (matchIndex < 0) {
    throw new Error(`No handoff element matched data-screen-label containing "${label}". Add that attribute or pass --handoff-selector for legacy handoff HTML.`);
  }
  return labelled.nth(matchIndex);
}

async function captureElement(page, element, destination) {
  await element.evaluate((node) => node.scrollIntoView({ block: 'start', inline: 'start' }));
  await page.locator('header').evaluateAll((headers) => headers.forEach((header) => {
    header.style.display = 'none';
  }));
  await element.evaluate((node) => {
    let parent = node.parentElement;
    while (parent && parent !== document.body) {
      if (getComputedStyle(parent).transform !== 'none') {
        parent.style.transform = 'none';
        parent.style.transformOrigin = 'top left';
      }
      parent = parent.parentElement;
    }
  });
  const box = await element.boundingBox();
  if (!box) throw new Error('The selected handoff screen is not visible.');
  if (Math.round(box.width) !== PHONE.width || Math.round(box.height) !== PHONE.height) {
    throw new Error(`Selected handoff screen is ${Math.round(box.width)}x${Math.round(box.height)}; expected ${PHONE.width}x${PHONE.height}. Select the phone content, not its desktop frame.`);
  }
  const raw = PNG.sync.read(await element.screenshot({ animations: 'disabled' }));
  if (raw.width < PHONE.width || raw.height < PHONE.height) {
    throw new Error(`Handoff screenshot is ${raw.width}x${raw.height}; expected at least ${PHONE.width}x${PHONE.height}.`);
  }
  const cropped = new PNG({ width: PHONE.width, height: PHONE.height });
  for (let y = 0; y < PHONE.height; y += 1) {
    const sourceOffset = y * raw.width * 4;
    const targetOffset = y * PHONE.width * 4;
    raw.data.copy(cropped.data, targetOffset, sourceOffset, sourceOffset + PHONE.width * 4);
  }
  writeFileSync(destination, PNG.sync.write(cropped));
}

function compareImages(baselinePath, targetPath, diffPath, threshold) {
  const baseline = PNG.sync.read(readFileSync(baselinePath));
  const target = PNG.sync.read(readFileSync(targetPath));
  if (baseline.width !== target.width || baseline.height !== target.height) {
    throw new Error(`Image dimensions differ: baseline ${baseline.width}x${baseline.height}, target ${target.width}x${target.height}.`);
  }
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const changedPixels = pixelmatch(baseline.data, target.data, diff.data, baseline.width, baseline.height, { threshold });
  writeFileSync(diffPath, PNG.sync.write(diff));
  const totalPixels = baseline.width * baseline.height;
  return {
    width: baseline.width,
    height: baseline.height,
    changedPixels,
    changedPixelRatio: changedPixels / totalPixels,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    help();
    return;
  }

  const handoffHtml = resolve(required(args.handoff || process.env.VISUAL_HANDOFF_HTML, 'handoff HTML'));
  const targetUrl = required(args.target || process.env.VISUAL_TARGET_URL, 'target URL');
  const screenLabel = args.screen_label || process.env.VISUAL_SCREEN_LABEL || '02 Configurar';
  const handoffSelector = args.handoff_selector || process.env.VISUAL_HANDOFF_SELECTOR;
  const outputDir = resolve(args.output || process.env.VISUAL_OUTPUT_DIR || resolve(scriptDir, '../visual-artifacts'));
  const maxDiffRatio = Number(args.max_diff_ratio || process.env.VISUAL_MAX_DIFF_RATIO || 0.01);
  if (!Number.isFinite(maxDiffRatio) || maxDiffRatio < 0 || maxDiffRatio > 1) throw new Error('max diff ratio must be a number between 0 and 1.');

  ({ chromium } = await import('@playwright/test'));
  ({ default: pixelmatch } = await import('pixelmatch'));
  ({ PNG } = await import('pngjs'));
  await mkdir(outputDir, { recursive: true });
  const handoffServer = await serveDirectory(dirname(handoffHtml));
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  try {
    const contextOptions = { viewport: PHONE, deviceScaleFactor: 1, colorScheme: 'dark' };
    if (process.env.VISUAL_AUTH_STATE) contextOptions.storageState = resolve(process.env.VISUAL_AUTH_STATE);
    const context = await browser.newContext(contextOptions);
    const handoffPage = await context.newPage();
    await handoffPage.goto(`${handoffServer.url}/${encodeURIComponent(handoffHtml.split(sep).pop())}`, { waitUntil: 'domcontentloaded' });
    await waitForStablePage(handoffPage);
    const handoffElement = await findHandoffElement(handoffPage, screenLabel, handoffSelector);
    await captureElement(handoffPage, handoffElement, resolve(outputDir, 'baseline.png'));

    const targetPage = await context.newPage();
    await targetPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForStablePage(targetPage);
    await targetPage.screenshot({ path: resolve(outputDir, 'target.png'), animations: 'disabled' });
    await context.close();

    const metrics = compareImages(
      resolve(outputDir, 'baseline.png'),
      resolve(outputDir, 'target.png'),
      resolve(outputDir, 'diff.png'),
      0.1,
    );
    const report = {
      status: metrics.changedPixelRatio <= maxDiffRatio ? 'PASS' : 'FAIL',
      generatedAt: new Date().toISOString(),
      viewport: PHONE,
      screenLabel,
      handoffHtml,
      targetUrl,
      maxDiffRatio,
      ...metrics,
      artifacts: { baseline: 'baseline.png', target: 'target.png', diff: 'diff.png' },
    };
    await writeFile(resolve(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    if (report.status === 'FAIL') process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise((resolveServer) => handoffServer.server.close(resolveServer));
  }
}

main().catch((error) => {
  console.error(`visual-diff: ${error.message}`);
  process.exitCode = 1;
});
