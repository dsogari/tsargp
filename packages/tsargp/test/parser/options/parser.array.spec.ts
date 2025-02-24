import { describe, expect, it } from 'bun:test';
import { type Options } from '../../../lib/options';
import { parse } from '../../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing an array-valued option', () => {
    it('accept zero parameters', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-a'])).resolves.toEqual({ array: [] });
    });

    it('handle empty names or names with spaces', () => {
      const options = {
        array: {
          type: 'array',
          names: ['', ' '],
        },
      } as const satisfies Options;
      expect(parse(options, ['', '0', '1'])).resolves.toEqual({ array: ['0', '1'] });
      expect(parse(options, [' ', '1', '2'])).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['=123'])).resolves.toEqual({ array: ['123'] });
    });

    it('replace the option value with the parameters', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ array: undefined });
      expect(parse(options, ['-a', ''])).resolves.toEqual({ array: [''] });
      expect(parse(options, ['-a', '0', '-a', '1'])).resolves.toEqual({ array: ['1'] });
    });

    it('replace the option value with the result of the parse callback', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          parse: Number,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', ''])).resolves.toEqual({ array: [0] });
      expect(parse(options, ['-a', '0', '-a', '1'])).resolves.toEqual({ array: [1] });
    });

    it('split parameters with a delimiter', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '1,2'])).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['-a', '1,2', '-a'])).resolves.toEqual({ array: [] });
    });

    it('append values when the option explicitly asks so', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          append: true,
          separator: ',',
          parse: Number,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '0', '-a', '1'])).resolves.toEqual({ array: [0, 1] });
      expect(parse(options, ['-a', '0,1', '-a', '2,3'])).resolves.toEqual({
        array: [0, 1, 2, 3],
      });
    });

    it('throw an error on option with too many values', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          separator: ',',
          limit: 1,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'a', 'b'])).rejects.toThrow(
        `Option -a has too many values: 2. Should have at most 1.`,
      );
      expect(parse(options, ['-a', 'a,b'])).rejects.toThrow(
        `Option -a has too many values: 2. Should have at most 1.`,
      );
    });

    it('handle an option that removes duplicates', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          separator: ',',
          unique: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '1', '2', '1'])).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['-a', '2,1,1,2'])).resolves.toEqual({ array: ['2', '1'] });
    });

    it('throw an error on option with too many values after removing duplicates', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          separator: ',',
          unique: true,
          limit: 1,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '1', '1'])).resolves.toEqual({ array: ['1'] });
      expect(parse(options, ['-a', '2,1,1,2'])).rejects.toThrow(
        `Option -a has too many values: 2. Should have at most 1.`,
      );
    });
  });
});
