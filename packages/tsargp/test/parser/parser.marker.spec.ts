import { describe, expect, it } from 'bun:test';
import type { Options, ParsingFlags } from '../../src/library';
import { parse } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  const flags: ParsingFlags = { positionalMarker: '--' };

  describe('positional marker', () => {
    it('ignore marked arguments if there is no positional option ', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: '--' };
      expect(parse(options, ['--', '-s'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['-s', '--'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -s: requires exactly 1.`,
      );
    });

    it('ignore the option prefix', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: true,
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { optionPrefix: '-', positionalMarker: '--' };
      expect(parse(options, ['--', '-s'], flags)).resolves.toEqual({ single: '-s' });
    });

    it('throw an error on missing parameter to polyadic function option ', () => {
      const options = {
        function: {
          type: 'function',
          positional: true,
          paramCount: 2,
          preferredName: 'preferred',
        },
      } as const satisfies Options;
      expect(parse(options, ['1', '--'], flags)).rejects.toThrow(
        `Missing parameter(s) to option preferred: requires exactly 2.`,
      );
      expect(parse(options, ['--', '1'], flags)).rejects.toThrow(
        `Missing parameter(s) to option preferred: requires exactly 2.`,
      );
      expect(parse(options, ['--', '1', '2', '3'], flags)).rejects.toThrow(
        `Missing parameter(s) to option preferred: requires exactly 2.`,
      );
    });

    it('handle an option with empty marker', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: true,
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: '' };
      expect(parse(options, ['', ''], flags)).resolves.toEqual({ single: '' });
      expect(parse(options, ['', '1', '-s'], flags)).resolves.toEqual({ single: '-s' });
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['--'], flags)).resolves.toEqual({ single: undefined }); // ignore marker
      expect(parse(options, ['1', '--'], flags)).resolves.toEqual({ single: '1' });
      expect(parse(options, ['--', '-s'], flags)).resolves.toEqual({ single: '-s' });
      expect(parse(options, ['--', '1', '2'], flags)).resolves.toEqual({ single: '2' });
      expect(parse(options, ['1', '--', '--'], flags)).resolves.toEqual({ single: '--' });
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['--'], flags)).resolves.toEqual({ array: undefined }); // ignore marker
      expect(parse(options, ['1', '--'], flags)).resolves.toEqual({ array: ['1'] });
      expect(parse(options, ['--', '0', '-a'], flags)).resolves.toEqual({ array: ['0', '-a'] });
      expect(parse(options, ['1', '--', '--'], flags)).resolves.toEqual({ array: ['1', '--'] });
    });

    it('handle a function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          positional: true,
          paramCount: 2,
        },
      } as const satisfies Options;
      expect(parse(options, ['--', '1', '2'], flags)).resolves.toEqual({ function: ['1', '2'] });
      expect(parse(options, ['--', '1', '2', '-f', '-f'], flags)).resolves.toEqual({
        function: ['-f', '-f'],
      });
      expect(parse(options, ['1', '2', '--', '--', '--'], flags)).resolves.toEqual({
        function: ['--', '--'],
      });
    });
  });
});
