import { Configuration } from 'lint-staged';

export default {
  '*': [
    `prettier --write`, // other tools may choke on badly formatted input
    `cspell --no-must-find-files`,
    `eslint --no-warn-ignored`,
  ],
  '*.ts': () => 'bun test --coverage', // this can be run concurrently
  'packages/tsargp/**/*': () => [
    'bun run --cwd packages/tsargp build', // should print the minified size
    'publint --strict packages/tsargp', // publint needs the dist files
  ],
  'packages/docs/**/*': () => [
    'bun run --cwd packages/docs build', // this is slow
    'publint --strict packages/docs', // publint needs the dist files
  ],
} as const satisfies Configuration;
