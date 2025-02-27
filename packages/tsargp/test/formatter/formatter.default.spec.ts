import { describe, expect, it } from 'bun:test';
import type { Options } from '../../lib/options';
import { format } from '../../lib/formatter';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('format', () => {
  describe('a default value is specified', () => {
    it('handle a boolean value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: true,
        },
      } as const satisfies Options;
      const message = format(options);
      expect(message.wrap()).toEqual(`  -f    Defaults to true.\n`);
    });

    it('handle a string value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: 'abc',
        },
      } as const satisfies Options;
      const message = format(options);
      expect(message.wrap()).toEqual(`  -f    Defaults to 'abc'.\n`);
    });

    it('handle a number value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: 123,
        },
      } as const satisfies Options;
      const message = format(options);
      expect(message.wrap()).toEqual(`  -f    Defaults to 123.\n`);
    });

    it('handle a string array value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: ['one', 'two'],
        },
      } as const satisfies Options;
      const message = format(options);
      expect(message.wrap()).toEqual(`  -f    Defaults to ['one', 'two'].\n`);
    });

    it('handle a number array value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: [1, 2],
        },
      } as const satisfies Options;
      const message = format(options);
      expect(message.wrap()).toMatch(`  -f    Defaults to [1, 2].\n`);
    });
  });

  describe('a default value callback is specified', () => {
    it('handle a callback without toString method', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: () => 0,
        },
      } as const satisfies Options;
      const message = format(options);
      expect(message.wrap()).toEqual(`  -f    Defaults to <() => 0>.\n`);
    });

    it('handle a callback with a toString method', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: () => true,
        },
      } as const satisfies Options;
      options.flag.default.toString = () => 'fcn';
      const message = format(options);
      expect(message.wrap()).toEqual(`  -f    Defaults to <fcn>.\n`);
    });
  });
});
