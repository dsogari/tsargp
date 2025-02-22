import { describe, expect, it } from 'bun:test';
import { type Options } from '../../lib/options';
import { parse, ParsingFlags } from '../../lib/parser';

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
        'Wrong number of parameters to option preferred: requires exactly 2.',
      );
      expect(parse(options, ['0', '1', '2'])).rejects.toThrow(
        'Wrong number of parameters to option preferred: requires exactly 2.',
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
    it('throw an error on wrong number of parameters to single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: '--',
          preferredName: 'preferred',
        },
      } as const satisfies Options;
      expect(parse(options, ['--'])).rejects.toThrow(
        `Wrong number of parameters to option preferred: requires exactly 1.`,
      );
      expect(parse(options, ['--', '1', '2'])).rejects.toThrow(
        `Wrong number of parameters to option preferred: requires exactly 1.`,
      );
    });

    it('throw an error on missing parameter to polyadic function option ', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          positional: '--',
          paramCount: 2,
          preferredName: 'preferred',
        },
      } as const satisfies Options;
      expect(parse(options, ['--'])).rejects.toThrow(
        `Wrong number of parameters to option preferred: requires exactly 2.`,
      );
      expect(parse(options, ['--', '1', '2', '3'])).rejects.toThrow(
        `Wrong number of parameters to option preferred: requires exactly 2.`,
      );
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
  });
});
