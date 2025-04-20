import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { allOf, not, oneOf, validate } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  describe('validating forward requirements', () => {
    it('ignore a requirement callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: () => false,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('throw an error on option required by itself with not', () => {
      const options = {
        flag: {
          type: 'flag',
          requires: not('flag'),
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag requires itself.`);
    });

    it('throw an error on option required by itself with allOf', () => {
      const options = {
        flag: {
          type: 'flag',
          requires: allOf('flag'),
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag requires itself.`);
    });

    it('throw an error on unknown option required with oneOf', () => {
      const options = {
        flag: {
          type: 'flag',
          requires: oneOf('other'),
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Unknown option other in requirement.`);
    });

    it('throw an error on help option required with undefined', () => {
      const options = {
        flag: {
          type: 'flag',
          requires: { help: undefined },
        },
        help: {
          type: 'help',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Invalid option help in requirement.`);
    });

    it('throw an error on version option required with null', () => {
      const options = {
        flag: {
          type: 'flag',
          requires: { version: null },
        },
        version: {
          type: 'version',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Invalid option version in requirement.`);
    });

    it('accept a command option required to be present', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: 'command',
        },
        command: {
          type: 'command',
          names: ['-c'],
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('throw an error on option required to be present despite being always required', () => {
      const options = {
        flag1: {
          type: 'flag',
          requires: { flag2: undefined },
        },
        flag2: {
          type: 'flag',
          required: true,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Invalid required value for option flag2. Option is always required or has a default value.`,
      );
    });

    it('throw an error on option required to be absent despite having a default value', () => {
      const options = {
        flag1: {
          type: 'flag',
          requires: { flag2: null },
        },
        flag2: {
          type: 'flag',
          default: () => true,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Invalid required value for option flag2. Option is always required or has a default value.`,
      );
    });

    it('allow a flag option required with an arbitrary value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requires: { flag2: expect },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });
  });

  describe('validating conditional requirements', () => {
    it('ignore a requirement callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: () => false,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('throw an error on option required by itself with not', () => {
      const options = {
        flag: {
          type: 'flag',
          requiredIf: not('flag'),
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag requires itself.`);
    });

    it('throw an error on option required by itself with allOf', () => {
      const options = {
        flag: {
          type: 'flag',
          requiredIf: allOf('flag'),
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag requires itself.`);
    });

    it('throw an error on unknown option required with oneOf', () => {
      const options = {
        flag: {
          type: 'flag',
          requiredIf: oneOf('other'),
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Unknown option other in requirement.`);
    });

    it('throw an error on help option required with undefined', () => {
      const options = {
        flag: {
          type: 'flag',
          requiredIf: { help: undefined },
        },
        help: {
          type: 'help',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Invalid option help in requirement.`);
    });

    it('throw an error on version option required with null', () => {
      const options = {
        flag: {
          type: 'flag',
          requiredIf: { version: null },
        },
        version: {
          type: 'version',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Invalid option version in requirement.`);
    });

    it('accept an option required if a command option is present', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: 'command',
        },
        command: {
          type: 'command',
          names: ['-c'],
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('throw an error on option required if another is be present despite being always required', () => {
      const options = {
        flag1: {
          type: 'flag',
          requiredIf: { flag2: undefined },
        },
        flag2: {
          type: 'flag',
          required: true,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Invalid required value for option flag2. Option is always required or has a default value.`,
      );
    });

    it('throw an error on option required if another is absent despite having a default value', () => {
      const options = {
        flag1: {
          type: 'flag',
          requiredIf: { flag2: null },
        },
        flag2: {
          type: 'flag',
          default: () => true,
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(
        `Invalid required value for option flag2. Option is always required or has a default value.`,
      );
    });

    it('allow a flag option required if another has an arbitrary value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requiredIf: { flag2: expect },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });
  });
});
