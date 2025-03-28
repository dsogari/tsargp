import { describe, expect, it } from 'bun:test';
import type { Options } from '../../../src/library';
import { parse, ParsingFlags } from '../../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a function option', () => {
    it('throw an error on missing parameter to function option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          cluster: 's',
        },
        function: {
          type: 'function',
          names: ['-f'],
          cluster: 'f',
          paramCount: [1, 2],
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { clusterPrefix: '', optionPrefix: '-' };
      expect(parse(options, ['-f', '-s'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -f: requires between 1 and 2.`,
      );
      expect(parse(options, ['-f'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -f: requires between 1 and 2.`,
      );
      expect(parse(options, ['f'], flags)).rejects.toThrow(
        `Missing parameter(s) to option -f: requires between 1 and 2.`,
      );
    });

    it('accept zero parameters', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ function: [] });
    });

    it('handle empty names or names with spaces', () => {
      const options = {
        function: {
          type: 'function',
          names: ['', ' '],
        },
      } as const satisfies Options;
      expect(parse(options, ['', '0', '1'])).resolves.toEqual({ function: ['0', '1'] });
      expect(parse(options, [' ', '1', '2'])).resolves.toEqual({ function: ['1', '2'] });
      expect(parse(options, ['=123'])).resolves.toEqual({ function: ['123'] });
    });

    it('replace the option value with the parameters', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ function: undefined });
      expect(parse(options, ['-f', ''])).resolves.toEqual({ function: [''] });
      expect(parse(options, ['-f', '0', '-f', '1'])).resolves.toEqual({ function: ['1'] });
    });

    it('replace the option value with the result of the parsing callback', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          parse: Number,
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', ''])).resolves.toEqual({ function: 0 });
      expect(parse(options, ['-f', '0', '-f', '1'])).resolves.toEqual({ function: 1 });
    });

    it('skip a certain number of remaining arguments', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: 0,
          parse(param) {
            this.skipCount = Number(param[0]); // test access to `this`
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', '1'])).resolves.toEqual({ function: undefined });
      expect(parse(options, ['-f', '1', '2'])).rejects.toThrow('Unknown option 2.');
      expect(parse(options, ['-f', '0'])).rejects.toThrow('Unknown option 0.');
      expect(parse(options, ['-f', '-1'])).rejects.toThrow('Unknown option -1.');
    });

    it('accept infinite parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: Infinity,
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ function: [] });
    });
  });
});
