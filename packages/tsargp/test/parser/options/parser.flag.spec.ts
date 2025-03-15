import { describe, expect, it } from 'bun:test';
import { type Options } from '../../../src/library/options';
import { parse } from '../../../src/library/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a flag option', () => {
    it('handle empty names or names with spaces', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['', ' '],
        },
      } as const satisfies Options;
      expect(parse(options, [''])).resolves.toEqual({ flag: true });
      expect(parse(options, [' '])).resolves.toEqual({ flag: true });
    });

    it('handle a negation name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f', '-no-f'],
          parse: (_, { name }) => name !== '-no-f',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: true });
      expect(parse(options, ['-no-f'])).resolves.toEqual({ flag: false });
    });

    it('handle an asynchronous parsing callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse: async () => 'abc',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: 'abc' });
    });

    it('handle an asynchronous parsing callback that throws', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          async parse() {
            throw Error(this.type); // test access to `this`
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).rejects.toThrow('flag');
    });
  });
});
