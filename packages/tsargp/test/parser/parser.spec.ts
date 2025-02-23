import { describe, expect, it, jest } from 'bun:test';
import { type Options, OptionValues } from '../../lib/options';
import { parse, parseInto, ParsingFlags } from '../../lib/parser';

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

  describe('an option prefix is specified', () => {
    const flags: ParsingFlags = { optionPrefix: '-' };

    it('throw an error on missing parameter to single-valued option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', '-f'], flags)).rejects.toThrow(
        `Missing parameter to option -s.`,
      );
    });

    it('throw an error on missing parameter to function option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: [1, 2],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', '-s'], flags)).rejects.toThrow(
        `Missing parameter to option -f.`,
      );
    });

    it('throw an error on unknown option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', '-x'], flags)).rejects.toThrow(`Unknown option -x.`);
    });
  });

  describe('parsing a help option', () => {
    it('save the help message when the option explicitly asks so', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          saveMessage: true,
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ help: undefined });
      expect(parse(options, ['-h'])).resolves.toEqual({
        help: expect.objectContaining({ message: '  -h\n' }),
      });
    });

    it('throw a help message with default settings', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          group: 'Args:',
        },
        help: {
          type: 'help',
          names: ['-h'],
          synopsis: 'the help option',
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('help');
      expect(parse(options, ['-h'], { progName: 'prog' })).rejects.toThrow(
        `Usage:\n\n  prog [-f] [-h]\n\nArgs:\n\n  -f\n\nOptions:\n\n  -h    the help option\n`,
      );
    });

    it('throw a help message with usage and custom indentation', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          group: 'group  heading',
          sections: [
            { type: 'usage', title: 'usage  heading' },
            { type: 'groups', noWrap: true },
          ],
          layout: { names: { indent: 0 } },
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('help');
      expect(parse(options, ['-h'], { progName: 'prog' })).rejects.toThrow(
        `usage heading\n\nprog [-h]\n\ngroup  heading\n\n-h\n`,
      );
    });

    it('throw a help message with option filter', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f', '--flag'],
        },
        flag2: {
          type: 'flag',
          synopsis: 'A flag option',
        },
        single: {
          type: 'single',
          names: ['-s', '--single'],
        },
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          useFilter: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-F', '-S'])).rejects.toThrow(
        `  -f, --flag\n  -s, --single  <param>\n`,
      );
    });

    it('throw the help message of a subcommand with option filter', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          layout: { descr: { hidden: true } },
          useCommand: true,
          useFilter: true,
        },
        command1: {
          type: 'command',
          names: ['cmd1'],
          options: {
            flag: {
              type: 'flag',
              names: ['-f'],
            },
          },
        },
        command2: {
          type: 'command',
          names: ['cmd2'],
          options: () => ({
            // test asynchronous
            flag: {
              type: 'flag',
              names: ['-f'],
            },
            help: {
              type: 'help',
              names: ['-h'],
              sections: [{ type: 'groups' }],
              layout: { descr: { hidden: true } },
              useFilter: true,
            },
          }),
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-h'])).rejects.toThrow('  -h\n');
      expect(parse(options, ['-h', 'cmd1'])).rejects.toThrow('  cmd1  ...\n');
      expect(parse(options, ['-h', 'cmd2'])).rejects.toThrow('  -f\n  -h\n');
      expect(parse(options, ['-h', 'cmd2', '-f'])).rejects.toThrow('  -f\n');
    });

    it('throw the help message of a subcommand with a dynamic module with no help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          layout: { descr: { hidden: true } },
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: '../data/no-help',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-h', '-c'], flags)).rejects.toThrow('  -c  ...\n');
    });

    it('throw the help message of a subcommand with a dynamic module with a help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: '../data/with-help',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-h', '-c'], flags)).rejects.toThrow('  -f\n');
    });
  });

  describe('parsing a version option', () => {
    it('save the version message when the option explicitly asks so', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '0.1.0',
          saveMessage: true,
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ version: undefined });
      expect(parse(options, ['-v'])).resolves.toEqual({ version: '0.1.0' });
    });

    it('throw a version message with fixed version', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '0.1.0',
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('version');
      expect(parse(options, ['-v'])).rejects.toThrow(/^0.1.0$/);
    });

    it('throw a version message from a version file', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '../data/with-version.json',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-v'], flags)).rejects.toThrow(/^0.0.0$/);
    });

    it('throw a version message from a file that does not contain a version field', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '../data/no-version.json',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-v'], flags)).rejects.toThrow(/^undefined$/);
    });

    it('throw an error when a module resolution function is not specified', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '../data/with-version.json',
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow('Missing module resolution function.');
    });

    it('throw an error when a version file is not valid JSON', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '../data/invalid.json',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-v'], flags)).rejects.toThrow(`JSON Parse error`);
    });

    it('throw an error when a version file cannot be found', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '../data/absent.json',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-v'], flags)).rejects.toThrow(`Could not find a version JSON file.`);
    });
  });

  describe('parsing a flag option', () => {
    it('handle an asynchronous callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse: () => 'abc',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: 'abc' });
    });

    it('handle an asynchronous callback that throws', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          async parse() {
            throw Error(this.type); // test `this`
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).rejects.toThrow('flag');
    });

    it('handle a negation name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f', '-no-f'],
          parse: (_, { name }) => name !== '-no-f',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: true });
      expect(parse(options, ['-no-f'])).resolves.toEqual({ flag: false });
    });

    it('replace the option value with the result of the parse callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ flag: undefined });
      expect(options.flag.parse).not.toHaveBeenCalled();
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: '' });
      expect(options.flag.parse).toHaveBeenCalledWith('', {
        values: { flag: '' }, // should have been { flag: undefined } at the time of call
        index: 0,
        name: '-f',
        comp: false,
      });
      options.flag.parse.mockClear();
      expect(parse(options, ['-f', '-f'])).resolves.toEqual({ flag: '' });
      expect(options.flag.parse).toHaveBeenCalledWith('', {
        values: { flag: '' }, // should have been { flag: undefined } at the time of call
        index: 0,
        name: '-f',
        comp: false,
      });
      expect(options.flag.parse).toHaveBeenCalledTimes(2);
    });

    it('break the parsing loop when the option explicitly asks so', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          parse: jest.fn(() => 'abc'),
          break: true,
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1', '-f2'])).resolves.toEqual({
        flag1: 'abc',
        flag2: undefined,
      });
      expect(options.flag1.parse).toHaveBeenCalled();
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });

    it('expose parsed values to the parse callback', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          parse(_, { values }) {
            expect((values as OptionValues<typeof options>).flag2).toBeTruthy();
          },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f2', '-f1'])).resolves.toEqual({
        flag1: undefined,
        flag2: true,
      });
    });
  });

  describe('parsing a command option', () => {
    it('handle a an asynchronous callback', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          parse: () => 'abc',
        },
      } as const satisfies Options;
      expect(parse(options, ['-c'])).resolves.toEqual({ command: 'abc' });
    });

    it('handle an asynchronous callback that throws', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          async parse() {
            throw Error(this.type); // test `this`
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-c'])).rejects.toThrow('command');
    });

    it('set the option value with the result of the parse callback', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          parse: jest.fn(() => 'abc'),
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ command: undefined });
      expect(options.command.parse).not.toHaveBeenCalled();
      expect(parse(options, ['-c'])).resolves.toEqual({ command: 'abc' });
      expect(options.command.parse).toHaveBeenCalled();
    });

    it('handle nested option definitions', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: {
            flag: {
              type: 'flag',
              names: ['-f'],
            },
          },
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, ['-c'])).resolves.toEqual({ command: { flag: undefined } });
      expect(options.command.parse).toHaveBeenCalledWith(
        { flag: undefined },
        {
          // should have been { command: undefined } at the time of call
          values: { command: { flag: undefined } },
          index: 0,
          name: '-c',
          comp: false,
        },
      );
      options.command.parse.mockClear();
      expect(parse(options, ['-c', '-f'])).resolves.toEqual({ command: { flag: true } });
      expect(options.command.parse).toHaveBeenCalledWith(
        { flag: true },
        {
          // should have been { command: undefined } at the time of call
          values: { command: { flag: true } },
          index: 0,
          name: '-c',
          comp: false,
        },
      );
    });

    it('handle an options callback', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: jest.fn(
            (): Options => ({
              flag: {
                type: 'flag',
                names: ['-f'],
              },
            }),
          ),
        },
      } as const satisfies Options;
      expect(parse(options, ['-c', '-f'])).resolves.toEqual({ command: { flag: true } });
      expect(options.command.options).toHaveBeenCalled();
    });

    it('handle an async options callback', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          async options() {
            return {
              flag: {
                type: 'flag',
                names: this.names, // test `this`
              },
            };
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-c', '-c'])).resolves.toEqual({ command: { flag: true } });
    });

    it('handle nested option definitions with asynchronous callbacks', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: {
            flag1: {
              type: 'flag',
              names: ['-f1'],
              default: () => true,
            },
            flag2: {
              type: 'flag',
              names: ['-f2'],
              parse: () => true,
            },
          },
          parse(param) {
            expect(param).toEqual({ flag1: true, flag2: true });
            return param;
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-c', '-f2'])).resolves.toEqual({
        command: { flag1: true, flag2: true },
      });
    });

    it('handle nested option definitions loaded dynamically from a module', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: '../data/with-help',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      // @ts-expect-error because types are not available at this point
      expect(parse(options, ['-c', '-f'], flags)).resolves.toEqual({ command: { flag: true } });
    });
  });

  describe('parsing a single-valued option', () => {
    it('throw an error on missing parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-s'])).rejects.toThrow(
        `Wrong number of parameters to option -s: requires exactly 1.`,
      );
    });

    it('replace the option value with the parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ single: undefined });
      expect(parse(options, ['-s', ''])).resolves.toEqual({ single: '' });
      expect(parse(options, ['-s', '0', '-s', '1'])).resolves.toEqual({ single: '1' });
    });

    it('replace the option value with the result of the parse callback', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: Number,
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', ''])).resolves.toEqual({ single: 0 });
      expect(parse(options, ['-s', '0', '-s', '1'])).resolves.toEqual({ single: 1 });
    });
  });

  describe('parsing an array-valued option', () => {
    it('accept zero parameters', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-a'])).resolves.toEqual({ array: [] });
    });

    it('replace the option value with the parameters', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ array: undefined });
      expect(parse(options, ['-a', ''])).resolves.toEqual({ array: [''] });
      expect(parse(options, ['-a', '0', '-a', '1'])).resolves.toEqual({ array: ['1'] });
    });

    it('replace the option value with the result of the parse callback', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          parse: Number,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', ''])).resolves.toEqual({ array: [0] });
      expect(parse(options, ['-a', '0', '-a', '1'])).resolves.toEqual({ array: [1] });
    });

    it('split parameters with a delimiter', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '1,2'])).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['-a', '1,2', '-a'])).resolves.toEqual({ array: [] });
    });

    it('append values when the option explicitly asks so', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          append: true,
          separator: ',',
          parse: Number,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '0', '-a', '1'])).resolves.toEqual({ array: [0, 1] });
      expect(parse(options, ['-a', '0,1', '-a', '2,3'])).resolves.toEqual({
        array: [0, 1, 2, 3],
      });
    });
  });

  describe('parsing a function option', () => {
    it('accept zero parameters', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ function: [] });
    });
  });

  it('replace the option value with the parameters', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
      },
    } as const satisfies Options;
    expect(parse(options, [])).resolves.toEqual({ function: undefined });
    expect(parse(options, ['-f', ''])).resolves.toEqual({ function: [''] });
    expect(parse(options, ['-f', '0', '-f', '1'])).resolves.toEqual({ function: ['1'] });
  });

  it('replace the option value with the result of the parse callback', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
        parse: Number,
      },
    } as const satisfies Options;
    expect(parse(options, ['-f', ''])).resolves.toEqual({ function: 0 });
    expect(parse(options, ['-f', '0', '-f', '1'])).resolves.toEqual({ function: 1 });
  });

  it('skip a certain number of remaining arguments', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
        paramCount: 0,
        parse(param) {
          this.skipCount = Number(param[0]); // test `this`
        },
      },
    } as const satisfies Options;
    expect(parse(options, ['-f', '1'])).resolves.toEqual({ function: undefined });
    expect(parse(options, ['-f', '1', '2'])).rejects.toThrow('Unknown option 2.');
    expect(parse(options, ['-f', '0'])).rejects.toThrow('Unknown option 0.');
    expect(parse(options, ['-f', '-1'])).rejects.toThrow('Unknown option -1.');
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
      parseInto(options, values, []);
      expect(values).toEqual({ flag: true });
    });

    it('handle an option with a default value', async () => {
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
      await parseInto(options, values, []);
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
      parseInto(options, values, []);
      expect(values).toEqual({ flag: undefined });
    });
  });

  describe('a deprecated option is specified', () => {
    it('report a warning', async () => {
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

    it('report multiple warnings', async () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          deprecated: '',
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          deprecated: '',
        },
      } as const satisfies Options;
      const values = { flag1: undefined, flag2: undefined };
      expect(parseInto(options, values, ['-f1', '-f2'])).resolves.toEqual({
        warning: expect.objectContaining({
          message:
            `Option -f1 is deprecated and may be removed in future releases.\n` +
            `Option -f2 is deprecated and may be removed in future releases.\n`,
        }),
      });
    });

    it('report a warning from a subcommand', async () => {
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
