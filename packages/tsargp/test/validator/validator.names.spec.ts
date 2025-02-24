import { describe, expect, it } from 'bun:test';
import { type Options } from '../../lib/options';
import { validate } from '../../lib/validator';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  it('accept an option with phantom names', () => {
    const options = {
      single: {
        type: 'single',
        names: [null, '', ' '],
        positional: '  ',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  it('throw an error on option with invalid name', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['='],
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option flag has invalid name '='.`);
  });

  it('throw an error on option with invalid positional marker', () => {
    const options = {
      single: {
        type: 'single',
        positional: '=',
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option single has invalid name '='.`);
  });

  it('throw an error on duplicate option name in the same option', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['dup', 'dup'],
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option flag has duplicate name 'dup'.`);
  });

  it('throw an error on duplicate option name across options', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['dup'],
      },
      flag2: {
        type: 'flag',
        names: ['dup'],
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option flag2 has duplicate name 'dup'.`);
  });

  it('throw an error on option with duplicate positional marker', () => {
    const options = {
      single: {
        type: 'single',
        names: ['dup'],
        positional: 'dup',
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option single has duplicate name 'dup'.`);
  });

  it('return a warning on mixed naming conventions in nested options', async () => {
    const options = {
      command: {
        type: 'command',
        options: {
          flag1: {
            type: 'flag',
            names: ['lower', 'abc', 'keb-ab'],
          },
          flag2: {
            type: 'flag',
            names: ['UPPER', '-def', 'sna_ke'],
          },
          flag3: {
            type: 'flag',
            names: ['Capital', '--ghi', 'col:on'],
          },
        },
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({
      warning: expect.objectContaining({
        message:
          `command: Name slot 0 has mixed naming conventions: 'lowercase: lower', 'UPPERCASE: UPPER', 'Capitalized: Capital'.\n` +
          `command: Name slot 1 has mixed naming conventions: 'noDash: abc', '-singleDash: -def', '--doubleDash: --ghi'.\n` +
          `command: Name slot 2 has mixed naming conventions: 'kebab-case: keb-ab', 'snake_case: sna_ke', 'colon:case: col:on'.\n`,
      }),
    });
  });

  it('return a warning on option name too similar to other names in nested options', async () => {
    const options = {
      command: {
        type: 'command',
        options: {
          flag1: {
            type: 'flag',
            names: ['abc'],
          },
          flag2: {
            type: 'flag',
            names: ['abcd'],
          },
          flag3: {
            type: 'flag',
            names: ['abcde'],
          },
        },
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({
      warning: expect.objectContaining({
        message:
          `command: Option name 'abc' has too similar names: 'abcd'.\n` +
          `command: Option name 'abcde' has too similar names: 'abcd'.\n`,
      }),
    });
  });
});
