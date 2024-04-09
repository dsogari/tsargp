import { describe, expect, it } from 'vitest';
import type { Options, ValidationFlags } from '../../lib';
import { OptionValidator } from '../../lib';
import '../utils.spec';

describe('OptionValidator', () => {
  describe('validate', () => {
    it('should ignore empty option names', () => {
      const options = {
        string: {
          type: 'string',
          names: ['', 'name', ''],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).not.toThrow();
    });

    it('should accept a positional option with no name', () => {
      const options = {
        string: {
          type: 'string',
          positional: true,
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).not.toThrow();
    });

    it('should accept a flag option with only a negation name', () => {
      const options = {
        flag: {
          type: 'flag',
          negationNames: ['-no-f'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).not.toThrow();
    });

    it('should throw an error on non-positional option with no name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['', null],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Non-positional option flag has no name.`);
    });

    it('should throw an error on option with invalid name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['a = b'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Option flag has invalid name 'a = b'.`);
    });

    it('should throw an error on flag option with invalid negation name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          negationNames: ['a = b'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Option flag has invalid name 'a = b'.`);
    });

    it('should throw an error on option with invalid positional marker', () => {
      const options = {
        boolean: {
          type: 'boolean',
          positional: 'a = b',
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Option boolean has invalid name 'a = b'.`);
    });

    it('should throw an error on duplicate option name in the same option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['dup', 'dup'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Option flag has duplicate name 'dup'.`);
    });

    it('should throw an error on duplicate option name across options', () => {
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
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Option flag2 has duplicate name 'dup'.`);
    });

    it('should throw an error on flag option with duplicate negation name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['dup'],
          negationNames: ['dup'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Option flag has duplicate name 'dup'.`);
    });

    it('should throw an error on option with duplicate positional marker', () => {
      const options = {
        boolean: {
          type: 'boolean',
          names: ['dup'],
          positional: 'dup',
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(() => validator.validate()).toThrow(`Option boolean has duplicate name 'dup'.`);
    });

    it('should return a warning on option name too similar to other names', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['flag1'],
        },
        flag2: {
          type: 'flag',
          names: ['flag2'],
        },
        flag3: {
          type: 'flag',
          names: ['flag3'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      const flags: ValidationFlags = { detectNamingIssues: true };
      const { warning } = validator.validate(flags);
      expect(warning).toHaveLength(1);
      expect(warning?.message).toEqual(
        `: Option name 'flag1' has too similar names ['flag2', 'flag3'].\n`,
      );
    });

    it('should return a warning on mixed naming conventions', () => {
      const options = {
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
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      const flags: ValidationFlags = { detectNamingIssues: true };
      const { warning } = validator.validate(flags);
      expect(warning).toHaveLength(3);
      expect(warning?.message).toEqual(
        `: Name slot 0 has mixed naming conventions ['lowercase: lower', 'UPPERCASE: UPPER', 'Capitalized: Capital'].\n` +
          `: Name slot 1 has mixed naming conventions ['noDash: abc', '-singleDash: -def', '--doubleDash: --ghi'].\n` +
          `: Name slot 2 has mixed naming conventions ['kebab-case: keb-ab', 'snake_case: sna_ke', 'colon:case: col:on'].\n`,
      );
    });

    it('should return a warning on nested command option name too similar to other names', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: {
            flag1: {
              type: 'flag',
              names: ['flag1'],
            },
            flag2: {
              type: 'flag',
              names: ['flag2'],
            },
            flag3: {
              type: 'flag',
              names: ['flag3'],
            },
          },
          exec() {},
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      const flags: ValidationFlags = { detectNamingIssues: true };
      const { warning } = validator.validate(flags);
      expect(warning).toHaveLength(1);
      expect(warning?.message).toEqual(
        `command: Option name 'flag1' has too similar names ['flag2', 'flag3'].\n`,
      );
    });
  });
});
