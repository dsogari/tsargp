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
    const flags0: ParsingFlags = { similarity: 0 };
    const flags1: ParsingFlags = { similarity: 0.6 };
    const flags2: ParsingFlags = { similarity: 0.5 };
    expect(parse(options, ['flag'])).rejects.toThrow(`Unknown option flag.`);
    expect(parse(options, ['flag'], flags0)).rejects.toThrow(`Unknown option flag.`);
    expect(parse(options, ['flag'], flags1)).rejects.toThrow(
      `Unknown option flag. Similar names are: --flag1, --flag2.`,
    );
    expect(parse(options, ['fl'], flags1)).rejects.toThrow(`Unknown option fl.`);
    expect(parse(options, ['fl'], flags2)).rejects.toThrow(
      `Unknown option fl. Similar names are: --flag1, --flag2.`,
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

  it('throw an error on nameless required option not specified', () => {
    const options = {
      single: {
        type: 'single',
        required: true,
        positional: true,
      },
    } as const satisfies Options;
    expect(parse(options, [])).rejects.toThrow(`Option is required.`);
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

  it('avoid updating the process title when the program name is empty', () => {
    const options = {
      command: {
        type: 'command',
        names: ['c'],
      },
    } as const satisfies Options;
    process.title = 'dummy';
    expect(parse(options, ['c'], { progName: '' })).resolves.toEqual({ command: {} });
    expect(process.title).toEqual('dummy');
  });

  it('update the process title when handling subcommands', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'], // should not be present in program name
      },
      command: {
        type: 'command',
        names: ['c1'],
        options: {
          flag: {
            type: 'flag',
            names: ['-f'], // should not be present in program name
          },
          command: {
            type: 'command',
            names: ['c2'],
          },
        },
      },
    } as const satisfies Options;
    expect(parse(options, ['-f', 'c1', '-f', 'c2'])).resolves.toEqual({
      flag: true,
      command: { flag: true, command: {} },
    });
    expect(process.title).toMatch(/^bun .+.spec.ts c1 c2$/);
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
});
