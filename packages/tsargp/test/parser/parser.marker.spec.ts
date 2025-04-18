import { describe, expect, it } from 'bun:test';
import type { Options, ParsingFlags } from '../../src/library';
import { parse } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('trailing arguments are supplied', () => {
    it('ignore the option prefix after the trailing marker ', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          marker: '--',
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
          marker: '--',
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
          marker: '--',
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

    it('handle an option with empty trailing marker', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          marker: '',
        },
      } as const satisfies Options;
      expect(parse(options, ['', '-s'])).resolves.toEqual({ single: '-s' });
      expect(parse(options, ['', '1', '2'])).resolves.toEqual({ single: '2' });
      expect(parse(options, ['', '1', '2', '-s'])).resolves.toEqual({ single: '-s' });
    });

    it('handle multiple options with trailing marker', () => {
      const options = {
        array1: {
          type: 'array',
          marker: '--',
        },
        array2: {
          type: 'array',
          marker: '++',
        },
      } as const satisfies Options;
      expect(parse(options, ['--', '++'])).resolves.toEqual({ array1: ['++'], array2: undefined });
      expect(parse(options, ['++', '--'])).resolves.toEqual({ array1: undefined, array2: ['--'] });
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          marker: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['--', '-s'])).resolves.toEqual({ single: '-s' });
      expect(parse(options, ['--', '1', '2'])).resolves.toEqual({ single: '2' });
      expect(parse(options, ['--', '1', '2', '-s'])).resolves.toEqual({ single: '-s' });
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          marker: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['--'])).resolves.toEqual({ array: [] });
      expect(parse(options, ['--', '0', '-a'])).resolves.toEqual({ array: ['0', '-a'] });
    });

    it('handle a function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          marker: '--',
          paramCount: 2,
        },
      } as const satisfies Options;
      expect(parse(options, ['--', '1', '2'])).resolves.toEqual({ function: ['1', '2'] });
      expect(parse(options, ['--', '1', '2', '-f', '-f'])).resolves.toEqual({
        function: ['-f', '-f'],
      });
    });
  });
});
