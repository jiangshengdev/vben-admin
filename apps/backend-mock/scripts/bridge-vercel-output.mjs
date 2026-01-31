import fs from 'node:fs';
import path from 'node:path';

function ensureVercelFunctionAliases(outputDir) {
  const functionsDir = path.join(outputDir, 'functions');
  if (!fs.existsSync(functionsDir)) return;

  for (const entry of fs.readdirSync(functionsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.endsWith('.func')) continue;

    // Some Vercel runtimes/build pipelines look for `functions/<name>/` even if
    // the Build Output API uses `functions/<name>.func/`.
    const aliasName = entry.name.slice(0, -'.func'.length);
    const aliasDir = path.join(functionsDir, aliasName);
    if (fs.existsSync(aliasDir)) continue;

    fs.cpSync(path.join(functionsDir, entry.name), aliasDir, {
      recursive: true,
      verbatimSymlinks: true,
    });
  }
}

// In some monorepo setups, the Vercel "Root Directory" is the repo root, but
// the build command runs this package via `pnpm -C apps/backend-mock run build`.
// Nitro's `vercel` preset outputs to `<rootDir>/.vercel/output`, which ends up at
// `apps/backend-mock/.vercel/output` and is not picked up by Vercel.
//
// This script bridges that gap by copying the generated Build Output API folder
// to the repo root (`../../.vercel/output`) during Vercel builds.
const isVercelBuild =
  process.env.VERCEL === '1' ||
  process.env.VERCEL === 'true' ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.VERCEL_URL);

if (!isVercelBuild) process.exit(0);

const pkgRoot = process.cwd();
const localOutput = path.join(pkgRoot, '.vercel', 'output');

// Best-effort detection of the monorepo root (two levels up from apps/backend-mock).
const repoRoot = path.resolve(pkgRoot, '..', '..');
const workspaceFile = path.join(repoRoot, 'pnpm-workspace.yaml');
const rootOutput = path.join(repoRoot, '.vercel', 'output');

if (!fs.existsSync(localOutput)) process.exit(0);
if (!fs.existsSync(workspaceFile)) process.exit(0);

ensureVercelFunctionAliases(localOutput);

fs.rmSync(rootOutput, { force: true, recursive: true });
fs.mkdirSync(path.dirname(rootOutput), { recursive: true });
fs.cpSync(localOutput, rootOutput, { recursive: true, verbatimSymlinks: true });

ensureVercelFunctionAliases(rootOutput);
