import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { validate } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  it('accept an option with empty positional marker', () => {
    const options = {
      single: {
        type: 'single',
        positional: '',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  it('accept a version option with empty version', () => {
    const options = {
      version: {
        type: 'version',
        version: '',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  it('accept a version option with empty choices', () => {
    const options = {
      single: {
        type: 'single',
        choices: [],
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  it('accept an option with empty cluster letters', () => {
    const options = {
      flag: {
        type: 'flag',
        cluster: '',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
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
    expect(validate(options)).rejects.toThrow(
      `Duplicate positional option single2: previous was single1.`,
    );
  });
});
