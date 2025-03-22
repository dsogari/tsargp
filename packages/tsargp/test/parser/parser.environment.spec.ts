import { afterAll, beforeAll, describe, expect, it, jest, spyOn } from 'bun:test';
import type { Options } from '../../src/library';
import { parse } from '../../src/library';
import * as utils from '../../src/library/utils';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('read data from standard input', () => {
    const readFileSpy = spyOn(utils, 'readFile');

    beforeAll(() => {
      readFileSpy.mockImplementation(async () => 'data\n\n');
    });

    afterAll(() => {
      readFileSpy.mockRestore(); // restore original implementation
    });

    it('avoid reading on parent command when using nested options', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          stdin: true,
          parse: jest.fn((param) => param),
        },
        command: {
          type: 'command',
          names: ['-c'],
        },
      } as const satisfies Options;
      process.stdin.isTTY = false;
      expect(parse(options, ['-c'])).resolves.toEqual({ single: undefined, command: {} });
      expect(options.single.parse).not.toHaveBeenCalled();
    });

    it('avoid reading twice when using nested options', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          stdin: true,
          parse: jest.fn((param) => param),
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: () => options,
        },
      } as const satisfies Options;
      process.stdin.isTTY = false;
      expect(parse(options, ['-c'])).resolves.toEqual({
        single: undefined,
        command: { single: 'data\n', command: undefined },
      });
      expect(options.single.parse).toHaveBeenCalledWith('data\n', {
        // should have been { single: undefined } at the time of call
        values: { single: 'data\n', command: undefined },
        index: NaN,
        name: '0', // zero for standard input
        comp: false,
      });
      expect(options.single.parse).toHaveBeenCalledTimes(1);
    });

    it('try to read if the option is required', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          stdin: true,
          required: true,
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      process.stdin.isTTY = true;
      expect(parse(options, [])).resolves.toEqual({ single: 'data\n' });
      expect(options.single.parse).toHaveBeenCalledWith('data\n', {
        // should have been { single: undefined } at the time of call
        values: { single: 'data\n' },
        index: NaN,
        name: '0', // zero for standard input
        comp: false,
      });
    });

    it('try to read if the option is not required but the terminal is non-interactive', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          stdin: true,
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      process.stdin.isTTY = false;
      expect(parse(options, [])).resolves.toEqual({ single: 'data\n' });
      expect(options.single.parse).toHaveBeenCalledWith('data\n', {
        // should have been { single: undefined } at the time of call
        values: { single: 'data\n' },
        index: NaN,
        name: '0', // zero for standard input
        comp: false,
      });
    });

    it('do not try to read if the option is not required and the terminal is interactive', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          stdin: true,
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      process.stdin.isTTY = true;
      expect(parse(options, [])).resolves.toEqual({ single: undefined });
      expect(options.single.parse).not.toHaveBeenCalled();
    });
  });

  describe('read data from a local file', () => {
    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          sources: ['ARRAY', new URL(import.meta.resolve('../data/test-read-file.txt'))],
          separator: /\r?\n/,
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      delete process.env['ARRAY'];
      expect(parse(options, [])).resolves.toEqual({ array: ['test', 'read', 'file'] });
      expect(options.array.parse).toHaveBeenCalledWith('test', {
        // should have been { array: undefined } at the time of call
        values: { array: ['test', 'read', 'file'] },
        index: NaN,
        name: expect.stringMatching(/data\/test-read-file.txt$/),
        comp: false,
      });
      options.array.parse.mockClear();
      process.env['ARRAY'] = '1';
      expect(parse(options, [])).resolves.toEqual({ array: ['1'] });
      expect(options.array.parse).toHaveBeenCalledWith('1', {
        // should have been { array: undefined } at the time of call
        values: { array: ['1'] },
        index: NaN,
        name: 'ARRAY',
        comp: false,
      });
    });
  });

  describe('read data from an environment variable', () => {
    it('handle a flag option', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          sources: ['FLAG1'],
          requires: 'flag2',
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          sources: ['FLAG2'],
        },
      } as const satisfies Options;
      delete process.env['FLAG2'];
      process.env['FLAG1'] = '';
      expect(parse(options, [])).rejects.toThrow(`Option -f1 requires -f2.`);
      process.env['FLAG2'] = '';
      expect(parse(options, [])).resolves.toEqual({ flag1: true, flag2: true });
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          sources: ['SINGLE'],
          requires: 'flag',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          sources: ['FLAG'],
        },
      } as const satisfies Options;
      delete process.env['FLAG'];
      process.env['SINGLE'] = '1';
      expect(parse(options, [])).rejects.toThrow(`Option -s requires -f.`);
      process.env['FLAG'] = '';
      expect(parse(options, [])).resolves.toEqual({ single: '1', flag: true });
      process.env['SINGLE'] = '';
      expect(parse(options, [])).resolves.toEqual({ single: '', flag: true });
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          sources: ['ARRAY'],
          separator: ',',
          requires: 'flag',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          sources: ['FLAG'],
        },
      } as const satisfies Options;
      delete process.env['FLAG'];
      process.env['ARRAY'] = 'one,two';
      expect(parse(options, [])).rejects.toThrow(`Option -a requires -f.`);
      process.env['FLAG'] = '';
      expect(parse(options, [])).resolves.toEqual({ array: ['one', 'two'], flag: true });
      process.env['ARRAY'] = '';
      expect(parse(options, [])).resolves.toEqual({ array: [''], flag: true });
    });

    it('handle a function option and ignore its parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f1'],
          sources: ['FUNCTION'],
          requires: 'flag',
          paramCount: 2,
          parse: (param) => param,
        },
        flag: {
          type: 'flag',
          names: ['-f2'],
          sources: ['FLAG'],
        },
      } as const satisfies Options;
      delete process.env['FLAG'];
      process.env['FUNCTION'] = '1';
      expect(parse(options, [])).rejects.toThrow(`Option -f1 requires -f2.`);
      process.env['FLAG'] = '';
      expect(parse(options, [])).resolves.toEqual({ function: ['1'], flag: true });
      process.env['FUNCTION'] = '';
      expect(parse(options, [])).resolves.toEqual({ function: [''], flag: true });
    });
  });

  describe('an environment variable causes an error', () => {
    it('throw an error on environment variable that fails a requirement', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          sources: ['FLAG1'],
          requiredIf: 'flag2',
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          sources: ['FLAG2'],
        },
      } as const satisfies Options;
      delete process.env['FLAG1'];
      process.env['FLAG2'] = '1';
      expect(parse(options, [])).rejects.toThrow(`Option -f1 is required if -f2.`);
    });

    it('throw an error on environment variable that fails a regex constraint', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          sources: ['SINGLE'],
          regex: /\d+/,
        },
      } as const satisfies Options;
      process.env['SINGLE'] = 'abc';
      expect(parse(options, [])).rejects.toThrow(
        `Invalid parameter to SINGLE: 'abc'. Value must match the regex /\\d+/.`,
      );
    });

    it('throw an error on environment variable that fails a choice constraint', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          sources: ['SINGLE'],
          choices: ['1'],
        },
      } as const satisfies Options;
      process.env['SINGLE'] = 'abc';
      expect(parse(options, [])).rejects.toThrow(
        `Invalid parameter to SINGLE: 'abc'. Value must be one of: '1'.`,
      );
    });

    it('throw an error on environment variable that fails a limit constraint', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          sources: ['ARRAY'],
          separator: ',',
          limit: 1,
        },
      } as const satisfies Options;
      process.env['ARRAY'] = 'abc,def';
      expect(parse(options, [])).rejects.toThrow(
        `Option ARRAY has too many values: 2. Should have at most 1.`,
      );
    });
  });
});
