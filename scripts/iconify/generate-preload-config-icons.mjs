/**
 * 生成 Iconify “预注册（配置/代码引用图标）”子集文件：
 * - 来源：
 *   - 代码中 icon/activeIcon/icon="" 这类字符串图标引用（prefix:name）
 *   - 代码中 createIconifyIcon('prefix:name') 这类工厂函数引用
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
// 避免把“生成产物”本身再次扫描进来，导致示例字符串触发误收集（自引用）。
const EXCLUDE_GLOB = '!packages/icons/src/iconify/preload-config-icons.ts';

// 配置引用：icon/activeIcon 配置中的字符串图标 + Vue 模板中 icon="xxx:yyy"
const RG_PATTERN_CONFIG_ICON = String.raw`\b(?:icon|activeIcon)\s*:\s*['"][a-z0-9-]+:[a-z0-9-]+['"]|\bicon=['"][a-z0-9-]+:[a-z0-9-]+['"]`;

// 工厂调用：createIconifyIcon('xxx:yyy') 这类代码引用
const RG_PATTERN_CREATE_ICONIFY_ICON = String.raw`\bcreateIconifyIcon\s*\(\s*['"][a-z0-9-]+:[a-z0-9-]+['"]\s*\)`;

function runRg(pattern) {
  const args = [
    '--no-filename',
    '--pcre2',
    '-g',
    FILE_GLOB,
    '-g',
    EXCLUDE_GLOB,
    '-o',
    pattern,
    '-S',
    ...SEARCH_DIRS,
  ];
  try {
    return execFileSync('rg', args, { cwd: root, encoding: 'utf8' });
  } catch (error) {
    // rg 找不到匹配时会退出码=1；这种情况返回空结果即可
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 1
    )
      return '';
    throw error;
  }
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

const rawConfigMatches = runRg(RG_PATTERN_CONFIG_ICON)
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const rawFactoryMatches = runRg(RG_PATTERN_CREATE_ICONIFY_ICON)
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const rawMatches = [...rawConfigMatches, ...rawFactoryMatches];

const icons = new Map(); // icon -> count
for (const line of rawMatches) {
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

const header = `/*\n * 该文件由 scripts/iconify/generate-preload-config-icons.mjs 自动生成。\n * 用于预注册项目中“配置/代码引用”的 Iconify 图标子集（不包含 svg 前缀）。\n * 请勿手动编辑。\n */\n`;

// 直接输出可被 Prettier 格式化的对象字面量（数值分隔符由 eslint --fix 负责自动修复）。
const collectionsJson = JSON.stringify(collections, null, 2);

const content =
  `${header}\n` +
  `import { addCollection } from '@vben-core/icons';\n\n` +
  `type IconifyJSON = Parameters<typeof addCollection>[0];\n\n` +
  `const collections = ${collectionsJson} as unknown as IconifyJSON[];\n\n` +
  `let preloaded = false;\n\n` +
  `/**\n` +
  ` * 预注册“配置/代码中引用的 Iconify 图标”（icon/activeIcon/icon="" 或 createIconifyIcon('前缀:名称') 中出现的前缀与名称），降低首屏/关键链的 Iconify 网络请求。\n` +
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

// 生成文件需要同时满足 ESLint 与 Prettier：
// - eslint 用于修复 unicorn/numeric-separators-style（长数字分隔符）
// - prettier 统一格式化输出
execFileSync('pnpm', ['eslint', '--fix', outFile], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync(
  'pnpm',
  ['prettier', '--cache', '--ignore-unknown', '--write', outFile],
  { cwd: root, stdio: 'inherit' },
);

console.log(
  `Generated ${path.relative(root, outFile)} (prefixes=${prefixes.length}, icons=${icons.size})`,
);
