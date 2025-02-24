import { describe, expect, it } from 'bun:test';
import { type Options } from '../../lib/options';
import { parse } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
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

  describe('a choices constraint is specified', () => {
    it('handle a single-valued option with case-sensitive selection', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'one'])).resolves.toEqual({ single: 'one' });
      expect(parse(options, ['-s', 'One'])).rejects.toThrow(
        `Invalid parameter to -s: 'One'. Value must be one of: 'one', 'two'.`,
      );
    });

    it('handle an array-valued option with case-sensitive selection', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'one'])).resolves.toEqual({ array: ['one'] });
      expect(parse(options, ['-a', 'one', 'One'])).rejects.toThrow(
        `Invalid parameter to -a: 'One'. Value must be one of: 'one', 'two'.`,
      );
    });
  });

  describe('a mapping constraint are specified', () => {
    it('handle a single-valued option with case-sensitive selection', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          mapping: { one: 'two' },
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'one'])).resolves.toEqual({ single: 'two' });
      expect(parse(options, ['-s', 'One'])).resolves.toEqual({ single: 'One' });
    });

    it('handle an array-valued option with case-sensitive selection', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          mapping: { one: 'two' },
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'one', 'One'])).resolves.toEqual({ array: ['two', 'One'] });
    });
  });

  describe('both a choices and a mapping constraint are specified', () => {
    it('handle a single-valued option with case-sensitive selection', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'abc'],
          mapping: { one: 'two' },
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'one'])).resolves.toEqual({ single: 'two' });
      expect(parse(options, ['-s', 'abc'])).resolves.toEqual({ single: 'abc' });
      expect(parse(options, ['-s', 'two'])).rejects.toThrow(
        `Invalid parameter to -s: 'two'. Value must be one of: 'one', 'abc'.`,
      );
    });

    it('handle a single-valued option with case-insensitive selection', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['one', 'abc'],
          mapping: { one: 'two' },
          caseInsensitive: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', 'One'])).resolves.toEqual({ single: 'two' });
      expect(parse(options, ['-s', 'Abc'])).resolves.toEqual({ single: 'Abc' });
      expect(parse(options, ['-s', 'Two'])).rejects.toThrow(
        `Invalid parameter to -s: 'Two'. Value must be one of: 'one', 'abc'.`,
      );
    });

    it('handle an array-valued option with case-sensitive selection', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['one', 'abc'],
          mapping: { one: 'two' },
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'one', 'abc'])).resolves.toEqual({ array: ['two', 'abc'] });
      expect(parse(options, ['-a', 'one,two'])).rejects.toThrow(
        `Invalid parameter to -a: 'two'. Value must be one of: 'one', 'abc'.`,
      );
    });

    it('handle an array-valued option with case-insensitive selection', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['one', 'abc'],
          mapping: { one: 'two' },
          caseInsensitive: true,
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'One', 'Abc'])).resolves.toEqual({ array: ['two', 'Abc'] });
      expect(parse(options, ['-a', 'One,Two'])).rejects.toThrow(
        `Invalid parameter to -a: 'Two'. Value must be one of: 'one', 'abc'.`,
      );
    });
  });
});
