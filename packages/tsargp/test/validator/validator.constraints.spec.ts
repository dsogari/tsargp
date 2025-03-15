import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { validate } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  describe('when an option has duplicate choice values', () => {
    it('throw an error on single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          choices: ['dup', 'dup'],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option single has duplicate choice 'dup'.`);
    });

    it('throw an error on array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          choices: ['dup', 'dup'],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option array has duplicate choice 'dup'.`);
    });
  });

  describe('when an option disallows inline parameters', () => {
    it('accept an array-valued option that disallows inline parameters', () => {
      const options = {
        array: {
          type: 'array',
          inline: false,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });
  });

  describe('when an option requires inline parameters', () => {
    it('throw an error on array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          inline: 'always',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option array has invalid inline constraint.`);
    });

    it('throw an error on function option with undefined parameter count', () => {
      const options = {
        function: {
          type: 'function',
          inline: 'always',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
    });

    it('throw an error on function option with negative parameter count', () => {
      const options = {
        function: {
          type: 'function',
          inline: 'always',
          paramCount: -1,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
    });

    it('throw an error on function option with zero parameter count', () => {
      const options = {
        function: {
          type: 'function',
          inline: 'always',
          paramCount: 0,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
    });

    it('throw an error on function option with positive parameter count', () => {
      const options = {
        function: {
          type: 'function',
          inline: 'always',
          paramCount: 2,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
    });
  });

  describe('when an option has valid parameter count', () => {
    it('accept a function option with negative parameter count', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: -1,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept a function option with zero parameter count', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: 0,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept a function option with positive parameter count', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: 2,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });
  });

  describe('when an option has invalid parameter count', () => {
    it('throw an error on function option with invalid range maximum', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: [0, 0],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Option function has invalid parameter count [0, 0].`,
      );
    });

    it('throw an error on function option with invalid range minimum', () => {
      const options = {
        function: {
          type: 'function',
          paramCount: [-1, 1],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Option function has invalid parameter count [-1, 1].`,
      );
    });
  });

  describe('when an array option has invalid element count', () => {
    it('throw an error on option with example value with too many values', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: [1, 2, 2],
          unique: true,
          limit: 1,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Option array has too many values: 2. Should have at most 1.`,
      );
    });

    it('throw an error on option with default value with too many values', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          default: [1, 2, 2],
          unique: true,
          limit: 1,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Option array has too many values: 2. Should have at most 1.`,
      );
    });
  });
});
