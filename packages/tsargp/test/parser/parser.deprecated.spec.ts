import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { parseInto } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('a deprecated option is specified', () => {
    it('report a warning', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          deprecated: '',
        },
      } as const satisfies Options;
      const values = { flag: undefined };
      expect(parseInto(options, values, ['-f', '-f'])).resolves.toEqual({
        warning: expect.objectContaining({
          message: `Option -f is deprecated and may be removed in future releases.\n`,
        }),
      });
    });

    it('report multiple warnings', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          deprecated: '',
        },
        flag2: {
          type: 'flag',
          sources: ['FLAG2'],
          deprecated: '',
        },
      } as const satisfies Options;
      const values = { flag1: undefined, flag2: undefined };
      process.env['FLAG2'] = '';
      expect(parseInto(options, values, ['-f1'])).resolves.toEqual({
        warning: expect.objectContaining({
          message:
            `Option -f1 is deprecated and may be removed in future releases.\n` +
            `Option FLAG2 is deprecated and may be removed in future releases.\n`,
        }),
      });
    });

    it('report a warning from a subcommand', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: {
            flag: {
              type: 'flag',
              names: ['-f'],
              deprecated: '',
            },
          },
        },
      } as const satisfies Options;
      const values = { command: undefined };
      expect(parseInto(options, values, ['-c', '-f'])).resolves.toEqual({
        warning: expect.objectContaining({
          message: `Option -f is deprecated and may be removed in future releases.\n`,
        }),
      });
    });
  });
});
