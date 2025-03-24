import { afterEach, describe, expect, it, jest } from 'bun:test';
import type { Options } from '../src/library';
import { AnsiMessage, AnsiString, allOf, not, oneOf, parse, valuesFor } from '../src/library';
import {
  getOptionNames,
  getParamCount,
  isMessage,
  isNiladic,
  OptionRegistry,
  visitRequirements,
  getVersion,
  numberInRange,
  sectionFooter,
} from '../src/utility';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('OptionRegistry', () => {
  describe('constructor', () => {
    it('handle zero options', () => {
      expect(() => new OptionRegistry({})).not.toThrow();
    });

    describe('registering option names', () => {
      it('ignore null values', () => {
        const options = {
          flag: {
            type: 'flag',
            names: [null, '-f'], // should ignore null values
          },
          single: {
            type: 'single',
            positional: true,
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        expect(registry.names).toHaveLength(1);
        expect(registry.names.get('-f')).toEqual('flag');
        expect(options.flag).toHaveProperty('preferredName', '-f');
        expect(options.single).toHaveProperty('preferredName', undefined);
      });

      it('include the positional marker', () => {
        const options = {
          single: {
            type: 'single',
            positional: 'marker',
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        expect(registry.names).toHaveLength(1);
        expect(registry.names.get('marker')).toEqual('single');
        expect(options.single).toHaveProperty('preferredName', 'marker');
        expect(registry.positional).toEqual(['single', options.single, 'marker']);
      });
    });

    describe('registering cluster letters', () => {
      it('register each letter', () => {
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
});

describe('getOptionNames', () => {
  it('handle null values and a positional option', () => {
    const options = {
      flag: {
        type: 'flag',
        names: [null, '-f'],
      },
      single: {
        type: 'single',
        positional: 'marker',
      },
    } as const satisfies Options;
    expect(getOptionNames(options.flag)).toEqual(['-f']);
    expect(getOptionNames(options.single)).toEqual(['marker']);
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
        paramCount: -1,
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

describe('numberInRange', () => {
  it('ignore an error thrown during completion', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        parse: numberInRange([1, Infinity], '#0 #1 #2.'),
      },
    } as const satisfies Options;
    expect(parse(options, 'cmd -s 0 ', { compIndex: 9 })).rejects.toThrow(/^-s$/);
  });

  it('handle a single-valued option with a parsing callback that throws', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        parse: numberInRange([1, Infinity], '#0 #1 #2.'),
      },
    } as const satisfies Options;
    expect(parse(options, ['-s', '123'])).resolves.toEqual({ single: 123 });
    expect(parse(options, ['-s', '0'])).rejects.toThrow(`-s '0' [1, Infinity]`);
    expect(parse(options, ['-s', 'a'])).rejects.toThrow(`-s 'a' [1, Infinity]`);
  });

  it('handle an array-valued option with a parsing callback that throws', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        parse: numberInRange([1, Infinity], '#0 #1 #2.'),
      },
    } as const satisfies Options;
    expect(parse(options, ['-a', '123'])).resolves.toEqual({ array: [123] });
    expect(parse(options, ['-a', '0'])).rejects.toThrow(`-a '0' [1, Infinity]`);
    expect(parse(options, ['-a', 'a'])).rejects.toThrow(`-a 'a' [1, Infinity]`);
  });
});

describe('getVersion', () => {
  it('throw an error when the module cannot be found', () => {
    const url = import.meta.resolve('./data/absent.json');
    expect(getVersion(url)).rejects.toThrow(/^Cannot find module/);
  });

  it('throw an error when the module is a JavaScript module', () => {
    const url = import.meta.resolve('./data/with-version');
    expect(getVersion(url)).rejects.toThrow(/^JSON Parse error/);
  });

  it('throw an error when the module is not valid JSON', () => {
    const url = import.meta.resolve('./data/invalid.jsonc');
    expect(getVersion(url)).rejects.toThrow(/^JSON Parse error/);
  });

  it('return undefined when the module does not contain a version field', () => {
    const url = import.meta.resolve('./data/empty.json');
    expect(getVersion(url)).resolves.toBeUndefined();
  });

  it('return the version from a valid JSON module', () => {
    const url = import.meta.resolve('./data/with-version.json');
    expect(getVersion(url)).resolves.toEqual('0.0.0');
  });
});

describe('sectionFooter', () => {
  describe('when a repository URL cannot be found in the package.json file', () => {
    it('throw an error when the file cannot be found', () => {
      const url = import.meta.resolve('./data/absent.json');
      expect(sectionFooter(url)).rejects.toThrow(/^Cannot find module/);
    });

    it('throw an error when the file is not valid JSON', () => {
      const url = import.meta.resolve('./data/invalid.jsonc');
      expect(sectionFooter(url)).rejects.toThrow(/^JSON Parse error/);
    });

    it('return undefined when the file does not contain a repository field', () => {
      const url = import.meta.resolve('./data/empty.json');
      expect(sectionFooter(url)).resolves.toBeUndefined();
    });
  });

  describe('when a repository URL is found in the package.json file', () => {
    it('return a text when the file contains a repository field with a URL string', async () => {
      const url = import.meta.resolve('./data/with-repository.json');
      const msg = new AnsiMessage((await sectionFooter(url)) ?? new AnsiString());
      expect(msg.wrap(0, true, true)).toEqual(
        '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
      );
    });

    it('return a text with a suffix when the file contains a repository field', async () => {
      const url = import.meta.resolve('./data/with-repository.json');
      const msg = new AnsiMessage((await sectionFooter(url, '#0', '/issues')) ?? new AnsiString());
      expect(msg.wrap(0, true, true)).toEqual(
        '\x1b[36m' + 'https://github.com/dsogari/tsargp/issues' + '\x1b[39m',
      );
    });

    it('return a text when the file contains a repository field with a url field', async () => {
      const url = import.meta.resolve('./data/with-repository-url.json');
      const msg = new AnsiMessage((await sectionFooter(url)) ?? new AnsiString());
      expect(msg.wrap(0, true, true)).toEqual(
        '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
      );
    });

    it('return a text when the file contains a repository field with a GitHub host', async () => {
      const url = import.meta.resolve('./data/with-repository-github.json');
      const msg = new AnsiMessage((await sectionFooter(url)) ?? new AnsiString());
      expect(msg.wrap(0, true, true)).toEqual(
        '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
      );
    });

    it('return a text when the file contains a repository field with a default host', async () => {
      const url = import.meta.resolve('./data/with-repository-default.json');
      const msg = new AnsiMessage((await sectionFooter(url)) ?? new AnsiString());
      expect(msg.wrap(0, true, true)).toEqual(
        '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
      );
    });
  });
});
