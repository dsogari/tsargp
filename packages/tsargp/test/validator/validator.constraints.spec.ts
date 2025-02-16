import { describe, expect, it } from 'bun:test';
import { type Options } from '../../lib/options';
import { OptionValidator } from '../../lib/validator';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('OptionValidator', () => {
  describe('validate', () => {
    it('throw an error on single-valued option with duplicate choice', () => {
      const options = {
        single: {
          type: 'single',
          choices: ['dup', 'dup'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(`Option single has duplicate choice 'dup'.`);
    });

    it('throw an error on array-valued option with duplicate choice', () => {
      const options = {
        array: {
          type: 'array',
          choices: ['dup', 'dup'],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(`Option array has duplicate choice 'dup'.`);
    });

    it('accept an array-valued option that disallows inline parameters', () => {
      const options = {
        array: {
          type: 'array',
          inline: false,
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).resolves.toMatchObject({});
    });

    it('throw an error on array-valued option that requires inline parameters', () => {
      const options = {
        array: {
          type: 'array',
          inline: 'always',
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(`Option array has invalid inline constraint.`);
    });

    it('throw an error on function option that requires inline parameters', () => {
      const options = {
        function: {
          type: 'function',
          inline: 'always',
          paramCount: 2,
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(
        `Option function has invalid inline constraint.`,
      );
    });

    it('throw an error on function option with negative parameter count', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: -1,
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(
        `Option function has invalid parameter count -1.`,
      );
    });

    it('throw an error on function option with zero parameter count', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: 0,
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(
        `Option function has invalid parameter count 0.`,
      );
    });

    it('throw an error on function option with unitary parameter count', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: 1,
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(
        `Option function has invalid parameter count 1.`,
      );
    });

    it('throw an error on function option with invalid parameter count range', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: [0, 0],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(
        `Option function has invalid parameter count [0, 0].`,
      );
    });

    it('throw an error on function option with invalid minimum parameter count', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: [-1, 1],
        },
      } as const satisfies Options;
      const validator = new OptionValidator(options);
      expect(validator.validate()).rejects.toThrow(
        `Option function has invalid parameter count [-1, 1].`,
      );
    });
  });
});
