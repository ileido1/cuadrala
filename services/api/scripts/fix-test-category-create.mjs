import fs from 'node:fs';
import path from 'node:path';

const INTEGRATION_DIR = path.join(process.cwd(), 'src/test/integration');

function sportIdExpr(content) {
  if (/let sportPadelId|sportPadelId =/.test(content)) return 'sportPadelId';
  if (/CATALOG\.sportPadelId/.test(content)) return 'CATALOG.sportPadelId';
  if (/const SPORT = await PRISMA\.sport\.create/.test(content)) return 'SPORT.id';
  return 'sportPadelId';
}

function ensureImport(content) {
  if (content.includes('createTestCategorySV')) return content;
  const anchor = content.includes("from '../helpers/reset-db.js';")
    ? "from '../helpers/reset-db.js';"
    : "from '../helpers/catalog-seed.js';";
  return content.replace(
    anchor,
    `${anchor}\nimport { createTestCategorySV } from '../helpers/test-category.js';`,
  );
}

function ensureSportPadelAfterCatalog(content) {
  if (/sportPadelId\s*=\s*CATALOG\.sportPadelId/.test(content)) return content;
  if (!content.includes('ensureTestCatalogSV()')) return content;
  return content.replace(
    /const CATALOG = await ensureTestCatalogSV\(\);/,
    `const CATALOG = await ensureTestCatalogSV();\n      const sportPadelId = CATALOG.sportPadelId;`,
  );
}

function extractField(inner, field) {
  const re = new RegExp(
    `${field}:\\s*(\`(?:\\\\.|[^\`])*\`|'[^']*'|"[^"]*"|SLUG|[A-Za-z_][A-Za-z0-9_]*)`,
  );
  const m = inner.match(re);
  return m ? m[1] : null;
}

function findBraceClose(src, openBraceIdx) {
  let depth = 0;
  for (let i = openBraceIdx; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function replaceCategoryCreates(content) {
  const sportId = sportIdExpr(content);
  let out = content;
  let searchFrom = 0;
  while (true) {
    const marker = 'PRISMA.category.create';
    const idx = out.indexOf(marker, searchFrom);
    if (idx === -1) break;

    const awaitIdx = out.lastIndexOf('await', idx);
    const parenOpen = out.indexOf('(', idx);
    const dataKey = out.indexOf('data:', parenOpen);
    if (dataKey === -1) {
      searchFrom = idx + marker.length;
      continue;
    }
    const dataBrace = out.indexOf('{', dataKey);
    const dataClose = findBraceClose(out, dataBrace);
    if (dataClose === -1) {
      searchFrom = idx + marker.length;
      continue;
    }
    let end = dataClose + 1;
    while (end < out.length && /[\s,}]/.test(out[end])) end += 1;
    if (out[end] === ')') end += 1;
    if (out[end] === ';') end += 1;

    const block = out.slice(awaitIdx, end);
    const inner = out.slice(dataBrace + 1, dataClose);
    const name = extractField(inner, 'name');
    const slug = extractField(inner, 'slug');
    if (!name || !slug) {
      searchFrom = idx + marker.length;
      continue;
    }

    const replacement = `await createTestCategorySV(${sportId}, ${slug}, ${name})`;
    out = out.slice(0, awaitIdx) + replacement + out.slice(end);
    searchFrom = awaitIdx + replacement.length;
  }
  return out;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('PRISMA.category.create')) return false;
  const next = replaceCategoryCreates(ensureImport(ensureSportPadelAfterCatalog(content)));
  if (next === content) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

for (const FILE of fs.readdirSync(INTEGRATION_DIR).filter((f) => f.endsWith('.ts'))) {
  if (processFile(path.join(INTEGRATION_DIR, FILE))) {
    console.log('fixed', FILE);
  }
}
