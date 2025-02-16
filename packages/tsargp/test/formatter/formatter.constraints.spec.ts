import { describe, expect, it } from 'bun:test';
import type { Options } from '../../lib/options';
import { AnsiFormatter } from '../../lib/formatter';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('AnsiFormatter', () => {
  describe('format', () => {
    it('handle a single-valued option with a regex constraint', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          regex: /\d+/s,
        },
      } as const satisfies Options;
      const message = new AnsiFormatter(options).format();
      expect(message.wrap()).toEqual(`  -s  <param>  Values must match the regex /\\d+/s.\n`);
    });

    it('handle a single-valued option with a choices array constraint', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      const message = new AnsiFormatter(options).format();
      expect(message.wrap()).toEqual(`  -s  <param>  Values must be one of {'one', 'two'}.\n`);
    });

    it('handle a single-valued option with a choices record constraint', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: { one: 'two' },
        },
      } as const satisfies Options;
      const message = new AnsiFormatter(options).format();
      expect(message.wrap()).toEqual(`  -s  <param>  Values must be one of {'one'}.\n`);
    });

    it('handle an array-valued option with a limit constraint', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          limit: 2,
        },
      } as const satisfies Options;
      const message = new AnsiFormatter(options).format();
      expect(message.wrap()).toEqual(
        `  -a  [<param>...]  Accepts multiple parameters. Element count is limited to 2.\n`,
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
      const message = new AnsiFormatter(options).format();
      expect(message.wrap()).toEqual(
        `  -a  [<param>...]  Accepts multiple parameters. Duplicate values will be removed.\n`,
      );
    });
  });
});
