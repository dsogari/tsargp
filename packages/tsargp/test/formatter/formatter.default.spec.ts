import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library/options';
import { format } from '../../src/library/formatter';

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
      expect(format(options).wrap()).toEqual(`  -f    Defaults to true.\n`);
    });

    it('handle a string value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: 'abc',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f    Defaults to 'abc'.\n`);
    });

    it('handle a number value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: 123,
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f    Defaults to 123.\n`);
    });

    it('handle a string array value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f    Defaults to ['one', 'two'].\n`);
    });

    it('handle a number array value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          default: [1, 2],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toMatch(`  -f    Defaults to [1, 2].\n`);
    });

    it('handle a number value in an array option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          default: 1,
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toMatch(
        '  -a  [<param>...]  Accepts multiple parameters. Defaults to 1.\n',
      );
    });

    it('handle a number array value with duplicates in an array option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          default: [1, 1],
          unique: true, // keep this
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toMatch(
        '  -a  [<param>...]  ' +
          'Accepts multiple parameters. ' +
          'Duplicate values will be removed.' +
          ' Defaults to [1, 1].\n',
      );
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
      expect(format(options).wrap()).toEqual(`  -f    Defaults to <() => 0>.\n`);
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
      expect(format(options).wrap()).toEqual(`  -f    Defaults to <fcn>.\n`);
    });
  });
});
