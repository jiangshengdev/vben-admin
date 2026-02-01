import type { CAC } from 'cac';

import { execaCommand } from '@vben/node-utils';

interface LintCommandOptions {
  /**
   * Format lint problem.
   */
  format?: boolean;
}

const eslintTargets = [
  'apps',
  'packages',
  'internal',
  'docs',
  'playground',
  'scripts',
  'eslint.config.mjs',
  'vitest.config.ts',
];

async function runEslintSequential(args: string) {
  for (const target of eslintTargets) {
    await execaCommand(`eslint ${target} ${args}`, {
      stdio: 'inherit',
    });
  }
}

async function runLint({ format }: LintCommandOptions) {
  // process.env.FORCE_COLOR = '3';

  if (format) {
    await execaCommand(`stylelint "**/*.{vue,css,less,scss}" --cache --fix`, {
      stdio: 'inherit',
    });
    await runEslintSequential('--cache --fix');
    await execaCommand(`prettier . --write --cache --log-level warn`, {
      stdio: 'inherit',
    });
    return;
  }
  await runEslintSequential('--cache');
  await Promise.all([
    execaCommand(`prettier . --ignore-unknown --check --cache`, {
      stdio: 'inherit',
    }),
    execaCommand(`stylelint "**/*.{vue,css,less,scss}" --cache`, {
      stdio: 'inherit',
    }),
  ]);
}

function defineLintCommand(cac: CAC) {
  cac
    .command('lint')
    .usage('Batch execute project lint check.')
    .option('--format', 'Format lint problem.')
    .action(runLint);
}

export { defineLintCommand };
