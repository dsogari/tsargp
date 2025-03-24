export default {
  '*': (paths) => {
    const joined = paths.map((path) => `'${path}'`).join(' ');
    return [
      `prettier --write ${joined}`, // other tools may choke on badly formatted input
      `cspell --no-must-find-files ${joined}`,
      `eslint --no-warn-ignored ${joined}`,
    ];
  },
  '*.ts': () => 'bun test --coverage', // this can be run concurrently
  'packages/tsargp/**/*': () => [
    'bun run --cwd packages/tsargp build', // should print the minified size
    'publint --strict packages/tsargp', // publint needs the dist files
  ],
  'packages/docs/**/*': () => [
    'bun run --cwd packages/docs build', // this is slow
    'publint --strict packages/docs', // publint needs the dist files
  ],
};
