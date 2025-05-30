import { describe, expect, it } from 'bun:test';
import type { Options, ValidationFlags } from '../../src/library';
import { validate } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  it('accept an option with phantom names', () => {
    const options = {
      array: {
        type: 'array',
        names: [null, '', ' '],
        marker: '  ',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  it('accept an option with environment variable with same name as a name', () => {
    const options = {
      single: {
        type: 'single',
        names: ['dup'],
        sources: ['dup'],
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  describe('invalid names', () => {
    it('throw an error on option with invalid name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['='],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag has invalid name '='.`);
    });

    it('throw an error on option with invalid parameter marker', () => {
      const options = {
        array: {
          type: 'array',
          marker: '=',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option array has invalid name '='.`);
    });

    it('throw an error on option with invalid environment variable name', () => {
      const options = {
        single: {
          type: 'single',
          sources: ['='],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option single has invalid name '='.`);
    });
  });

  describe('duplicate names', () => {
    it('throw an error on duplicate option name in the same option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['dup', 'dup'],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag has duplicate name 'dup'.`);
    });

    it('throw an error on duplicate option name across different options', () => {
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

    it('throw an error on option with duplicate parameter marker in the same option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['dup'],
          marker: 'dup',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option array has duplicate name 'dup'.`);
    });

    it('throw an error on option with duplicate parameter marker across different options', () => {
      const options = {
        array1: {
          type: 'array',
          marker: 'dup',
        },
        array2: {
          type: 'array',
          marker: 'dup',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option array2 has duplicate name 'dup'.`);
    });

    it('throw an error on duplicate environment variable in the same option', () => {
      const options = {
        flag: {
          type: 'flag',
          sources: ['dup', 'dup'],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag has duplicate name 'dup'.`);
    });

    it('throw an error on duplicate environment variable across different options', () => {
      const options = {
        flag1: {
          type: 'flag',
          sources: ['dup'],
        },
        flag2: {
          type: 'flag',
          sources: ['dup'],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag2 has duplicate name 'dup'.`);
    });
  });

  describe('naming warnings', () => {
    it('return a warning on mixed naming conventions in nested options', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
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
      expect(validate(options, { noWarn: true })).resolves.toEqual({});
      expect(validate(options)).resolves.toEqual({
        warning: expect.objectContaining({
          message:
            `command: Name slot 0 has mixed naming conventions: 'lowercase: lower', 'UPPERCASE: UPPER', 'Capitalized: Capital'.\n` +
            `command: Name slot 1 has mixed naming conventions: 'noDash: abc', '-singleDash: -def', '--doubleDash: --ghi'.\n` +
            `command: Name slot 2 has mixed naming conventions: 'kebab-case: keb-ab', 'snake_case: sna_ke', 'colon:case: col:on'.\n`,
        }),
      });
    });

    it('return a warning on option name too similar to other names in nested options', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
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
      const flags: ValidationFlags = { similarity: 0.8 };
      expect(validate(options)).resolves.toEqual({});
      expect(validate(options, { ...flags, noWarn: true })).resolves.toEqual({});
      expect(validate(options, flags)).resolves.toEqual({
        warning: expect.objectContaining({
          message:
            `command: Option name 'abc' has too similar names: 'abcd'.\n` +
            `command: Option name 'abcde' has too similar names: 'abcd'.\n`,
        }),
      });
    });
  });
});
