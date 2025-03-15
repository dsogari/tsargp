import { describe, expect, it } from 'bun:test';
import { type Options } from '../../../src/library/options';
import { parse, ParsingFlags } from '../../../src/library/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a single-valued option', () => {
    it('throw an error on missing parameter', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          cluster: 'f',
        },
        single: {
          type: 'single',
          names: ['-s'],
          cluster: 's',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { clusterPrefix: '', optionPrefix: '-' };
      expect(parse(options, ['-s', '-f'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -s: requires exactly 1.`,
      );
      expect(parse(options, ['-s'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -s: requires exactly 1.`,
      );
      expect(parse(options, ['sf'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -s: requires exactly 1.`,
      );
      expect(parse(options, ['s'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -s: requires exactly 1.`,
      );
    });

    it('handle empty names or names with spaces', () => {
      const options = {
        single: {
          type: 'single',
          names: ['', ' '],
        },
      } as const satisfies Options;
      expect(parse(options, ['', '0'])).resolves.toEqual({ single: '0' });
      expect(parse(options, [' ', '1'])).resolves.toEqual({ single: '1' });
      expect(parse(options, ['=123'])).resolves.toEqual({ single: '123' });
    });

    it('replace the option value with the parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ single: undefined });
      expect(parse(options, ['-s', ''])).resolves.toEqual({ single: '' });
      expect(parse(options, ['-s', '0', '-s', '1'])).resolves.toEqual({ single: '1' });
    });

    it('replace the option value with the result of the parsing callback', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: Number,
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', ''])).resolves.toEqual({ single: 0 });
      expect(parse(options, ['-s', '0', '-s', '1'])).resolves.toEqual({ single: 1 });
    });
  });
});
