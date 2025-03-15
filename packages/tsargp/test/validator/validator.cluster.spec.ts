import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { validate } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  it('accept an option with a phantom cluster letter', () => {
    const options = {
      flag: {
        type: 'flag',
        cluster: ' ',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });

  it('throw an error on option with invalid cluster letter', () => {
    const options = {
      flag: {
        type: 'flag',
        cluster: '=',
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option flag has invalid name '='.`);
  });

  it('throw an error on duplicate cluster letter in the same option', () => {
    const options = {
      flag: {
        type: 'flag',
        cluster: 'aba',
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option flag has duplicate name 'a'.`);
  });

  it('throw an error on duplicate cluster letter across different options', () => {
    const options = {
      flag1: {
        type: 'flag',
        cluster: 'f',
      },
      flag2: {
        type: 'flag',
        cluster: 'f',
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option flag2 has duplicate name 'f'.`);
  });

  it('return a warning on variadic function option with cluster letter', () => {
    const options = {
      function: {
        type: 'function',
        cluster: 'a',
        paramCount: [0, 1],
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({
      warning: expect.objectContaining({
        message: `Variadic option function may only appear as the last option in a cluster.\n`,
      }),
    });
  });

  it('return a warning on array-valued option with cluster letter', () => {
    const options = {
      array: {
        type: 'array',
        cluster: 'a',
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({
      warning: expect.objectContaining({
        message: `Variadic option array may only appear as the last option in a cluster.\n`,
      }),
    });
  });
});
