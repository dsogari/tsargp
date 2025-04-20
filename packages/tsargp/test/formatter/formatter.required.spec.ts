import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { allOf, format, not, oneOf } from '../../src/library';
import { OptionRegistry } from '../../src/library/utils';

describe('format', () => {
  it('handle an option that is always required', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        required: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    Always required.\n`);
  });

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
        requiredIf: not('flag'),
      },
    } as const satisfies Options;
    new OptionRegistry(options); // sets preferredName
    expect(format(options).wrap()).toEqual(`  -f    Required if -s.\n  -s    Required if no -f.\n`);
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
            not({
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
        requiredIf: not(() => true),
      },
    } as const satisfies Options;
    options.flag.requiredIf.toString = () => 'fcn';
    options.single.requiredIf.item.toString = () => 'fcn';
    new OptionRegistry(options); // sets preferredName
    expect(format(options).wrap()).toEqual(
      `  -f    Required if <fcn>.\n  -s    Required if not <fcn>.\n`,
    );
  });
});
