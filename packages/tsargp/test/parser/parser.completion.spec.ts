import { describe, expect, it, jest } from 'bun:test';
import { TextMessage } from '../../lib/styles';
import { type Options } from '../../lib/options';
import { type ParsingFlags, ArgumentParser } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('ArgumentParser', () => {
  describe('parse', () => {
    it('complete an empty command line', () => {
      const parser = new ArgumentParser({});
      expect(parser.parse('cmd', { compIndex: 4 })).rejects.toThrow(/^$/);
    });

    it('ignore the last parse callback when completing an option name', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      expect(parser.parse('cmd -s 1 ', { compIndex: 9 })).rejects.toThrow(/^-s$/);
      expect(options.single.parse).not.toHaveBeenCalled();
    });

    it('be able to throw completion words from a parse callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse() {
            throw new TextMessage('abc');
          },
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      expect(parser.parse('cmd -f ', { compIndex: 7 })).rejects.toThrow(/^abc$/);
    });

    describe('parsing errors occur during completion', () => {
      it('ignore an unknown cluster letter', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            cluster: 'f',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        const flags: ParsingFlags = { clusterPrefix: '', compIndex: 7 };
        expect(parser.parse('cmd  x ', flags)).rejects.toThrow(/^-f$/);
        expect(parser.parse('cmd xb ', flags)).rejects.toThrow(/^-f$/);
      });

      it('ignore an unknown option', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd x ', { compIndex: 6 })).rejects.toThrow(/^-f$/);
      });

      it('ignore an invalid parameter', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            choices: ['abc'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -s a ', { compIndex: 9 })).rejects.toThrow(/^-s$/);
        expect(parser.parse('cmd -s a -s ', { compIndex: 12 })).rejects.toThrow(/^abc$/);
      });

      it('ignore an error thrown by a parse callback of a flag option', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            parse: jest.fn(() => {
              throw 'abc';
            }),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -f ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
        expect(options.flag.parse).toHaveBeenCalledWith([''], {
          values: { flag: undefined },
          index: 0,
          name: '-f',
          comp: true,
          format: expect.anything(),
        });
        expect(options.flag.parse).toHaveBeenCalled();
      });

      it('ignore an error thrown by a parse callback of a single-valued option', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            parse: jest.fn(() => {
              throw 'abc';
            }),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -s 1 -s 1 ', { compIndex: 14 })).rejects.toThrow(/^-s$/);
        expect(options.single.parse).toHaveBeenCalledWith('1', {
          values: { single: undefined },
          index: 0,
          name: '-s',
          comp: true,
          format: expect.anything(),
        });
        expect(options.single.parse).toHaveBeenCalled();
      });
    });

    describe('performing word completion', () => {
      it('handle a help option', () => {
        const options = {
          help: {
            type: 'help',
            names: ['-h'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^-h$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^-h$/);
        expect(parser.parse('cmd -h', { compIndex: 6 })).rejects.toThrow(/^-h$/);
        expect(parser.parse('cmd -h ', { compIndex: 7 })).rejects.toThrow(/^-h$/);
        expect(parser.parse('cmd -h=', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd -h= ', { compIndex: 8 })).rejects.toThrow(/^-h$/);
      });

      it('handle a version option', () => {
        const options = {
          version: {
            type: 'version',
            names: ['-v'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^-v$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^-v$/);
        expect(parser.parse('cmd -v', { compIndex: 6 })).rejects.toThrow(/^-v$/);
        expect(parser.parse('cmd -v ', { compIndex: 7 })).rejects.toThrow(/^-v$/);
        expect(parser.parse('cmd -v=', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd -v= ', { compIndex: 8 })).rejects.toThrow(/^-v$/);
      });

      it('handle a command option', () => {
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
            parse: jest.fn(),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^-c$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^-c$/);
        expect(parser.parse('cmd -c', { compIndex: 6 })).rejects.toThrow(/^-c$/);
        expect(parser.parse('cmd -c ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
        expect(parser.parse('cmd -c=', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd -c= ', { compIndex: 8 })).rejects.toThrow(/^-c$/);
        expect(options.command.parse).not.toHaveBeenCalled();
      });

      it('handle a flag option', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            parse: jest.fn(),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^-f$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^-f$/);
        expect(parser.parse('cmd -f', { compIndex: 6 })).rejects.toThrow(/^-f$/);
        expect(options.flag.parse).not.toHaveBeenCalled();
        expect(parser.parse('cmd -f ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
        expect(options.flag.parse).toHaveBeenCalled();
        options.flag.parse.mockClear();
        expect(parser.parse('cmd -f=', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd -f= ', { compIndex: 8 })).rejects.toThrow(/^-f$/);
        expect(options.flag.parse).not.toHaveBeenCalled(); // option was ignored
      });

      it('handle an array-valued option', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^-a$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^-a$/);
        expect(parser.parse('cmd -a', { compIndex: 6 })).rejects.toThrow(/^-a$/);
        expect(parser.parse('cmd -a ', { compIndex: 7 })).rejects.toThrow(/^-a$/);
        expect(parser.parse('cmd -a 1', { compIndex: 8 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd -a 1 ', { compIndex: 9 })).rejects.toThrow(/^-a$/);
        expect(parser.parse('cmd -a=', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd -a= ', { compIndex: 8 })).rejects.toThrow(/^-a$/);
        expect(parser.parse('cmd -a 1 -a', { compIndex: 11 })).rejects.toThrow(/^-a$/);
      });

      it('handle a flag option that wants to break the parsing loop', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            break: true,
            parse: jest.fn(),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -f ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
        expect(options.flag.parse).toHaveBeenCalled();
      });

      it('handle a positional marker', () => {
        const options = {
          single: {
            type: 'single',
            positional: '--',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^--$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^--$/);
        expect(parser.parse('cmd --', { compIndex: 6 })).rejects.toThrow(/^--$/);
        expect(parser.parse('cmd -- ', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd --=', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd --= ', { compIndex: 8 })).rejects.toThrow(/^--$/);
      });

      it('handle a positional option with choices', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            choices: ['one', 'two'],
            positional: true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^one\ntwo\n-s$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^-s$/);
        expect(parser.parse('cmd o', { compIndex: 5 })).rejects.toThrow(/^one$/);
        expect(parser.parse('cmd t', { compIndex: 5 })).rejects.toThrow(/^two$/);
        expect(parser.parse('cmd x', { compIndex: 5 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd one o', { compIndex: 9 })).rejects.toThrow(/^one$/);
      });

      it('handle a positional marker with choices', () => {
        const options = {
          single: {
            type: 'single',
            choices: ['one', 'two'],
            positional: '--',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^one\ntwo\n--$/);
        expect(parser.parse('cmd -', { compIndex: 5 })).rejects.toThrow(/^--$/);
        expect(parser.parse('cmd --', { compIndex: 6 })).rejects.toThrow(/^--$/);
        expect(parser.parse('cmd -- ', { compIndex: 7 })).rejects.toThrow(/^one\ntwo$/);
        expect(parser.parse('cmd -- o', { compIndex: 8 })).rejects.toThrow(/^one$/);
        expect(parser.parse('cmd --=', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd --= ', { compIndex: 8 })).rejects.toThrow(/^one\ntwo\n--$/);
      });

      it('handle a positional function option with parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: 2,
            positional: true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd ', { compIndex: 4 })).rejects.toThrow(/^-f$/);
        expect(parser.parse('cmd a ', { compIndex: 6 })).rejects.toThrow(/^$/);
        expect(parser.parse('cmd a a ', { compIndex: 8 })).rejects.toThrow(/^-f$/);
      });

      it('handle a cluster argument', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            cluster: 'f',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        const flags1: ParsingFlags = { clusterPrefix: '', compIndex: 6 };
        expect(parser.parse('cmd  f', flags1)).rejects.toThrow(/^$/);
        expect(parser.parse('cmd ff', flags1)).rejects.toThrow(/^$/);
        const flags2: ParsingFlags = { clusterPrefix: '-', compIndex: 7 };
        expect(parser.parse('cmd   -', flags2)).rejects.toThrow(/^-f$/);
        expect(parser.parse('cmd  -f', flags2)).rejects.toThrow(/^-f$/);
        expect(parser.parse('cmd -ff', flags2)).rejects.toThrow(/^$/);
      });

      it('complete the parameter of a clustered option (and ignore the rest)', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            cluster: 'f',
          },
          single: {
            type: 'single',
            names: ['-s'],
            choices: ['one'],
            cluster: 's',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        const flags: ParsingFlags = { clusterPrefix: '', compIndex: 7 };
        expect(parser.parse('cmd sf  rest', flags)).rejects.toThrow(/^one$/);
      });
    });

    describe('a complete callback is specified', () => {
      it('ignore an error thrown by the complete callback', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            complete: jest.fn(() => {
              throw 'abc';
            }),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -s ', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(options.single.complete).toHaveBeenCalled();
      });

      it('handle a single-valued option', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            complete: jest.fn((param) => [param]),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -s ', { compIndex: 7 })).rejects.toThrow(/^$/);
        expect(options.single.complete).toHaveBeenCalledWith('', {
          values: { strings: undefined },
          index: 0,
          name: '-s',
          prev: [],
        });
        options.single.complete.mockClear();
        expect(parser.parse('cmd -s 1', { compIndex: 8 })).rejects.toThrow(/^1$/);
        expect(options.single.complete).toHaveBeenCalledWith('1', {
          values: { single: undefined },
          index: 0,
          name: '-s',
          prev: [],
        });
      });

      it('handle an array-valued option', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            complete: jest.fn((param) => [param]),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -a ', { compIndex: 7 })).rejects.toThrow(/^\n-a$/);
        expect(options.array.complete).toHaveBeenCalledWith('', {
          values: { strings: undefined },
          index: 0,
          name: '-a',
          prev: [],
        });
        options.array.complete.mockClear();
        expect(parser.parse('cmd -a 1', { compIndex: 8 })).rejects.toThrow(/^1$/);
        expect(options.array.complete).toHaveBeenCalledWith('1', {
          values: { array: undefined },
          index: 0,
          name: '-a',
          prev: [],
        });
        options.array.complete.mockClear();
        expect(parser.parse('cmd -a 1 ', { compIndex: 9 })).rejects.toThrow(/^\n-a$/);
        expect(options.array.complete).toHaveBeenCalledWith('', {
          values: { array: undefined },
          index: 0,
          name: '-a',
          prev: ['1'],
        });
      });

      it('handle a polyadic function option', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: 2,
            parse: jest.fn(),
            complete() {
              return [this.type]; // test `this`
            },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd -f 1 2', { compIndex: 10 })).rejects.toThrow(/^function$/);
        expect(options.function.parse).not.toHaveBeenCalled();
      });

      it('handle a positional function option', () => {
        const options = {
          function: {
            type: 'function',
            paramCount: 2,
            positional: true,
            complete: jest.fn((param) => [param]),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse('cmd a', { compIndex: 5 })).rejects.toThrow(/^a$/);
        expect(options.function.complete).toHaveBeenCalledWith('a', {
          values: { function: undefined },
          index: 0,
          name: '',
          prev: [],
        });
        options.function.complete.mockClear();
        expect(parser.parse('cmd a a', { compIndex: 7 })).rejects.toThrow(/^a$/);
        expect(options.function.complete).toHaveBeenCalledWith('a', {
          values: { function: undefined },
          index: 0,
          name: '',
          prev: ['a'],
        });
        options.function.complete.mockClear();
        expect(parser.parse('cmd a a a', { compIndex: 9 })).rejects.toThrow(/^a$/);
        expect(options.function.complete).toHaveBeenCalledWith('a', {
          values: { function: null },
          index: 0,
          name: '',
          prev: [],
        });
      });
    });
  });
});
