import { describe, expect, it, jest } from 'bun:test';
import type { Options } from '../../../src/library';
import { format, parse } from '../../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a command option', () => {
    it('handle a an asynchronous parsing callback', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          parse: async () => 'abc',
        },
      } as const satisfies Options;
      expect(parse(options, ['-c'])).resolves.toEqual({ command: 'abc' });
    });

    it('handle an asynchronous parsing callback that throws', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          async parse() {
            throw Error(this.type); // test access to `this`
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-c'])).rejects.toThrow(/^command$/);
    });

    it('set the option value with the result of the parsing callback', () => {
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

    describe('handle nested option definitions', () => {
      it('handle a nested options object with a help option and program name', () => {
        const options = {
          command: {
            type: 'command',
            names: ['cmd'],
            options: {
              help: {
                type: 'help',
                names: ['-h'],
                sections: [{ type: 'usage' }],
              },
            },
          },
        } as const satisfies Options;
        expect(parse(options, ['cmd', '-h'], { progName: '', format })).rejects.toThrow('[-h]\n');
        expect(parse(options, ['cmd', '-h'], { progName: 'prog', format })).rejects.toThrow(
          'prog cmd [-h]\n',
        );
      });

      it('handle a nested options promise', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            options: Promise.resolve({
              flag: {
                type: 'flag',
                names: ['-f'],
              },
            }),
          },
        } as const satisfies Options;
        expect(parse(options, ['-c', '-f'])).resolves.toEqual({ command: { flag: true } });
      });

      it('handle a nested options callback', () => {
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

      it('handle a nested options asynchronous callback', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            async options() {
              return {
                flag: {
                  type: 'flag',
                  names: this.names, // test access to `this`
                },
              };
            },
          },
        } as const satisfies Options;
        expect(parse(options, ['-c', '-c'])).resolves.toEqual({ command: { flag: true } });
      });

      it('handle nested options with asynchronous callbacks', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            options: {
              flag1: {
                type: 'flag',
                names: ['-f1'],
                default: async () => true,
              },
              flag2: {
                type: 'flag',
                names: ['-f2'],
                parse: async () => true,
              },
            },
            async parse(param) {
              expect(param).toEqual({ flag1: true, flag2: true });
              return param;
            },
          },
        } as const satisfies Options;
        expect(parse(options, ['-c', '-f2'])).resolves.toEqual({
          command: { flag1: true, flag2: true },
        });
      });

      it('handle nested options loaded dynamically from a module', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            options: async () => (await import('../../data/with-help')).default,
          },
        } as const satisfies Options;
        expect(parse(options, ['-c', '-f'])).resolves.toEqual({ command: { flag: true } });
      });
    });
  });
});
