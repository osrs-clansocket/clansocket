#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { cp, rm, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, sep, dirname } from 'node:path';

const inclPublic = process.argv.includes('--incl-public');

const EXCLUDE_DURING_COPY = [
  '.git',
  '.cache',
  '.idea',
  '.vscode',
  '.lint-reports',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.coverage',
  'logs',
  'packages',
  'varez-clan-vocab',
  'devlay',
  'clansocket.wiki',
];

const EXCLUDE_FILE_NAMES = [
  '.env',
  '.env.production.local',
  '.env.local',
  '.env.development',
  '.env.development.local',
  'package-lock.json',
  'ecosystem.config.cjs',
  '.DS_Store',
  'Thumbs.db',
  'PROJECT_ANALYSIS.md',
  'TROUBLESHOOT.md',
  'DNS.md',
  'eslint-test.json',
];

// Excluded subtrees -- entire path-prefix is dropped from the main copy. Use
// INCLUDE_AFTER_COPY to re-introduce specific files / dirs inside an excluded tree.
const EXCLUDE_TREE_PATHS = [
  ['main', 'server', 'data'],
  ['main', 'server', 'certs'],
  ['main', 'dashboard', 'certs'],
  ['public', 'resources', 'osrs', 'game_objects_xl'],
  ['public', 'resources', 'osrs', 'game_npcs_xl'],
  ['public', 'resources', 'osrs', 'icon_item_ids'],
  ['deployment', 'batch', 'connect-droplet.bat'],
  ['deployment', 'nginx', 'sites-available', 'varietyz'],
  ['deployment', 'scripts', 'check-deployment.sh'],
  ['deployment', 'README.md'],
];

// --incl-public gates the heavy public/ copy. Without it the whole public/ tree is skipped.
if (!inclPublic) {
  EXCLUDE_TREE_PATHS.push(['public']);
}

// Allowlist of specific paths inside excluded trees that DO ship to the submission.
// Each entry is the path segments from clansocket-app/ down to the file or directory.
const INCLUDE_AFTER_COPY = [
  ['main', 'server', 'data', 'game_ids.db'],
  ['main', 'server', 'data', 'map'],
];

const STRIP_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];

const ESLINT_PREFIXES = [
  'eslint-disable-next-line',
  'eslint-disable-line',
  'eslint-disable',
];

const srcAbs = resolve(process.cwd());
if (!existsSync(join(srcAbs, 'package.json')) || !existsSync(join(srcAbs, 'main', 'dashboard'))) {
  console.error(`FATAL: run from clansocket-app/ -- no package.json or main/dashboard at ${srcAbs}`);
  process.exit(1);
}

const dstAbs = resolve(srcAbs, '..', 'clansocket-app-submission');
if (!existsSync(dstAbs)) {
  console.error(`FATAL: ${dstAbs} does not exist`);
  process.exit(1);
}
if (!existsSync(join(dstAbs, '.git'))) {
  console.error(`FATAL: ${join(dstAbs, '.git')} not found -- destination is not an initialized git repo`);
  process.exit(1);
}

console.log(`src: ${srcAbs}`);
console.log(`dst: ${dstAbs}`);
console.log(`incl-public: ${inclPublic ? 'yes (copying public/)' : 'no (skipping public/, pass --incl-public to include)'}`);

console.log(`wiping dst contents (preserving .git/${inclPublic ? '' : ' and public/'})`);
for (const ent of await readdir(dstAbs, { withFileTypes: true })) {
  if (ent.name === '.git') continue;
  if (!inclPublic && ent.name === 'public') continue;
  await rm(join(dstAbs, ent.name), { recursive: true, force: true });
}

console.log('copying src to dst');
console.log(`  excluding any path segment in: ${EXCLUDE_DURING_COPY.join(', ')}`);
console.log(`  excluding top-level files: ${EXCLUDE_FILE_NAMES.join(', ')}`);
console.log(`  excluding subtrees: ${EXCLUDE_TREE_PATHS.map((p) => p.join('/')).join(', ')}`);

function startsWithSegments(parts, segments) {
  if (parts.length < segments.length) return false;
  for (let i = 0; i < segments.length; i++) {
    if (parts[i] !== segments[i]) return false;
  }
  return true;
}

await cp(srcAbs, dstAbs, {
  recursive: true,
  force: true,
  errorOnExist: false,
  filter: (src) => {
    if (src === srcAbs) return true;
    const rel = src.slice(srcAbs.length + 1);
    const parts = rel.split(sep);
    if (parts.some((p) => EXCLUDE_DURING_COPY.includes(p))) return false;
    if (parts.length === 1 && EXCLUDE_FILE_NAMES.includes(parts[0])) return false;
    for (const tree of EXCLUDE_TREE_PATHS) {
      if (startsWithSegments(parts, tree)) return false;
    }
    return true;
  },
});

console.log('re-including allowlisted paths from excluded subtrees');
for (const segments of INCLUDE_AFTER_COPY) {
  const relPath = segments.join('/');
  const srcPath = join(srcAbs, ...segments);
  const dstPath = join(dstAbs, ...segments);
  if (!existsSync(srcPath)) {
    console.warn(`  note: ${relPath} not present in src; skipping`);
    continue;
  }
  await mkdir(dirname(dstPath), { recursive: true });
  await cp(srcPath, dstPath, { recursive: true, force: true });
  console.log(`  included: ${relPath}`);
}

console.log('stripping lvi-only eslint-disable lines from .ts / .tsx / .js / .mjs / .cjs files');

function stripLviOnlyEslintDisables(content) {
  const lines = content.split('\n');
  const out = [];
  let changed = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('//')) {
      out.push(line);
      continue;
    }
    let body = trimmed.slice(2).trim();
    let matched = false;
    for (const prefix of ESLINT_PREFIXES) {
      if (body.startsWith(prefix)) {
        body = body.slice(prefix.length).trim();
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push(line);
      continue;
    }
    const sepIdx = body.indexOf(' -- ');
    if (sepIdx !== -1) body = body.slice(0, sepIdx).trim();
    const rules = body.split(',').map((r) => r.trim()).filter((r) => r.length > 0);
    if (rules.length === 0 || !rules.every((r) => r.startsWith('lvi/'))) {
      out.push(line);
      continue;
    }
    changed = true;
  }
  return { content: out.join('\n'), changed };
}

async function* walkCodeFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkCodeFiles(abs);
    } else if (ent.isFile()) {
      const name = ent.name;
      for (const ext of STRIP_EXTENSIONS) {
        if (name.endsWith(ext)) {
          yield abs;
          break;
        }
      }
    }
  }
}

let strippedFiles = 0;
for await (const f of walkCodeFiles(dstAbs)) {
  const raw = await readFile(f, 'utf8');
  if (!raw.includes('eslint-disable')) continue;
  if (!raw.includes('lvi/')) continue;
  const { content, changed } = stripLviOnlyEslintDisables(raw);
  if (changed) {
    await writeFile(f, content, 'utf8');
    strippedFiles++;
  }
}
console.log(`stripped lvi-only eslint-disable lines in ${strippedFiles} files`);

console.log('done');
