import { describe, expect, it } from 'bun:test';
import type { Options, ParsingFlags } from '../../src/library';
import { parse } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('an option prefix is specified', () => {
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

  describe('parameters are specified as positional arguments', () => {
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

  describe('parameters are specified after a positional marker', () => {
    it('ignore the option prefix after the positional marker ', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: '--',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { optionPrefix: '-' };
      expect(parse(options, ['--', '-s'], flags)).resolves.toEqual({ single: '-s' });
    });

    it('throw an error on missing parameter to single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: '--',
          preferredName: 'preferred',
        },
      } as const satisfies Options;
      expect(parse(options, ['--'])).rejects.toThrow(
        `Missing parameter(s) to option --: requires exactly 1.`,
      );
    });

    it('throw an error on missing parameter to polyadic function option ', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          positional: '--',
          paramCount: 2,
        },
      } as const satisfies Options;
      expect(parse(options, ['--'])).rejects.toThrow(
        `Missing parameter(s) to option --: requires exactly 2.`,
      );
      expect(parse(options, ['--', '1'])).rejects.toThrow(
        `Missing parameter(s) to option --: requires exactly 2.`,
      );
      expect(parse(options, ['--', '1', '2', '3'])).rejects.toThrow(
        `Missing parameter(s) to option --: requires exactly 2.`,
      );
    });

    it('handle an option with empty string as positional marker', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: '',
        },
      } as const satisfies Options;
      expect(parse(options, ['', '-s'])).resolves.toEqual({ single: '-s' });
      expect(parse(options, ['0', '', '-s'])).resolves.toEqual({ single: '-s' });
      expect(parse(options, ['', '1', '2'])).resolves.toEqual({ single: '2' });
      expect(parse(options, ['', '1', '2', '-s'])).resolves.toEqual({ single: '-s' });
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['--', '-s'])).resolves.toEqual({ single: '-s' });
      expect(parse(options, ['0', '--', '-s'])).resolves.toEqual({ single: '-s' });
      expect(parse(options, ['--', '1', '2'])).resolves.toEqual({ single: '2' });
      expect(parse(options, ['--', '1', '2', '-s'])).resolves.toEqual({ single: '-s' });
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          positional: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['--'])).resolves.toEqual({ array: [] });
      expect(parse(options, ['--', '0', '-a'])).resolves.toEqual({ array: ['0', '-a'] });
      expect(parse(options, ['0', '--', '-a'])).resolves.toEqual({ array: ['-a'] });
    });

    it('handle a function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          positional: '--',
          paramCount: 2,
        },
      } as const satisfies Options;
      expect(parse(options, ['--', '1', '2'])).resolves.toEqual({ function: ['1', '2'] });
      expect(parse(options, ['--', '1', '2', '-f', '-f'])).resolves.toEqual({
        function: ['-f', '-f'],
      });
    });
  });

  describe('multiple positional options are declared', () => {
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
        single3: {
          type: 'single',
          positional: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', '1'])).resolves.toEqual({
        flag: true,
        single1: '1',
        single2: undefined,
        single3: undefined,
      });
      expect(parse(options, ['1', '-f', '2'])).resolves.toEqual({
        flag: true,
        single1: '1',
        single2: '2',
        single3: undefined,
      });
      expect(parse(options, ['1', '2', '-f', '3'])).resolves.toEqual({
        flag: true,
        single1: '1',
        single2: '2',
        single3: '3',
      });
      expect(parse(options, ['1', '2', '--', '3'])).resolves.toEqual({
        flag: undefined,
        single1: '1',
        single2: '2',
        single3: '3',
      });
      expect(parse(options, ['1', '--', '3'])).resolves.toEqual({
        flag: undefined,
        single1: '1',
        single2: undefined,
        single3: '3',
      });
      expect(parse(options, ['--', '3'])).resolves.toEqual({
        flag: undefined,
        single1: undefined,
        single2: undefined,
        single3: '3',
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
        array: ['4'],
      });
    });

    it('handle a variadic option and another with positional marker', () => {
      const options = {
        array: {
          type: 'array',
          positional: true,
        },
        single: {
          type: 'single',
          positional: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['1', '2', '--', '3'])).resolves.toEqual({
        array: ['1', '2'],
        single: '3',
      });
    });
  });
});
