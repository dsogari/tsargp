import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { format } from '../../src/library';

describe('format', () => {
  it('handle a single-valued option with a regex constraint', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        regex: /\d+/s,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s    Values must match the regex /\\d+/s.\n`);
  });

  it('handle a single-valued option with a choices constraint', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        choices: ['one', 'two'],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s    Values must be one of {'one', 'two'}.\n`);
  });

  it('handle an array-valued option with a limit constraint', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        limit: 2,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -a  [...]  Accepts multiple parameters. Element count is limited to 2.\n`,
    );
  });

  it('handle an array-valued option with a unique constraint', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        unique: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -a  [...]  Accepts multiple parameters. Duplicate values will be removed.\n`,
    );
  });
});
