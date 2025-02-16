import { describe, expect, it, jest } from 'bun:test';
import { ErrorMessage } from '../../lib/styles';
import { type Options, OptionValues } from '../../lib/options';
import { ArgumentParser } from '../../lib/parser';
import { AnsiFormatter, JsonFormatter } from '../../lib/formatter';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('ArgumentParser', () => {
  describe('parse', () => {
    it('handle zero arguments', () => {
      expect(new ArgumentParser({}).parse()).resolves.toEqual({});
      expect(new ArgumentParser({}).parse('')).resolves.toEqual({});
      expect(new ArgumentParser({}).parse([])).resolves.toEqual({});
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
      const parser = new ArgumentParser(options);
      expect(parser.parse(['fla'])).rejects.toThrow(`Unknown option fla.`);
      expect(parser.parse(['flag'])).rejects.toThrow(
        `Unknown option flag. Similar names are: --flag1, --flag2.`,
      );
      expect(parser.parse(['flags'])).rejects.toThrow(
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
      const parser = new ArgumentParser(options);
      expect(parser.parse([])).rejects.toThrow(`Option preferred is required.`);
    });

    describe('parsing a help option', () => {
      it('throw an empty message when there are no formats', () => {
        const options = {
          help: {
            type: 'help',
            names: ['-h'],
            sections: [{ type: 'groups' }],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-h'], { progName: 'prog' })).rejects.toThrow(/^$/);
      });

      it('save the help message when the option explicitly asks so', () => {
        const options = {
          help: {
            type: 'help',
            names: ['-h'],
            formats: { ansi: AnsiFormatter },
            sections: [{ type: 'groups' }],
            saveMessage: true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ help: undefined });
        expect(parser.parse(['-h'])).resolves.toEqual({
          help: expect.objectContaining({
            message: expect.stringMatching(`  -h    Available formats are {'ansi'}.`),
          }),
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
            formats: { ansi: AnsiFormatter },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.not.toHaveProperty('help');
        expect(parser.parse(['-h'], { progName: 'prog' })).rejects.toThrow(
          `Usage:\n\n  prog [-f] [-h]\n\nArgs:\n\n  -f\n\nOptions:\n\n  -h    the help option`,
        );
      });

      it('throw a help message with usage and custom indentation', () => {
        const options = {
          help: {
            type: 'help',
            names: ['-h'],
            group: 'group  heading',
            formats: { ansi: AnsiFormatter },
            sections: [
              { type: 'usage', title: 'usage  heading' },
              { type: 'groups', noWrap: true },
            ],
            config: { names: { indent: 0 } },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.not.toHaveProperty('help');
        expect(parser.parse(['-h'], { progName: 'prog' })).rejects.toThrow(
          `usage heading\n\nprog [-h]\n\ngroup  heading\n\n-h`,
        );
      });

      it('throw a help message with a JSON format', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f', '--flag'],
          },
          help: {
            type: 'help',
            names: ['-h'],
            formats: { ansi: AnsiFormatter, json: JsonFormatter },
            useFormat: true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-h', 'json'])).rejects.toThrow(
          `[{"type":"flag","names":["-f","--flag"],"preferredName":"-f"},` +
            `{"type":"help","names":["-h"],"formats":{},"useFormat":true,"preferredName":"-h"}]`,
        );
      });

      it('throw a help message with filtered options', () => {
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
            formats: { ansi: AnsiFormatter },
            sections: [{ type: 'groups' }],
            useFilter: true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-h', '-F', '-S'])).rejects.toThrow(
          `  -f, --flag\n  -s, --single  <param>`,
        );
      });

      it('throw the help message of a nested command with option filter', () => {
        const options = {
          help: {
            type: 'help',
            names: ['-h'],
            formats: { ansi: AnsiFormatter },
            sections: [{ type: 'groups' }],
            useNested: true,
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
                formats: { ansi: AnsiFormatter },
                sections: [{ type: 'groups' }],
                useFilter: true,
              },
            }),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-h', '-h'])).rejects.toThrow('  -h');
        expect(parser.parse(['-h', 'cmd1'])).rejects.toThrow('  cmd1  ...');
        expect(parser.parse(['-h', 'cmd2'])).rejects.toThrow('  -f\n  -h');
        expect(parser.parse(['-h', 'cmd2', '-f'])).rejects.toThrow('  -f');
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
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ version: undefined });
        expect(parser.parse(['-v'])).resolves.toEqual({ version: '0.1.0' });
      });

      it('throw a version message with fixed version', () => {
        const options = {
          version: {
            type: 'version',
            names: ['-v'],
            version: '0.1.0',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.not.toHaveProperty('version');
        expect(parser.parse(['-v'])).rejects.toThrow(/^0.1.0$/);
      });

      it('throw a version message with a resolve function', () => {
        const options = {
          version: {
            type: 'version',
            names: ['-v'],
            resolve: (str) => `file://${import.meta.dirname}/../data/${str}`,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-v'])).rejects.toThrow(/^0.1.0$/);
      });

      it('throw an error when a package.json file cannot be found', () => {
        const options = {
          version: {
            type: 'version',
            names: ['-v'],
            resolve: () => `file:///abc`,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-v'])).rejects.toThrow(`Could not find a "package.json" file.`);
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f'])).resolves.toEqual({ flag: 'abc' });
      });

      it('handle an asynchronous callback that throws', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            async parse(_, { format }) {
              throw new ErrorMessage(format(this.type)); // test `this`
            },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f'])).rejects.toThrow('flag');
      });

      it('handle a negation name', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f', '-no-f'],
            parse: (_, { name }) => name !== '-no-f',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f'])).resolves.toEqual({ flag: true });
        expect(parser.parse(['-no-f'])).resolves.toEqual({ flag: false });
      });

      it('skip a certain number of remaining arguments', () => {
        const options = {
          flag1: {
            type: 'flag',
            names: ['-f1'],
          },
          flag2: {
            type: 'flag',
            names: ['-f2'],
            parse() {
              this.skipCount = 1; // test `this`
            },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f2', 'skipped', '-f1'])).resolves.toEqual({
          flag1: true,
          flag2: undefined,
        });
      });

      it('avoid skipping arguments when the skip count is negative', () => {
        const options = {
          flag1: {
            type: 'flag',
            names: ['-f1'],
          },
          flag2: {
            type: 'flag',
            names: ['-f2'],
            parse() {
              this.skipCount = -1; // test `this`
            },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f2', 'arg', '-f1'])).rejects.toThrow('Unknown option arg.');
      });

      it('replace the option value with the result of the parse callback', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            parse: jest.fn((param) => param),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ flag: undefined });
        expect(options.flag.parse).not.toHaveBeenCalled();
        expect(parser.parse(['-f'])).resolves.toEqual({ flag: [] });
        expect(options.flag.parse).toHaveBeenCalledWith([], {
          values: { flag: [] }, // should have been { flag: undefined } at the time of call
          index: 0,
          name: '-f',
          comp: false,
          format: expect.anything(),
        });
        options.flag.parse.mockClear();
        expect(parser.parse(['-f', '-f'])).resolves.toEqual({ flag: [] });
        expect(options.flag.parse).toHaveBeenCalledWith(['-f'], {
          values: { flag: [] }, // should have been { flag: undefined } at the time of call
          index: 0,
          name: '-f',
          comp: false,
          format: expect.anything(),
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f1', '-f2'])).resolves.toEqual({
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f2', '-f1'])).resolves.toEqual({
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-c'])).resolves.toEqual({ command: 'abc' });
      });

      it('handle an asynchronous callback that throws', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            async parse(_, { format }) {
              throw new ErrorMessage(format(this.type)); // test `this`
            },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-c'])).rejects.toThrow('command');
      });

      it('set the option value with the result of the parse callback', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            parse: jest.fn(() => 'abc'),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ command: undefined });
        expect(options.command.parse).not.toHaveBeenCalled();
        expect(parser.parse(['-c'])).resolves.toEqual({ command: 'abc' });
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-c'])).resolves.toEqual({ command: { flag: undefined } });
        expect(options.command.parse).toHaveBeenCalledWith(
          { flag: undefined },
          {
            // should have been { command: undefined } at the time of call
            values: { command: { flag: undefined } },
            index: 0,
            name: '-c',
            format: expect.anything(),
          },
        );
        options.command.parse.mockClear();
        expect(parser.parse(['-c', '-f'])).resolves.toEqual({ command: { flag: true } });
        expect(options.command.parse).toHaveBeenCalledWith(
          { flag: true },
          {
            // should have been { command: undefined } at the time of call
            values: { command: { flag: true } },
            index: 0,
            name: '-c',
            format: expect.anything(),
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-c', '-f'])).resolves.toEqual({ command: { flag: true } });
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-c', '-c'])).resolves.toEqual({ command: { flag: true } });
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-c', '-f2'])).resolves.toEqual({
          command: { flag1: true, flag2: true },
        });
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-s'])).rejects.toThrow(
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
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ single: undefined });
        expect(parser.parse(['-s', ''])).resolves.toEqual({ single: '' });
        expect(parser.parse(['-s', '0', '-s', '1'])).resolves.toEqual({ single: '1' });
      });

      it('replace the option value with the result of the parse callback', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            parse: Number,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-s', ''])).resolves.toEqual({ single: 0 });
        expect(parser.parse(['-s', '0', '-s', '1'])).resolves.toEqual({ single: 1 });
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-a'])).resolves.toEqual({ array: [] });
      });

      it('replace the option value with the parameters', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ array: undefined });
        expect(parser.parse(['-a', ''])).resolves.toEqual({ array: [''] });
        expect(parser.parse(['-a', '0', '-a', '1'])).resolves.toEqual({ array: ['1'] });
      });

      it('replace the option value with the result of the parse callback', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            parse: Number,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-a', ''])).resolves.toEqual({ array: [0] });
        expect(parser.parse(['-a', '0', '-a', '1'])).resolves.toEqual({ array: [1] });
      });

      it('split parameters with a delimiter', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            separator: ',',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-a', '1,2'])).resolves.toEqual({ array: ['1', '2'] });
        expect(parser.parse(['-a', '1,2', '-a'])).resolves.toEqual({ array: [] });
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-a', '0', '-a', '1'])).resolves.toEqual({ array: [0, 1] });
        expect(parser.parse(['-a', '0,1', '-a', '2,3'])).resolves.toEqual({
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
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f'])).resolves.toEqual({ function: null });
      });
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
        const parser = new ArgumentParser(options);
        parser.parseInto(values, []);
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
        const parser = new ArgumentParser(options);
        await parser.parseInto(values, []);
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
        const parser = new ArgumentParser(options);
        parser.parseInto(values, []);
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
        const parser = new ArgumentParser(options);
        const values = { flag: undefined };
        const { warning } = await parser.parseInto(values, ['-f', '-f']);
        expect(warning).toHaveLength(1);
        expect(warning?.message).toEqual(
          `Option -f is deprecated and may be removed in future releases.\n`,
        );
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
        const parser = new ArgumentParser(options);
        const values = { flag1: undefined, flag2: undefined };
        const { warning } = await parser.parseInto(values, ['-f1', '-f2']);
        expect(warning).toHaveLength(2);
        expect(warning?.message).toEqual(
          `Option -f1 is deprecated and may be removed in future releases.\n` +
            `Option -f2 is deprecated and may be removed in future releases.\n`,
        );
      });

      it('report a warning from a nested command', async () => {
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
        const parser = new ArgumentParser(options);
        const values = { command: undefined };
        const { warning } = await parser.parseInto(values, ['-c', '-f']);
        expect(warning).toHaveLength(1);
        expect(warning?.message).toEqual(
          `Option -f is deprecated and may be removed in future releases.\n`,
        );
      });
    });
  });
});
