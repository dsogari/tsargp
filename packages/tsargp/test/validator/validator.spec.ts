import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { validate } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  describe('when an option is suppliable', () => {
    it('accept an option with empty positional marker', () => {
      const options = {
        single: {
          type: 'single',
          marker: '',
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept a version option with empty version', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '',
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept a single-valued option with empty choices', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          choices: [],
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept an array-valued option with empty choices', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          choices: [],
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept an option with cluster letters', () => {
      const options = {
        single: {
          type: 'single',
          cluster: 's',
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept a positional option with no name', () => {
      const options = {
        single: {
          type: 'single',
          positional: true,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept an option with environment data sources', () => {
      const options = {
        single: {
          type: 'single',
          sources: [''],
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });

    it('accept an option that reads data from the standard input', () => {
      const options = {
        single: {
          type: 'single',
          stdin: true,
        },
      } as const satisfies Options;
      expect(validate(options)).resolves.toEqual({});
    });
  });

  it('accept multiple positional options', () => {
    const options = {
      single1: {
        type: 'single',
        positional: true,
      },
      single2: {
        type: 'single',
        positional: true,
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  it('accept multiple positional markers', () => {
    const options = {
      single1: {
        type: 'single',
        marker: 'abc',
      },
      single2: {
        type: 'single',
        marker: 'def',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  describe('when an option is not suppliable', () => {
    it('throw an error on option with empty cluster letters', () => {
      const options = {
        flag: {
          type: 'flag',
          cluster: '',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag is not suppliable.`);
    });

    it('throw an error on help option with no name', () => {
      const options = {
        help: {
          type: 'help',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option help is not suppliable.`);
    });

    it('throw an error on version option with no name', () => {
      const options = {
        version: {
          type: 'version',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option version is not suppliable.`);
    });

    it('throw an error on command option with no name', () => {
      const options = {
        command: {
          type: 'command',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option command is not suppliable.`);
    });

    it('throw an error on flag option with no name', () => {
      const options = {
        flag: {
          type: 'flag',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option flag is not suppliable.`);
    });

    it('throw an error on single-valued option with no name', () => {
      const options = {
        single: {
          type: 'single',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option single is not suppliable.`);
    });

    it('throw an error on array-valued option with no name', () => {
      const options = {
        array: {
          type: 'array',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option array is not suppliable.`);
    });

    it('throw an error on function option with no name', () => {
      const options = {
        function: {
          type: 'function',
        },
      } as const satisfies Options;
      expect(validate(options)).rejects.toThrow(`Option function is not suppliable.`);
    });
  });
});
