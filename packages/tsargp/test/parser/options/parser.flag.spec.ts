import { describe, expect, it, jest } from 'bun:test';
import { type Options, OptionValues } from '../../../lib/options';
import { parse } from '../../../lib/parser';

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

    it('handle an asynchronous callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse: () => 'abc',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: 'abc' });
    });

    it('handle an asynchronous callback that throws', () => {
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

    it('replace the option value with the result of the parsing callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ flag: undefined });
      expect(options.flag.parse).not.toHaveBeenCalled();
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: '' });
      expect(options.flag.parse).toHaveBeenCalledWith('', {
        values: { flag: '' }, // should have been { flag: undefined } at the time of call
        index: 0,
        name: '-f',
        comp: false,
      });
      options.flag.parse.mockClear();
      expect(parse(options, ['-f', '-f'])).resolves.toEqual({ flag: '' });
      expect(options.flag.parse).toHaveBeenCalledWith('', {
        values: { flag: '' }, // should have been { flag: undefined } at the time of call
        index: 0,
        name: '-f',
        comp: false,
      });
      expect(options.flag.parse).toHaveBeenCalledTimes(2);
    });

    it('break the parsing loop when the option explicitly asks so', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          parse: jest.fn(() => 'abc'),
          break: true,
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1', '-f2'])).resolves.toEqual({
        flag1: 'abc',
        flag2: undefined,
      });
      expect(options.flag1.parse).toHaveBeenCalled();
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });

    it('expose parsed values to the parsing callback', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          parse(_, { values }) {
            expect((values as OptionValues<typeof options>).flag2).toBeTruthy();
          },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f2', '-f1'])).resolves.toEqual({
        flag1: undefined,
        flag2: true,
      });
    });
  });
});
