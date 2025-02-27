import { describe, expect, it } from 'bun:test';
import { type Options, OptionRegistry, allOf, oneOf, notOf } from '../../lib/options';
import { format } from '../../lib/formatter';

describe('format', () => {
  describe('a forward requirement is specified', () => {
    it('handle an option that requires the presence or absence of another', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: 'single',
        },
        single: {
          type: 'single',
          names: ['-s'],
          requires: notOf('flag'),
        },
      } as const satisfies Options;
      new OptionRegistry(options); // sets preferredName
      expect(format(options).wrap()).toEqual(
        `  -f           Requires -s.\n  -s  <param>  Requires no -f.\n`,
      );
    });

    it('handle a requirement with specific values using expressions', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: oneOf(
            {
              single: undefined,
            },
            allOf(
              {
                array: null,
              },
              notOf({
                single: { a: 1, b: [2] },
                array: [1, 'a', { a: false }],
              }),
            ),
          ),
        },
        single: {
          type: 'single',
          names: ['-s'],
          group: null,
        },
        array: {
          type: 'array',
          names: ['-a'],
          group: null,
        },
      } as const satisfies Options;
      new OptionRegistry(options); // sets preferredName
      expect(format(options).wrap()).toEqual(
        `  -f    Requires (-s or (no -a and (-s != {a: 1, b: [2]} or -a != [1, 'a', {a: false}]))).\n`,
      );
    });

    it('handle an option with a requirement callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: () => true,
        },
        single: {
          type: 'single',
          names: ['-s'],
          requires: notOf(() => true),
        },
      } as const satisfies Options;
      options.flag.requires.toString = () => 'fcn';
      options.single.requires.item.toString = () => 'fcn';
      new OptionRegistry(options); // sets preferredName
      expect(format(options).wrap()).toEqual(
        `  -f           Requires <fcn>.\n  -s  <param>  Requires not <fcn>.\n`,
      );
    });
  });

  describe('a conditional requirement is specified', () => {
    it('handle an option that is required if another is present or absent', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: 'single',
        },
        single: {
          type: 'single',
          names: ['-s'],
          requiredIf: notOf('flag'),
        },
      } as const satisfies Options;
      new OptionRegistry(options); // sets preferredName
      expect(format(options).wrap()).toEqual(
        `  -f           Required if -s.\n  -s  <param>  Required if no -f.\n`,
      );
    });

    it('handle a requirement with specific values using expressions', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: oneOf(
            {
              single: undefined,
            },
            allOf(
              {
                array: null,
              },
              notOf({
                single: { a: 1, b: [2] },
                array: [1, 'a', { a: false }],
              }),
            ),
          ),
        },
        single: {
          type: 'single',
          names: ['-s'],
          group: null,
        },
        array: {
          type: 'array',
          names: ['-a'],
          group: null,
        },
      } as const satisfies Options;
      new OptionRegistry(options); // sets preferredName
      expect(format(options).wrap()).toEqual(
        `  -f    Required if (-s or (no -a and (-s != {a: 1, b: [2]} or -a != [1, 'a', {a: false}]))).\n`,
      );
    });

    it('handle an option with a requirement callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: () => true,
        },
        single: {
          type: 'single',
          names: ['-s'],
          requiredIf: notOf(() => true),
        },
      } as const satisfies Options;
      options.flag.requiredIf.toString = () => 'fcn';
      options.single.requiredIf.item.toString = () => 'fcn';
      new OptionRegistry(options); // sets preferredName
      expect(format(options).wrap()).toEqual(
        `  -f           Required if <fcn>.\n  -s  <param>  Required if not <fcn>.\n`,
      );
    });
  });
});
