/**
 * 生成 Iconify “预注册（配置引用图标）”子集文件：
 * - 来源：代码中 icon/activeIcon/icon="" 这类字符串图标引用（prefix:name）
 * - 目标：把这些图标子集打进构建产物，减少运行时对 https://api.iconify.design 的请求
 * - 约束：不包含 `svg` 前缀（本项目的 svg 前缀走本地资源，不需要预注册）
 *
 * 用法：
 *   node scripts/iconify/generate-preload-config-icons.mjs
 *
 * 产物：
 *   packages/icons/src/iconify/preload-config-icons.ts
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();

const SEARCH_DIRS = ['apps', 'packages', 'internal', 'playground'];
const FILE_GLOB = '*.{ts,tsx,js,jsx,mts,mjs,vue}';

// A类：icon/activeIcon 配置中的字符串图标 + vue 模板中 icon="xxx:yyy"
const RG_PATTERN_A = String.raw`\b(?:icon|activeIcon)\s*:\s*['"][a-z0-9-]+:[a-z0-9-]+['"]|\bicon=['"][a-z0-9-]+:[a-z0-9-]+['"]`;

function runRg(pattern) {
  const args = [
    '--no-filename',
    '--pcre2',
    '-g',
    FILE_GLOB,
    '-o',
    pattern,
    '-S',
    ...SEARCH_DIRS,
  ];
  return execFileSync('rg', args, { cwd: root, encoding: 'utf8' });
}

function extractIcon(str) {
  const m = str.match(/([a-z0-9-]+:[a-z0-9-]+)/);
  return m ? m[1] : null;
}

function findPnpmPackageDir(prefixWithPlus) {
  const pnpmRoot = path.join(root, 'node_modules/.pnpm');
  const entries = fs.readdirSync(pnpmRoot, { withFileTypes: true });
  const match = entries
    .filter((e) => e.isDirectory() && e.name.startsWith(`${prefixWithPlus}@`))
    .map((e) => e.name)
    .toSorted()[0];
  if (!match) {
    throw new Error(`未找到 pnpm 依赖目录：${prefixWithPlus}（请先安装依赖）`);
  }
  return path.join(pnpmRoot, match);
}

const iconifyJsonPkgDir = findPnpmPackageDir('@iconify+json');
const iconifyUtilsPkgDir = findPnpmPackageDir('@iconify+utils');

const iconifyJsonRoot = path.join(
  iconifyJsonPkgDir,
  'node_modules/@iconify/json/json',
);
const iconifyUtilsGetIconsPath = path.join(
  iconifyUtilsPkgDir,
  'node_modules/@iconify/utils/lib/icon-set/get-icons.js',
);

// 直接从 pnpm 虚拟存储导入，避免根目录未声明依赖导致无法解析 @iconify/utils/@iconify/json。
const { getIcons } = await import(pathToFileURL(iconifyUtilsGetIconsPath));

function loadIconSet(prefix) {
  const file = path.join(iconifyJsonRoot, `${prefix}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`未找到图标集文件：${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeFileAtomic(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
}

const rawA = runRg(RG_PATTERN_A)
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const icons = new Map(); // icon -> count
for (const line of rawA) {
  const icon = extractIcon(line);
  if (!icon) continue;
  const [prefix] = icon.split(':', 1);
  if (prefix === 'svg') continue;
  icons.set(icon, (icons.get(icon) || 0) + 1);
}

const iconsByPrefix = new Map(); // prefix -> Set<name>
for (const icon of icons.keys()) {
  const [prefix, name] = icon.split(':');
  if (!iconsByPrefix.has(prefix)) iconsByPrefix.set(prefix, new Set());
  iconsByPrefix.get(prefix).add(name);
}

const prefixes = [...iconsByPrefix.keys()].toSorted((a, b) =>
  a.localeCompare(b),
);

const collections = [];
for (const prefix of prefixes) {
  const names = [...iconsByPrefix.get(prefix)].toSorted((a, b) =>
    a.localeCompare(b),
  );
  const iconSet = loadIconSet(prefix);
  const subset = getIcons(iconSet, names, true);
  if (!subset) {
    throw new Error(`无法从图标集提取子集: prefix=${prefix}`);
  }
  collections.push(subset);
}

const outFile = path.join(
  root,
  'packages/icons/src/iconify/preload-config-icons.ts',
);

const header = `/*\n * 该文件由 scripts/iconify/generate-preload-config-icons.mjs 自动生成。\n * 用于预注册项目中“字符串 icon”用到的 Iconify 图标子集（不包含 svg 前缀）。\n * 请勿手动编辑。\n */\n`;

// JSON 体积较大，保持 0 空格缩进以减少源码体积（最终 bundle 体积以压缩为准）
const collectionsJson = JSON.stringify(collections);

const content =
  `${header}\n` +
  `import { addCollection } from '@vben-core/icons';\n\n` +
  `type IconifyJSON = Parameters<typeof addCollection>[0];\n\n` +
  `// prettier-ignore\n` +
  `const collections = ${collectionsJson} as unknown as IconifyJSON[];\n\n` +
  `let preloaded = false;\n\n` +
  `/**\n` +
  ` * 预注册“配置中引用的 Iconify 图标”（icon/activeIcon/icon="" 中出现的 prefix:name），降低首屏/关键链的 Iconify 网络请求。\n` +
  ` * 注意：本函数不会禁用网络加载；未预注册的图标仍可能在运行时被在线加载。\n` +
  ` */\n` +
  `export function preloadIconifyConfigIcons() {\n` +
  `  if (preloaded) return;\n` +
  `  preloaded = true;\n` +
  `  for (const collection of collections) {\n` +
  `    addCollection(collection);\n` +
  `  }\n` +
  `}\n`;

writeFileAtomic(outFile, content);

console.log(
  `Generated ${path.relative(root, outFile)} (prefixes=${prefixes.length}, icons=${icons.size})`,
);
