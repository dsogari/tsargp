import { describe, expect, it } from 'bun:test';
import { type Options, numberInRange } from '../../lib/options';
import { parse } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('a parse callback that throws is specified', () => {
    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: numberInRange([1, Infinity], '#0 #1 #2.'),
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', '123'])).resolves.toEqual({ single: 123 });
      expect(parse(options, ['-s', '0'])).rejects.toThrow(`-s '0' [1, Infinity]`);
      expect(parse(options, ['-s', 'a'])).rejects.toThrow(`-s 'a' [1, Infinity]`);
    });
  });

  describe('a regex constraint is specified', () => {
    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          regex: /\d+/s,
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', '123'])).resolves.toEqual({ single: '123' });
      expect(parse(options, ['-s', 'abc'])).rejects.toThrow(
        `Invalid parameter to -s: 'abc'. Value must match the regex /\\d+/s.`,
      );
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          regex: /\d+/s,
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '1', '2'])).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['-a', '1,2'])).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['-a', '123', 'abc'])).rejects.toThrow(
        `Invalid parameter to -a: 'abc'. Value must match the regex /\\d+/s.`,
      );
      expect(parse(options, ['-a', '123,abc'])).rejects.toThrow(
        `Invalid parameter to -a: 'abc'. Value must match the regex /\\d+/s.`,
      );
    });
  });

  describe('a choices array constraint is specified', () => {
    it('throw an error on invalid parameter to single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'abc'])).rejects.toThrow(
        `Invalid parameter to -s: 'abc'. Value must be one of: 'one'.`,
      );
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'one'])).resolves.toEqual({ single: 'one' });
      expect(parse(options, ['-s', 'abc'])).rejects.toThrow(
        `Invalid parameter to -s: 'abc'. Value must be one of: 'one', 'two'.`,
      );
    });

    it('throw an error on invalid parameter to array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['one'],
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'abc'])).rejects.toThrow(
        `Invalid parameter to -a: 'abc'. Value must be one of: 'one'.`,
      );
      expect(parse(options, ['-a', 'one,abc'])).rejects.toThrow(
        `Invalid parameter to -a: 'abc'. Value must be one of: 'one'.`,
      );
    });

    it('handle a array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['one', 'two'],
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'one', 'two'])).resolves.toEqual({
        array: ['one', 'two'],
      });
      expect(parse(options, ['-a', 'one,two'])).resolves.toEqual({ array: ['one', 'two'] });
      expect(parse(options, ['-a', 'abc'])).rejects.toThrow(
        `Invalid parameter to -a: 'abc'. Value must be one of: 'one', 'two'.`,
      );
    });
  });

  describe('a choices record constraint is specified', () => {
    it('throw an error on invalid parameter to single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: { one: 'two' },
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'abc'])).rejects.toThrow(
        `Invalid parameter to -s: 'abc'. Value must be one of: 'one'.`,
      );
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: { one: 'two' },
          parse: (param) => param,
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'one'])).resolves.toEqual({ single: 'two' });
      expect(parse(options, ['-s', 'abc'])).resolves.toEqual({ single: 'abc' });
    });

    it('throw an error on invalid parameter to array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: { one: 'two' },
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'abc'])).rejects.toThrow(
        `Invalid parameter to -a: 'abc'. Value must be one of: 'one'.`,
      );
      expect(parse(options, ['-a', 'one,abc'])).rejects.toThrow(
        `Invalid parameter to -a: 'abc'. Value must be one of: 'one'.`,
      );
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: { one: 'two' },
          separator: ',',
          parse: (param) => param,
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'one'])).resolves.toEqual({ array: ['two'] });
      expect(parse(options, ['-a', 'one,one'])).resolves.toEqual({ array: ['two', 'two'] });
      expect(parse(options, ['-a', 'abc'])).resolves.toEqual({ array: ['abc'] });
      expect(parse(options, ['-a', 'abc,abc'])).resolves.toEqual({ array: ['abc', 'abc'] });
    });
  });

  describe('a limit constraint is specified', () => {
    it('throw an error on array-valued option with too many values', () => {
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
  });

  describe('a unique constraint is specified', () => {
    it('handle an array-valued option', () => {
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
  });
});
