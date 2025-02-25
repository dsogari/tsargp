import { describe, expect, it } from 'bun:test';
import { type Options } from '../../lib/options';
import { validate, ValidationFlags } from '../../lib/validator';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('validate', () => {
  it('validate nested options', () => {
    const options = {
      cmd1: {
        type: 'command',
        options: {
          cmd2: {
            type: 'command',
            options: { flag: { type: 'flag', names: ['='] } },
          },
        },
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option cmd1.cmd2.flag has invalid name '='.`);
  });

  it('validate nested options from a callback', () => {
    const options = {
      cmd1: {
        type: 'command',
        options: {
          cmd2: {
            type: 'command',
            options: () => ({ flag: { type: 'flag', names: ['='] } }),
          },
        },
      },
    } as const satisfies Options;
    expect(validate(options)).rejects.toThrow(`Option cmd1.cmd2.flag has invalid name '='.`);
  });

  it('validate nested options from a dynamic import', () => {
    const options = {
      cmd1: {
        type: 'command',
        options: {
          cmd2: {
            type: 'command',
            options: '../data/invalid',
          },
        },
      },
    } as const satisfies Options;
    const flags: ValidationFlags = { resolve: import.meta.resolve.bind(import.meta) };
    expect(validate(options, flags)).rejects.toThrow(`Option cmd1.cmd2.flag has invalid name '='.`);
  });

  it('skip nested options when configured that way', () => {
    const options = {
      cmd1: {
        type: 'command',
        options: {
          cmd2: {
            type: 'command',
            options: { flag: { type: 'flag', names: ['='] } },
          },
        },
      },
    } as const satisfies Options;
    expect(validate(options, { noRecurse: true })).resolves.toEqual({});
  });

  it('avoid circular references while evaluating nested options', () => {
    const options = {
      command: {
        type: 'command',
        options: () => Object.assign({}, options),
      },
    } as const satisfies Options;
    expect(validate(options)).resolves.toEqual({});
  });
});
