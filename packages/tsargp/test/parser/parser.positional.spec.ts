import { describe, expect, it } from 'bun:test';
import type { Options, ParsingFlags } from '../../src/library';
import { parse } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('option prefix', () => {
    const flags: ParsingFlags = { optionPrefix: '-' };

    it('do not interpret arguments with the prefix as positional', () => {
      const options = {
        single: {
          type: 'single',
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-s'], flags)).rejects.toThrow(`Unknown option -s.`);
    });
  });

  describe('positional arguments', () => {
    it('handle a single-valued option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        single: {
          type: 'single',
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['0', '1'])).resolves.toEqual({ flag: undefined, single: '1' });
      expect(parse(options, ['-f', '0', '1'])).resolves.toEqual({ flag: true, single: '1' });
      expect(parse(options, ['0', '-f', '1'])).resolves.toEqual({ flag: true, single: '1' });
      expect(parse(options, ['0', '1', '-f'])).resolves.toEqual({ flag: true, single: '1' });
    });

    it('handle an array-valued option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        array: {
          type: 'array',
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['0', '1'])).resolves.toEqual({ flag: undefined, array: ['0', '1'] });
      expect(parse(options, ['-f', '0', '1'])).resolves.toEqual({ flag: true, array: ['0', '1'] });
      expect(parse(options, ['0', '-f', '1'])).resolves.toEqual({ flag: true, array: ['1'] });
      expect(parse(options, ['0', '1', '-f'])).resolves.toEqual({ flag: true, array: ['0', '1'] });
    });

    it('handle a polyadic function option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        function: {
          type: 'function',
          positional: true,
          paramCount: 2,
          preferredName: 'preferred',
          parse: (param) => param,
        },
      } as const satisfies Options;
      expect(parse(options, ['0'])).rejects.toThrow(
        'Missing parameter(s) to option preferred: requires exactly 2.',
      );
      expect(parse(options, ['0', '1', '2'])).rejects.toThrow(
        'Missing parameter(s) to option preferred: requires exactly 2.',
      );
      expect(parse(options, ['-f', '0', '1', '2'])).rejects.toThrow(
        'Missing parameter(s) to option preferred: requires exactly 2.',
      );
      expect(parse(options, ['0', '-f'])).resolves.toEqual({
        flag: undefined,
        function: ['0', '-f'],
      });
      expect(parse(options, ['-f', '0', '1'])).resolves.toEqual({
        flag: true,
        function: ['0', '1'],
      });
      expect(parse(options, ['0', '1', '-f'])).resolves.toEqual({
        flag: true,
        function: ['0', '1'],
      });
      expect(parse(options, ['0', '1', '2', '3'])).resolves.toEqual({
        flag: undefined,
        function: ['2', '3'],
      });
    });
  });

  describe('multiple positional options', () => {
    it('handle single-valued options', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        single1: {
          type: 'single',
          positional: true,
        },
        single2: {
          type: 'single',
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', '1'])).resolves.toEqual({
        flag: true,
        single1: '1',
        single2: undefined,
      });
      expect(parse(options, ['1', '-f', '2'])).resolves.toEqual({
        flag: true,
        single1: '1',
        single2: '2',
      });
      expect(parse(options, ['1', '2', '-f', '3'])).resolves.toEqual({
        flag: true,
        single1: '1',
        single2: '3', // value was replaced
      });
      expect(parse(options, ['-f', '1', '-f', '2'])).resolves.toEqual({
        flag: true,
        single1: '1',
        single2: '2',
      });
    });

    it('handle polyadic and variadic options', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        function: {
          type: 'function',
          positional: true,
          paramCount: 2,
          preferredName: 'preferred',
        },
        array: {
          type: 'array',
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', '1'])).rejects.toThrow(
        `Missing parameter(s) to option preferred: requires exactly 2.`,
      );
      expect(parse(options, ['-f', '1', '2'])).resolves.toEqual({
        flag: true,
        function: ['1', '2'],
        array: undefined,
      });
      expect(parse(options, ['-f', '1', '2', '-f', '3'])).resolves.toEqual({
        flag: true,
        function: ['1', '2'],
        array: ['3'],
      });
      expect(parse(options, ['1', '2', '-f', '3', '4'])).resolves.toEqual({
        flag: true,
        function: ['1', '2'],
        array: ['3', '4'],
      });
      expect(parse(options, ['1', '2', '3', '-f', '4'])).resolves.toEqual({
        flag: true,
        function: ['1', '2'],
        array: ['4'], // value was replaced
      });
    });

    it('handle a variadic option and another with trailing marker', () => {
      const options = {
        array: {
          type: 'array',
          positional: true,
        },
        single: {
          type: 'single',
          marker: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['1', '2', '--', '3'])).resolves.toEqual({
        array: ['1', '2'],
        single: '3',
      });
    });
  });
});
