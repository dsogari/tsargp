import { describe, expect, it } from 'bun:test';
import { type Options } from '../../lib/options';
import { OptionValidator } from '../../lib/validator';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('OptionValidator', () => {
  describe('validate', () => {
    it('accept an option with empty positional marker', () => {
      const options = {
        single: {
          type: 'single',
          positional: '',
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).resolves.toMatchObject({});
    });

    it('accept a version option with empty version', () => {
      const options = {
        version: {
          type: 'version',
          version: '',
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).resolves.toMatchObject({});
    });

    it('accept a version option with empty choices', () => {
      const options = {
        single: {
          type: 'single',
          choices: [],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).resolves.toMatchObject({});
    });

    it('accept an option with empty cluster letters', () => {
      const options = {
        flag: {
          type: 'flag',
          cluster: '',
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).resolves.toMatchObject({});
    });

    it('throw an error on duplicate positional option', () => {
      const options = {
        single1: {
          type: 'single',
          positional: true,
        },
        single2: {
          type: 'single',
          positional: '',
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(
        `Duplicate positional option single2: previous was single1.`,
      );
    });

    it('validate nested command options recursively', () => {
      const options = {
        cmd1: {
          type: 'command',
          options: {
            cmd2: {
              type: 'command',
              options: (): Options => ({ flag: { type: 'flag', names: [' '] } }),
            },
          },
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(`Option cmd1.cmd2.flag has invalid name ' '.`);
    });

    it('avoid circular references while evaluating nested command options', () => {
      const options = {
        command: {
          type: 'command',
          options: {
            command: {
              type: 'command',
              options: (): Options => options,
            },
          },
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).resolves.toMatchObject({});
    });
  });
});
