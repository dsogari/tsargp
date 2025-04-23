import { describe, expect, it } from 'bun:test';
import type { Options, ParsingFlags } from '../../src/library';
import { parse } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('positional marker', () => {
    const flags: ParsingFlags = { positionalMarker: '--' };

    it('handle a single-valued option with arguments between identical markers', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: true,
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: ['--', '--'] };
      expect(parse(options, ['--', '--'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['--', '-s', '--'], flags)).resolves.toEqual({ single: '-s' });
    });

    it('handle a single-valued option with arguments between different markers', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: true,
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: ['--', '++'] };
      expect(parse(options, ['--', '++'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['--', '--', '++'], flags)).resolves.toEqual({ single: '--' });
    });

    it('handle an array-valued option with arguments between identical markers', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          positional: true,
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: ['--', '--'] };
      expect(parse(options, ['--', '--'], flags)).resolves.toEqual({ array: undefined });
      expect(parse(options, ['--', '-a', '--'], flags)).resolves.toEqual({ array: ['-a'] });
      expect(parse(options, ['0', '--', '1', '--', '2'], flags)).resolves.toEqual({
        array: ['0', '1', '2'],
      });
    });

    it('handle an array-valued option with arguments between different markers', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          positional: true,
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: ['--', '++'] };
      expect(parse(options, ['--', '++'], flags)).resolves.toEqual({ array: undefined });
      expect(parse(options, ['--', '--', '++'], flags)).resolves.toEqual({ array: ['--'] });
    });

    it('ignore arguments after trailing marker if there is no positional option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: '--' };
      expect(parse(options, ['--'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['--', '-s'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['-s=0', '--', '-s'], flags)).resolves.toEqual({ single: '0' });
    });

    it('ignore arguments between markers if there is no positional option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: ['--', '++'] };
      expect(parse(options, ['--', '++'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['--', '-s', '++'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['-s=0', '--', '-s', '++'], flags)).resolves.toEqual({ single: '0' });
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
      expect(parse(options, ['--'], flags)).resolves.toEqual({ single: undefined });
      expect(parse(options, ['--', '-s'], flags)).resolves.toEqual({ single: '-s' });
    });

    it('throw an error on missing parameter to single-valued option ', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: true,
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: '--' };
      expect(parse(options, ['-s', '--'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -s: requires exactly 1.`,
      );
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
      expect(parse(options, ['-a', '1', '--', '2'], flags)).resolves.toEqual({ array: ['2'] });
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

  describe('parameter marker', () => {
    it('handle an array-valued option with arguments after trailing marker', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          positional: true,
          marker: '--',
        },
      } as const satisfies Options;
      expect(parse(options, ['--'])).resolves.toEqual({ array: [] });
      expect(parse(options, ['1', '--'])).resolves.toEqual({ array: [] });
      expect(parse(options, ['--', '0', '-a'])).resolves.toEqual({ array: ['0', '-a'] });
      expect(parse(options, ['1', '--', '--'])).resolves.toEqual({ array: ['--'] });
    });
  });

  it('handle an array-valued option with arguments between identical markers', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        positional: true,
        marker: ['--', '--'],
      },
    } as const satisfies Options;
    expect(parse(options, ['--', '--'])).resolves.toEqual({ array: [] });
    expect(parse(options, ['--', '-a', '--'])).resolves.toEqual({ array: ['-a'] });
    expect(parse(options, ['0', '--', '1', '--', '2'])).resolves.toEqual({ array: ['2'] });
  });

  it('handle an array-valued option with arguments between different markers', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        positional: true,
        marker: ['[', ']'],
      },
    } as const satisfies Options;
    expect(parse(options, ['[', ']'])).resolves.toEqual({ array: [] });
    expect(parse(options, ['[', '--', ']'])).resolves.toEqual({ array: ['--'] });
  });

  it('handle a function option with with arguments after trailing marker', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
        positional: true,
        paramCount: 2,
        marker: '--',
      },
    } as const satisfies Options;
    expect(parse(options, ['0', '--'])).resolves.toEqual({ function: ['0', '--'] });
    expect(parse(options, ['--', '1', '2'])).resolves.toEqual({ function: ['1', '2'] });
    expect(parse(options, ['--', '1', '2', '-f', '-f'])).resolves.toEqual({
      function: ['-f', '-f'],
    });
    expect(parse(options, ['1', '2', '--', '--', '--'])).resolves.toEqual({
      function: ['--', '--'],
    });
  });

  it('handle a function option with with arguments between identical markers', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
        positional: true,
        paramCount: 2,
        marker: ['--', '--'],
      },
    } as const satisfies Options;
    expect(parse(options, ['--', '-f', '-f', '--'])).resolves.toEqual({ function: ['-f', '-f'] });
    expect(parse(options, ['--', '-f', '-f', '--', '0', '1'])).resolves.toEqual({
      function: ['0', '1'],
    });
  });

  it('handle a function option with with arguments between different markers', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
        positional: true,
        paramCount: 2,
        marker: ['[', ']'],
      },
    } as const satisfies Options;
    expect(parse(options, ['[', '[', '[', ']'])).resolves.toEqual({ function: ['[', '['] });
    expect(parse(options, ['[', '-f', '-f', ']', '0', '1'])).resolves.toEqual({
      function: ['0', '1'],
    });
  });

  it('throw an error on missing parameter to polyadic function option ', () => {
    const options = {
      function: {
        type: 'function',
        positional: true,
        paramCount: 2,
        marker: ['--', '++'],
        preferredName: 'preferred',
      },
    } as const satisfies Options;
    expect(parse(options, ['--'])).rejects.toThrow(
      `Missing parameter(s) to option --: requires exactly 2.`,
    );
    expect(parse(options, ['--', '0', '++'])).rejects.toThrow(
      `Missing parameter(s) to option --: requires exactly 2.`,
    );
  });
});
