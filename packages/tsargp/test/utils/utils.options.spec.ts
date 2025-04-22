import { afterEach, describe, expect, it, jest } from 'bun:test';
import type { Options } from '../../src/library';
import {
  OptionRegistry,
  allOf,
  getOptionNames,
  getParamCount,
  isMessage,
  isNiladic,
  not,
  oneOf,
  valuesFor,
  visitRequirements,
} from '../../src/library/utils';

describe('OptionRegistry', () => {
  describe('constructor', () => {
    it('handle zero options', () => {
      expect(() => new OptionRegistry({})).not.toThrow();
    });

    it('ignore null values in option names', () => {
      const options = {
        flag: {
          type: 'flag',
          names: [null, '-f', '--flag'],
        },
      } as const satisfies Options;
      const registry = new OptionRegistry(options);
      expect(registry.names).toHaveLength(2);
      expect(registry.names.get('-f')).toEqual('flag');
      expect(registry.names.get('--flag')).toEqual('flag');
    });

    it('register positional options', () => {
      const options = {
        single: {
          type: 'single',
          positional: true,
        },
        array: {
          type: 'array',
          positional: true,
          preferredName: 'preferred',
        },
      } as const satisfies Options;
      const registry = new OptionRegistry(options);
      expect(registry.names).toHaveLength(0);
      expect(registry.positional).toEqual([
        ['single', options.single, ''],
        ['array', options.array, 'preferred'],
      ]);
    });

    it('set preferred name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: [null, '-f', '--flag'],
        },
        single: {
          type: 'single',
        },
      } as const satisfies Options;
      const registry = new OptionRegistry(options);
      expect(registry.names).toHaveLength(2);
      expect(options.flag).toHaveProperty('preferredName', '-f');
      expect(options.single).toHaveProperty('preferredName', '');
    });

    it('register cluster letters', () => {
      const options = {
        flag: {
          type: 'flag',
          cluster: 'fF',
        },
      } as const satisfies Options;
      const registry = new OptionRegistry(options);
      expect(registry.letters).toHaveLength(2);
      expect(registry.letters.get('f')).toEqual('flag');
      expect(registry.letters.get('F')).toEqual('flag');
    });
  });
});

describe('getOptionNames', () => {
  it('handle null values', () => {
    const options = {
      flag: {
        type: 'flag',
        names: [null, '-f', '--flag'],
      },
    } as const satisfies Options;
    expect(getOptionNames(options.flag)).toEqual(['-f', '--flag']);
  });
});

describe('isMessage', () => {
  it('handle all option types', () => {
    expect(isMessage('help')).toBeTrue();
    expect(isMessage('version')).toBeTrue();
    expect(isMessage('command')).toBeFalse();
    expect(isMessage('flag')).toBeFalse();
    expect(isMessage('single')).toBeFalse();
    expect(isMessage('array')).toBeFalse();
    expect(isMessage('function')).toBeFalse();
  });
});

describe('isNiladic', () => {
  it('handle all option types', () => {
    expect(isNiladic('help')).toBeTrue();
    expect(isNiladic('version')).toBeTrue();
    expect(isNiladic('command')).toBeTrue();
    expect(isNiladic('flag')).toBeTrue();
    expect(isNiladic('single')).toBeFalse();
    expect(isNiladic('array')).toBeFalse();
    expect(isNiladic('function')).toBeFalse();
  });
});

describe('getParamCount', () => {
  it('handle all option types', () => {
    const options = {
      help: { type: 'help' },
      version: { type: 'version' },
      command: { type: 'command' },
      flag: { type: 'flag' },
      single: { type: 'single' },
      array: { type: 'array' },
      function: { type: 'function' },
    } as const satisfies Options;
    expect(getParamCount(options.help)).toEqual([0, 0]);
    expect(getParamCount(options.version)).toEqual([0, 0]);
    expect(getParamCount(options.command)).toEqual([0, 0]);
    expect(getParamCount(options.flag)).toEqual([0, 0]);
    expect(getParamCount(options.single)).toEqual([1, 1]);
    expect(getParamCount(options.array)).toEqual([0, Infinity]);
    expect(getParamCount(options.function)).toEqual([0, Infinity]);
  });

  it('handle a function option with custom parameter count', () => {
    const options = {
      function1: {
        type: 'function',
        paramCount: Infinity,
      },
      function2: {
        type: 'function',
        paramCount: 0,
      },
      function3: {
        type: 'function',
        paramCount: 1,
      },
      function4: {
        type: 'function',
        paramCount: [0, 1],
      },
    } as const satisfies Options;
    expect(getParamCount(options.function1)).toEqual([0, Infinity]);
    expect(getParamCount(options.function2)).toEqual([0, 0]);
    expect(getParamCount(options.function3)).toEqual([1, 1]);
    expect(getParamCount(options.function4)).toEqual([0, 1]);
  });
});

describe('visitRequirements', () => {
  const mocks = [jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn()] as const;

  afterEach(() => {
    mocks.forEach((fcn) => fcn.mockClear());
  });

  it('handle a string requirement', () => {
    visitRequirements('', ...mocks);
    expect(mocks[0]).toHaveBeenCalledWith('');
  });

  it('handle a not expression', () => {
    const expression = not('');
    visitRequirements(expression, ...mocks);
    expect(mocks[1]).toHaveBeenCalledWith(expression);
  });

  it('handle an all expression', () => {
    const expression = allOf();
    visitRequirements(expression, ...mocks);
    expect(mocks[2]).toHaveBeenCalledWith(expression);
  });

  it('handle a one expression', () => {
    const expression = oneOf();
    visitRequirements(expression, ...mocks);
    expect(mocks[3]).toHaveBeenCalledWith(expression);
  });

  it('handle a requirement mapping', () => {
    const mapping = { name: null };
    visitRequirements(mapping, ...mocks);
    expect(mocks[4]).toHaveBeenCalledWith(mapping);
  });

  it('handle a requirement callback', () => {
    const callback = () => true;
    visitRequirements(callback, ...mocks);
    expect(mocks[5]).toHaveBeenCalledWith(callback);
  });
});

describe('valuesFor', () => {
  it('return an empty object', () => {
    expect(valuesFor({})).toEqual({});
  });
});
