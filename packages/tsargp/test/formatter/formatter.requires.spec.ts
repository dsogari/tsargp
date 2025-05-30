import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { allOf, format, not, oneOf } from '../../src/library';
import { OptionRegistry } from '../../src/library/utils';

describe('format', () => {
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
        requires: not('flag'),
      },
    } as const satisfies Options;
    new OptionRegistry(options); // sets preferredName
    expect(format(options).wrap()).toEqual(`  -f    Requires -s.\n  -s    Requires no -f.\n`);
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
        requires: not(() => true),
      },
    } as const satisfies Options;
    options.flag.requires.toString = () => 'fcn';
    options.single.requires.item.toString = () => 'fcn';
    new OptionRegistry(options); // sets preferredName
    expect(format(options).wrap()).toEqual(
      `  -f    Requires <fcn>.\n  -s    Requires not <fcn>.\n`,
    );
  });
});
