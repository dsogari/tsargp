import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import type { Options, ParsingFlags } from '../../src/library';
import { parse, JsonMessage, TextMessage, AnsiString } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  it('complete an empty command line', () => {
    expect(parse({}, 'cmd', { compIndex: 4 })).rejects.toThrow(/^$/);
  });

  it('ignore the last parsing callback when completing an option name', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        parse: jest.fn((param) => param),
      },
    } as const satisfies Options;
    expect(parse(options, 'cmd -s 1 ', { compIndex: 9 })).rejects.toThrow(/^-s$/);
    expect(options.single.parse).not.toHaveBeenCalled();
  });

  it('throw completion words from a parsing callback', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        parse() {
          throw new TextMessage('abc');
        },
      },
    } as const satisfies Options;
    expect(parse(options, 'cmd -f ', { compIndex: 7 })).rejects.toThrow(/^abc$/);
  });

  it('throw completion suggestions from a parsing callback', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        parse() {
          throw new JsonMessage({ name: 'abc' });
        },
      },
    } as const satisfies Options;
    expect(parse(options, 'cmd -f ', { compIndex: 7 })).rejects.toThrow(/^\[{"name":"abc"}]$/);
  });

  describe('parsing errors occur during completion', () => {
    it('ignore a missing parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['abc'],
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { optionPrefix: '-' };
      expect(parse(options, 'cmd -s -s', { ...flags, compIndex: 9 })).rejects.toThrow(/^-s$/);
      expect(parse(options, 'cmd -s -s ', { ...flags, compIndex: 10 })).rejects.toThrow(/^abc$/);
      expect(parse(options, 'cmd -s -s=', { ...flags, compIndex: 10 })).rejects.toThrow(/^abc$/);
    });

    it('ignore missing inline parameter of array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['abc'],
          inline: 'always',
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a a', { compIndex: 8 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -a -', { compIndex: 8 })).rejects.toThrow(/^-a$/);
      expect(parse(options, 'cmd -a - -', { compIndex: 10 })).rejects.toThrow(/^-a$/);
    });

    it('ignore an unknown cluster letter', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          cluster: 'f',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { clusterPrefix: '', compIndex: 7 };
      expect(parse(options, 'cmd  x ', flags)).rejects.toThrow(/^-f$/);
      expect(parse(options, 'cmd xb ', flags)).rejects.toThrow(/^-f$/);
    });

    it('ignore an unknown option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd x ', { compIndex: 6 })).rejects.toThrow(/^-f$/);
    });

    it('ignore an invalid parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['abc'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s a ', { compIndex: 9 })).rejects.toThrow(/^-s$/);
      expect(parse(options, 'cmd -s a -s ', { compIndex: 12 })).rejects.toThrow(/^abc$/);
    });

    it('ignore an error thrown by a parsing callback of a flag option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse: jest.fn(() => {
            throw 'abc';
          }),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -f ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
      expect(options.flag.parse).toHaveBeenCalledWith(null, {
        values: { flag: undefined },
        index: 0,
        position: NaN,
        name: '-f',
        comp: true,
      });
    });

    it('ignore an error thrown by a parsing callback of a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: jest.fn(() => {
            throw 'abc';
          }),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s 1 -s 1 ', { compIndex: 14 })).rejects.toThrow(/^-s$/);
      expect(options.single.parse).toHaveBeenCalledWith('1', {
        values: { single: undefined },
        index: 0,
        position: NaN,
        name: '-s',
        comp: true,
      });
    });

    it('ignore an error thrown by a parsing callback of an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          parse: jest.fn(() => {
            throw 'abc';
          }),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a 1 -a 1 ', { compIndex: 14 })).rejects.toThrow(/^-a$/);
      expect(options.array.parse).toHaveBeenCalledWith('1', {
        values: { array: undefined },
        index: 0,
        position: NaN,
        name: '-a',
        comp: true,
      });
    });

    it('ignore an error thrown by a parsing callback of a function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          parse: jest.fn(() => {
            throw 'abc';
          }),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -f 1 -f 1 ', { compIndex: 14 })).rejects.toThrow(/^-f$/);
      expect(options.function.parse).toHaveBeenCalledWith(['1'], {
        values: { function: undefined },
        index: 0,
        position: NaN,
        name: '-f',
        comp: true,
      });
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
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-h$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-h$/);
      expect(parse(options, 'cmd -h', { compIndex: 6 })).rejects.toThrow(/^-h$/);
      expect(parse(options, 'cmd -h ', { compIndex: 7 })).rejects.toThrow(/^-h$/);
      expect(parse(options, 'cmd -h=', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -h= ', { compIndex: 8 })).rejects.toThrow(/^-h$/);
    });

    it('handle a version option', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-v$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-v$/);
      expect(parse(options, 'cmd -v', { compIndex: 6 })).rejects.toThrow(/^-v$/);
      expect(parse(options, 'cmd -v ', { compIndex: 7 })).rejects.toThrow(/^-v$/);
      expect(parse(options, 'cmd -v=', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -v= ', { compIndex: 8 })).rejects.toThrow(/^-v$/);
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
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-c$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-c$/);
      expect(parse(options, 'cmd -c', { compIndex: 6 })).rejects.toThrow(/^-c$/);
      expect(parse(options, 'cmd -c ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
      expect(parse(options, 'cmd -c=', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -c= ', { compIndex: 8 })).rejects.toThrow(/^-c$/);
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
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-f$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-f$/);
      expect(parse(options, 'cmd -f', { compIndex: 6 })).rejects.toThrow(/^-f$/);
      expect(options.flag.parse).not.toHaveBeenCalled();
      expect(parse(options, 'cmd -f ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
      expect(options.flag.parse).toHaveBeenCalled();
      options.flag.parse.mockClear();
      expect(parse(options, 'cmd -f=', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -f= ', { compIndex: 8 })).rejects.toThrow(/^-f$/);
      expect(options.flag.parse).not.toHaveBeenCalled(); // option was ignored
    });

    it('handle a single-valued option with choices', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-s$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-s$/);
      expect(parse(options, 'cmd -s', { compIndex: 6 })).rejects.toThrow(/^-s$/);
      expect(parse(options, 'cmd -s ', { compIndex: 7 })).rejects.toThrow(/^one\ntwo$/);
      expect(parse(options, 'cmd -s o', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -s t', { compIndex: 8 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -s 1', { compIndex: 8 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -s=', { compIndex: 7 })).rejects.toThrow(/^one\ntwo$/);
      expect(parse(options, 'cmd -s=o', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -s=t', { compIndex: 8 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -s=1', { compIndex: 8 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -s= ', { compIndex: 8 })).rejects.toThrow(/^-s$/);
    });

    it('handle an array-valued option with choices', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-a$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-a$/);
      expect(parse(options, 'cmd -a', { compIndex: 6 })).rejects.toThrow(/^-a$/);
      expect(parse(options, 'cmd -a ', { compIndex: 7 })).rejects.toThrow(/^one\ntwo\n-a$/);
      expect(parse(options, 'cmd -a o', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -a t', { compIndex: 8 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -a 1', { compIndex: 8 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -a=', { compIndex: 7 })).rejects.toThrow(/^one\ntwo$/);
      expect(parse(options, 'cmd -a=o', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -a=t', { compIndex: 8 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -a=1', { compIndex: 8 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd -a= ', { compIndex: 8 })).rejects.toThrow(/^-a$/);
      expect(parse(options, 'cmd -a 1 ', { compIndex: 9 })).rejects.toThrow(/^one\ntwo\n-a$/);
      expect(parse(options, 'cmd -a 1 o', { compIndex: 10 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -a 1 t', { compIndex: 10 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -a 1 1', { compIndex: 10 })).rejects.toThrow(/^$/);
    });

    it('handle a single-valued option with case-insensitive choices', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'two'],
          normalize: (param) => param.toLowerCase(),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s O', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -s T', { compIndex: 8 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -s=O', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -s=T', { compIndex: 8 })).rejects.toThrow(/^two$/);
    });

    it('handle an array-valued option with case-insensitive choices', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['one', 'two'],
          normalize: (param) => param.toLowerCase(),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a O', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -a T', { compIndex: 8 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -a=O', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -a=T', { compIndex: 8 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd -a 1 O', { compIndex: 10 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd -a 1 T', { compIndex: 10 })).rejects.toThrow(/^two$/);
    });

    it('handle a function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          parse: jest.fn(),
          complete: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -f ', { compIndex: 7 })).rejects.toThrow(/^-f$/);
      expect(options.function.parse).not.toHaveBeenCalled();
      expect(options.function.complete).toHaveBeenCalled();
    });

    it('handle a positional marker', () => {
      const options = {
        single: {
          type: 'single',
          marker: '--',
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^--$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^--$/);
      expect(parse(options, 'cmd --', { compIndex: 6 })).rejects.toThrow(/^--$/);
      expect(parse(options, 'cmd -- ', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd --=', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd --= ', { compIndex: 8 })).rejects.toThrow(/^--$/);
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
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^one\ntwo\n-s$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-s$/);
      expect(parse(options, 'cmd o', { compIndex: 5 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd t', { compIndex: 5 })).rejects.toThrow(/^two$/);
      expect(parse(options, 'cmd x', { compIndex: 5 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd one o', { compIndex: 9 })).rejects.toThrow(/^one$/);
    });

    it('handle a positional marker with choices', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'two'],
          marker: '--',
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-s\n--$/);
      expect(parse(options, 'cmd -', { compIndex: 5 })).rejects.toThrow(/^-s\n--$/);
      expect(parse(options, 'cmd --', { compIndex: 6 })).rejects.toThrow(/^--$/);
      expect(parse(options, 'cmd -- ', { compIndex: 7 })).rejects.toThrow(/^one\ntwo$/);
      expect(parse(options, 'cmd -- o', { compIndex: 8 })).rejects.toThrow(/^one$/);
      expect(parse(options, 'cmd --=', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd --= ', { compIndex: 8 })).rejects.toThrow(/^-s\n--$/);
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
      expect(parse(options, 'cmd ', { compIndex: 4 })).rejects.toThrow(/^-f$/);
      expect(parse(options, 'cmd a ', { compIndex: 6 })).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd a a ', { compIndex: 8 })).rejects.toThrow(/^-f$/);
    });

    it('handle a cluster argument', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          cluster: 'f',
        },
      } as const satisfies Options;
      const flags1: ParsingFlags = { clusterPrefix: '', compIndex: 6 };
      expect(parse(options, 'cmd  f', flags1)).rejects.toThrow(/^$/);
      expect(parse(options, 'cmd ff', flags1)).rejects.toThrow(/^$/);
      const flags2: ParsingFlags = { clusterPrefix: '-', compIndex: 7 };
      expect(parse(options, 'cmd   -', flags2)).rejects.toThrow(/^-f$/);
      expect(parse(options, 'cmd  -f', flags2)).rejects.toThrow(/^-f$/);
      expect(parse(options, 'cmd -ff', flags2)).rejects.toThrow(/^$/);
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
      const flags: ParsingFlags = { clusterPrefix: '', compIndex: 7 };
      expect(parse(options, 'cmd sf  rest', flags)).rejects.toThrow(/^one$/);
    });
  });

  describe('emitting JSON with a list of suggestions', () => {
    beforeEach(() => {
      process.env['COMP_JSON'] = '1';
    });

    afterEach(() => {
      delete process.env['COMP_JSON'];
    });

    it('handle a single-valued option with a AnsiString synopsis', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: new AnsiString().split('A single option.'),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s', { compIndex: 6 })).rejects.toThrow(
        /^\[{"type":"single","name":"-s","synopsis":"A single option."}]$/,
      );
    });

    it('handle a single-valued option with choices', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s ', { compIndex: 7 })).rejects.toThrow(
        '[{"type":"parameter","name":"one","displayName":"-s"},' +
          '{"type":"parameter","name":"two","displayName":"-s"}]',
      );
    });

    it('handle a single-valued option with completion words', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          complete: () => ['abc'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s', { compIndex: 6 })).rejects.toThrow(
        /^\[{"type":"single","name":"-s"}]$/,
      );
      expect(parse(options, 'cmd -s ', { compIndex: 7 })).rejects.toThrow(
        /^\[{"type":"parameter","name":"abc","displayName":"-s"}]$/,
      );
    });

    it('handle a single-valued option with completion suggestions', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          complete: () => [{ name: 'abc' }],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s', { compIndex: 6 })).rejects.toThrow(
        /^\[{"type":"single","name":"-s"}]$/,
      );
      expect(parse(options, 'cmd -s ', { compIndex: 7 })).rejects.toThrow(
        /^\[{"type":"parameter","name":"abc","displayName":"-s"}]$/,
      );
    });

    it('handle an array-valued option with a AnsiString synopsis', () => {
      const options = {
        single: {
          type: 'array',
          names: ['-a'],
          synopsis: new AnsiString().split('An array option.'),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a', { compIndex: 6 })).rejects.toThrow(
        /^\[{"type":"array","name":"-a","synopsis":"An array option."}]$/,
      );
    });

    it('handle an array-valued option with choices', () => {
      const options = {
        single: {
          type: 'array',
          names: ['-a'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a ', { compIndex: 7 })).rejects.toThrow(
        '[{"type":"parameter","name":"one","displayName":"-a"},' +
          '{"type":"parameter","name":"two","displayName":"-a"},' +
          '{"type":"array","name":"-a"}]',
      );
    });

    it('handle an array-valued option with completion words', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          complete: () => ['abc'],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a', { compIndex: 6 })).rejects.toThrow(
        /^\[{"type":"array","name":"-a"}]$/,
      );
      expect(parse(options, 'cmd -a ', { compIndex: 7 })).rejects.toThrow(
        /^\[{"type":"parameter","name":"abc","displayName":"-a"},{"type":"array","name":"-a"}]$/,
      );
    });

    it('handle an array-valued option with completion suggestions', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          complete: () => [{ name: 'abc' }],
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a', { compIndex: 6 })).rejects.toThrow(
        /^\[{"type":"array","name":"-a"}]$/,
      );
      expect(parse(options, 'cmd -a ', { compIndex: 7 })).rejects.toThrow(
        /^\[{"type":"parameter","name":"abc","displayName":"-a"},{"type":"array","name":"-a"}]$/,
      );
    });
  });

  describe('a completion callback is specified', () => {
    it('ignore an error thrown by the completion callback', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          complete: jest.fn(() => {
            throw 'abc';
          }),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s ', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(options.single.complete).toHaveBeenCalled();
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: jest.fn((param) => param),
          complete: jest.fn((param) => [param]),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s ', { compIndex: 7 })).rejects.toThrow(/^$/);
      expect(options.single.complete).toHaveBeenCalledWith('', {
        values: { strings: undefined },
        index: 0,
        position: NaN,
        name: '-s',
        prev: [],
      });
      options.single.complete.mockClear();
      expect(parse(options, 'cmd -s 1', { compIndex: 8 })).rejects.toThrow(/^1$/);
      expect(options.single.complete).toHaveBeenCalledWith('1', {
        values: { single: undefined },
        index: 0,
        position: NaN,
        name: '-s',
        prev: [],
      });
      expect(options.single.parse).not.toHaveBeenCalled();
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          parse: jest.fn((param) => param),
          complete: jest.fn((param) => [param]),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -a ', { compIndex: 7 })).rejects.toThrow(/^\n-a$/);
      expect(options.array.complete).toHaveBeenCalledWith('', {
        values: { strings: undefined },
        index: 0,
        position: NaN,
        name: '-a',
        prev: [],
      });
      options.array.complete.mockClear();
      expect(parse(options, 'cmd -a 1', { compIndex: 8 })).rejects.toThrow(/^1$/);
      expect(options.array.complete).toHaveBeenCalledWith('1', {
        values: { array: undefined },
        index: 0,
        position: NaN,
        name: '-a',
        prev: [],
      });
      options.array.complete.mockClear();
      expect(parse(options, 'cmd -a 1 ', { compIndex: 9 })).rejects.toThrow(/^\n-a$/);
      expect(options.array.complete).toHaveBeenCalledWith('', {
        values: { array: undefined },
        index: 0,
        position: NaN,
        name: '-a',
        prev: ['1'],
      });
      expect(options.array.parse).not.toHaveBeenCalled();
    });

    it('handle a polyadic function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: 2,
          parse: jest.fn(),
          complete() {
            return [this.type]; // test access to `this`
          },
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -f ', { compIndex: 7 })).rejects.toThrow(/^function$/);
      expect(parse(options, 'cmd -f 1', { compIndex: 8 })).rejects.toThrow(/^function$/);
      expect(parse(options, 'cmd -f 1 ', { compIndex: 9 })).rejects.toThrow(/^function$/);
      expect(parse(options, 'cmd -f 1 2', { compIndex: 10 })).rejects.toThrow(/^function$/);
      expect(parse(options, 'cmd -f 1 2 ', { compIndex: 11 })).rejects.toThrow(/^-f$/);
      expect(options.function.parse).not.toHaveBeenCalled();
    });

    it('handle a positional function option', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: 2,
          positional: true,
          parse: jest.fn((param) => param),
          complete: jest.fn((param) => [param]),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd a', { compIndex: 5 })).rejects.toThrow(/^a$/);
      expect(options.function.complete).toHaveBeenCalledWith('a', {
        values: { function: undefined },
        index: 0,
        position: 1,
        name: '',
        prev: [],
      });
      options.function.complete.mockClear();
      expect(parse(options, 'cmd a a', { compIndex: 7 })).rejects.toThrow(/^a$/);
      expect(options.function.complete).toHaveBeenCalledWith('a', {
        values: { function: undefined },
        index: 0,
        position: 1,
        name: '',
        prev: ['a'],
      });
      options.function.complete.mockClear();
      expect(parse(options, 'cmd a a a', { compIndex: 9 })).rejects.toThrow(/^a$/);
      expect(options.function.complete).toHaveBeenCalledWith('a', {
        values: { function: ['a', 'a'] },
        index: 0,
        position: 2,
        name: '',
        prev: [],
      });
      expect(options.function.parse).toHaveBeenCalledWith(['a', 'a'], {
        values: { function: ['a', 'a'] }, // should have been { function: undefined } at the time of call
        index: 0,
        position: 1,
        name: '',
        comp: true,
      });
      expect(options.function.parse).toHaveBeenCalledTimes(1);
    });
  });
});
