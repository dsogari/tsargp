import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { validate } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  describe('when an option has choices', () => {
    it('throw an error on single-valued option with duplicate choice value', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: ['', ''], // test empty choice
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option single has duplicate choice ''.`);
    });

    it('throw an error on array-valued option with duplicate choice value', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: ['dup', 'dup'],
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option array has duplicate choice 'dup'.`);
    });
  });

  describe('when an option has name-specific inline constraint', () => {
    it('throw an error on nameless option', () => {
      const options = {
        single: {
          type: 'single',
          positional: true,
          inline: {},
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option single has invalid inline constraint.`);
    });

    it('accept an option with parameter marker and inline constraint for no name', () => {
      const options = {
        array: {
          type: 'array',
          marker: 'a',
          inline: {},
        },
      } as const satisfies Options;
      expect(validate(options, { noWarn: true })).resolves.toEqual({});
    });

    it('accept an option with cluster letter and inline constraint for no name', () => {
      const options = {
        array: {
          type: 'array',
          cluster: 'a',
          inline: {},
        },
      } as const satisfies Options;
      expect(validate(options, { noWarn: true })).resolves.toEqual({});
    });

    describe('when an option disallows inline parameters', () => {
      it('throw an error on option that disallows inline parameters for a unknown name', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            inline: { a: false },
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option single has invalid inline constraint.`);
      });

      it('accept an option that disallows inline parameters for an empty name', () => {
        const options = {
          array: {
            type: 'array',
            names: ['', '--array'],
            inline: { '': false },
          },
        } as const satisfies Options;
        expect(validate(options)).resolves.toEqual({});
      });
    });

    describe('when an option requires inline parameters', () => {
      it('throw an error on option that requires inline parameters for a unknown name', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            inline: { a: 'always' },
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option single has invalid inline constraint.`);
      });

      it('accept an option that requires inline parameters for an empty name', () => {
        const options = {
          array: {
            type: 'array',
            names: ['', '--array'],
            inline: { '': 'always' },
          },
        } as const satisfies Options;
        expect(validate(options)).resolves.toEqual({});
      });
    });
  });

  describe('when an option has all-names inline constraint', () => {
    describe('when an option disallows inline parameters', () => {
      it('throw an error on nameless option', () => {
        const options = {
          single: {
            type: 'single',
            positional: true,
            inline: false,
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option single has invalid inline constraint.`);
      });

      it('accept an array-valued option with a name', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            inline: false,
          },
        } as const satisfies Options;
        expect(validate(options)).resolves.toEqual({});
      });
    });

    describe('when an option requires inline parameters', () => {
      it('throw an error on nameless option', () => {
        const options = {
          single: {
            type: 'single',
            positional: true,
            inline: 'always',
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option single has invalid inline constraint.`);
      });

      it('throw an error on array-valued option with a name', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            inline: 'always',
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option array has invalid inline constraint.`);
      });

      it('throw an error on function option with a name, but undefined parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            inline: 'always',
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
      });

      it('throw an error on function option with a name, but zero parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            inline: 'always',
            paramCount: 0,
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
      });

      it('throw an error on function option with a name, but positive parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            inline: 'always',
            paramCount: 2,
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
      });

      it('throw an error on function option with a name, but infinite parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            inline: 'always',
            paramCount: Infinity,
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(`Option function has invalid inline constraint.`);
      });
    });
  });

  describe('when an option has parameter count', () => {
    describe('when an option has valid parameter count', () => {
      it('accept a function option with zero parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: 0,
          },
        } as const satisfies Options;
        expect(validate(options)).resolves.toEqual({});
      });

      it('accept a function option with positive parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: 2,
          },
        } as const satisfies Options;
        expect(validate(options)).resolves.toEqual({});
      });

      it('accept a function option with infinite parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: Infinity,
          },
        } as const satisfies Options;
        expect(validate(options)).resolves.toEqual({});
      });
    });

    describe('when an option has invalid parameter count', () => {
      it('throw an error on function option with not-a-number parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: NaN,
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(
          `Option function has invalid parameter count NaN.`,
        );
      });

      it('throw an error on function option with negative parameter count', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: -1,
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(
          `Option function has invalid parameter count -1.`,
        );
      });

      it('throw an error on function option with invalid range maximum', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
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
            names: ['-f'],
            paramCount: [-1, 1],
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(
          `Option function has invalid parameter count [-1, 1].`,
        );
      });

      it('throw an error on function option with invalid range maximum with NaN', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: [1, NaN],
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(
          `Option function has invalid parameter count [1, NaN].`,
        );
      });

      it('throw an error on function option with invalid range minimum with NaN', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            paramCount: [NaN, 1],
          },
        } as const satisfies Options;
        expect(validate(options)).rejects.toThrow(
          `Option function has invalid parameter count [NaN, 1].`,
        );
      });
    });
  });

  describe('when an option has element count', () => {
    describe('when an option has invalid element count', () => {
      it('throw an error on array-valued option with example value with too many values', () => {
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

      it('throw an error on array-valued option with default value with too many values', () => {
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
});
