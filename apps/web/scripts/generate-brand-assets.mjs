import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const NAVY = '#12203A';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const mobileBrand = path.join(root, 'apps/mobile/assets/brand');
const source = path.join(mobileBrand, 'source');
const webPublicBrand = path.join(root, 'apps/web/public/brand');
const nextApp = path.join(root, 'apps/web/src/app');

const [brandSvg, whiteSvg, simpleWhiteSvg] = await Promise.all([
  readFile(path.join(source, 'logo.svg'), 'utf8'),
  readFile(path.join(source, 'logo-white.svg'), 'utf8'),
  readFile(path.join(source, 'logo-simple-white.svg'), 'utf8'),
]);

if ([brandSvg, whiteSvg, simpleWhiteSvg].some(svg => /c2pa|<metadata\b/i.test(svg))) {
  throw new Error('Brand SVG sources must be sanitized before raster generation.');
}

await Promise.all([mkdir(mobileBrand, { recursive: true }), mkdir(webPublicBrand, { recursive: true })]);
await Promise.all([
  writeFile(path.join(webPublicBrand, 'logo.svg'), brandSvg),
  writeFile(path.join(webPublicBrand, 'logo-white.svg'), whiteSvg),
  writeFile(path.join(webPublicBrand, 'logo-simple-white.svg'), simpleWhiteSvg),
]);

async function renderSvg(svg, output, size, options = {}) {
  const { background = 'transparent', scale = 1 } = options;
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'cuadrala-brand-'));
  const documentPath = path.join(temporaryDirectory, 'asset.html');
  await writeFile(documentPath, `<!doctype html>
    <html><head><style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: ${background}; }
      body { display: grid; place-items: center; }
      svg { display: block; width: ${scale * 100}%; height: ${scale * 100}%; }
    </style></head><body>${svg}</body></html>`);
  try {
    execFileSync('/usr/bin/google-chrome', [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${size},${size}`,
      ...(background === 'transparent' ? ['--default-background-color=00000000'] : []),
      `--screenshot=${output}`,
      `file://${documentPath}`,
    ], { stdio: 'ignore' });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function pngIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(32, 6);
  header.writeUInt8(32, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

await renderSvg(brandSvg, path.join(mobileBrand, 'logo-auth.png'), 1024);
  await renderSvg(whiteSvg, path.join(mobileBrand, 'logo-auth-dark.png'), 1024);
  await renderSvg(simpleWhiteSvg, path.join(mobileBrand, 'splash-mark.png'), 1024, { scale: 0.62 });
  await renderSvg(simpleWhiteSvg, path.join(mobileBrand, 'launcher-foreground.png'), 1024, { scale: 0.78 });
  await renderSvg(simpleWhiteSvg, path.join(mobileBrand, 'launcher-icon.png'), 1024, {
    background: NAVY,
    scale: 0.62,
  });

  await renderSvg(simpleWhiteSvg, path.join(nextApp, 'icon.png'), 512, { background: NAVY, scale: 0.62 });
  await renderSvg(simpleWhiteSvg, path.join(nextApp, 'apple-icon.png'), 180, {
    background: NAVY,
    scale: 0.62,
  });

  const faviconPng = path.join(nextApp, '.favicon-source.png');
  await renderSvg(simpleWhiteSvg, faviconPng, 32, { background: NAVY, scale: 0.7 });
  const png = await readFile(faviconPng);
  const ico = pngIco(png);
  await Promise.all([
    writeFile(path.join(nextApp, 'favicon.ico'), ico),
    writeFile(path.join(root, 'apps/mobile/web/favicon.ico'), ico),
  ]);
await unlink(faviconPng);

console.log('Generated deterministic brand rasters from sanitized SVG masters.');
