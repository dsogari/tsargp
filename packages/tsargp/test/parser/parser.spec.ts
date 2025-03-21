import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { parse, parseInto, ParsingFlags } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  it('handle zero arguments', () => {
    expect(parse({})).resolves.toEqual({});
    expect(parse({}, '')).resolves.toEqual({});
    expect(parse({}, [])).resolves.toEqual({});
  });

  it('throw an error on unknown option', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['--flag1'],
      },
      flag2: {
        type: 'flag',
        names: ['--flag2'],
      },
    } as const satisfies Options;
    expect(parse(options, ['fla'])).rejects.toThrow(`Unknown option fla.`);
    expect(parse(options, ['flag'])).rejects.toThrow(
      `Unknown option flag. Similar names are: --flag1, --flag2.`,
    );
    expect(parse(options, ['flags'])).rejects.toThrow(
      `Unknown option flags. Similar names are: --flag1, --flag2.`,
    );
  });

  it('throw an error on required option not specified', () => {
    const options = {
      flag: {
        type: 'flag',
        required: true,
        preferredName: 'preferred',
      },
    } as const satisfies Options;
    expect(parse(options, [])).rejects.toThrow(`Option preferred is required.`);
  });

  it('throw an error on unknown option when an option prefix is specified', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
      },
    } as const satisfies Options;
    const flags: ParsingFlags = { optionPrefix: '-' };
    expect(parse(options, ['-s', '-x'], flags)).rejects.toThrow(`Unknown option -x.`);
  });
});

describe('parseInto', () => {
  describe('passing a class instance with previous values', () => {
    it('handle an option with no default value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      const values = new (class {
        flag: true | undefined = true;
      })();
      expect(parseInto(options, values, [])).resolves.toEqual({});
      expect(values).toEqual({ flag: true });
    });

    it('handle an option with a default value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: () => true,
        },
      } as const satisfies Options;
      const values = new (class {
        flag = false;
      })();
      expect(parseInto(options, values, [])).resolves.toEqual({});
      expect(values).toEqual({ flag: true });
    });

    it('handle an option with a default value of undefined', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: undefined,
        },
      } as const satisfies Options;
      const values = new (class {
        flag: true | undefined = true;
      })();
      expect(parseInto(options, values, [])).resolves.toEqual({});
      expect(values).toEqual({ flag: undefined });
    });
  });

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
