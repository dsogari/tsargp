import { describe, expect, it } from 'bun:test';
import { type Options } from '../../../lib/options';
import { parse } from '../../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a function option', () => {
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

    it('replace the option value with the result of the parse callback', () => {
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
  });
});
