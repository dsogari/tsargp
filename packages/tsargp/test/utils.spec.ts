import { afterEach, describe, expect, it, jest } from 'bun:test';
import type { Options } from '../src/library';
import { AnsiMessage, AnsiString, parse } from '../src/library';
import {
  allOf,
  not,
  oneOf,
  valuesFor,
  getOptionNames,
  getParamCount,
  isMessage,
  isNiladic,
  OptionRegistry,
  visitRequirements,
  getVersion,
  numberInRange,
  sectionFooter,
  gestaltSimilarity,
  findSimilar,
  mergeValues,
  findValue,
  areEqual,
  readFile,
  getArgs,
  selectAlternative,
  matchNamingRules,
  stronglyConnected,
  makeUnique,
  createUsage,
  setUnion,
  setDifference,
  setIntersection,
} from '../src/library/utils';

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

describe('gestaltSimilarity', () => {
  it('return NaN on empty strings', () => {
    expect(gestaltSimilarity('', '')).toBeNaN();
  });

  it('return a percentage of the number of different characters', () => {
    // cSpell:disable
    expect(gestaltSimilarity('aaaaa', 'aaaaa')).toEqual(1);
    expect(gestaltSimilarity('aaaaa', 'baaaa')).toEqual(0.8);
    expect(gestaltSimilarity('aaaaa', 'bbaaa')).toEqual(0.6);
    expect(gestaltSimilarity('aaaaa', 'bbbaa')).toEqual(0.4);
    expect(gestaltSimilarity('aaaaa', 'bbbba')).toEqual(0.2);
    expect(gestaltSimilarity('aaaaa', 'bbbbb')).toEqual(0);
    // cSpell:enable
  });

  it('return less similarity when characters are swapped', () => {
    // cSpell:disable
    expect(gestaltSimilarity('flag', 'galf')).toBeCloseTo(0.25, 2);
    expect(gestaltSimilarity('flag', 'glaf')).toBeCloseTo(0.5, 2);
    expect(gestaltSimilarity('flag', 'fgxx')).toBeCloseTo(0.5, 2);
    expect(gestaltSimilarity('flag', 'gfxx')).toBeCloseTo(0.25, 2);
    // cSpell:enable
  });
});

describe('findSimilar', () => {
  it('handle empty names', () => {
    expect(findSimilar('', ['abc'])).toHaveLength(1);
    expect(findSimilar('abc', [])).toHaveLength(0);
  });

  it('return names in decreasing order of similarity ', () => {
    const haystack = ['a', 'ab', 'abc', 'abcd'];
    expect(findSimilar('abc', haystack)).toEqual(['abcd', 'ab', 'a']);
  });

  it('filter names by similarity threshold', () => {
    const haystack = ['a', 'ab', 'abc', 'abcd'];
    expect(findSimilar('abc', haystack, 0.6)).toEqual(['abcd', 'ab']);
  });

  it('avoid including transitively similar names', () => {
    const haystack = ['a', 'ab', 'abc', 'abcd', 'abcde'];
    // the following does not include 'abc', even though it is similar to 'ab'
    expect(findSimilar('a', haystack, 0.6)).toEqual(['ab']);
    expect(findSimilar('ab', haystack, 0.6)).toEqual(['abc', 'a', 'abcd']);
  });
});

describe('matchNamingRules', () => {
  it('match the first name against each rule in a ruleset', () => {
    const rules = {
      ruleset: {
        rule1: jest.fn((name) => name.startsWith('Match')),
        rule2: jest.fn(() => false),
      },
    } as const;
    const match = matchNamingRules(['Match1', 'Non-match', 'Match2'], rules);
    expect(match).toEqual({ ruleset: { rule1: 'Match1' } });
    expect(rules.ruleset.rule1).toHaveBeenCalledWith('Match1', 'match1', 'MATCH1');
    expect(rules.ruleset.rule1).not.toHaveBeenCalledWith(
      'Non-match',
      expect.anything(),
      expect.anything(),
    );
    expect(rules.ruleset.rule1).not.toHaveBeenCalledWith(
      'Match2',
      expect.anything(),
      expect.anything(),
    );
    expect(rules.ruleset.rule1).toHaveBeenCalledTimes(1);
    expect(rules.ruleset.rule2).toHaveBeenCalledTimes(3);
  });
});

describe('mergeValues', () => {
  it('merge source properties with the template object', () => {
    expect(mergeValues({ a: { b: 2, c: 3 } }, { a: { c: 2 } })).toEqual({ a: { b: 2, c: 2 } });
  });

  it('replace array values from the template object', () => {
    expect(mergeValues({ a: [1] }, { a: [2] })).toEqual({ a: [2] });
  });
});

describe('findValue', () => {
  it('return undefined on no match', () => {
    expect(findValue({}, () => true)).toBeUndefined();
    expect(findValue({ a: 1, b: 'a' }, () => false)).toBeUndefined();
  });

  it('return the first match', () => {
    expect(findValue({ a: 1, b: 'a' }, () => true)).toEqual(1);
    expect(findValue({ a: 1, b: 'a' }, (val) => val === 'a')).toEqual('a');
  });
});

describe('getArgs', () => {
  describe('no completion index is provided', () => {
    it('return empty array on zero arguments', () => {
      expect(getArgs('')).toEqual([]);
      expect(getArgs('cmd')).toEqual([]);
    });

    it('ignore leading and trailing whitespace', () => {
      expect(getArgs(' cmd ')).toEqual([]);
      expect(getArgs(' cmd  type  script ')).toEqual(['type', 'script']);
    });

    it('handle quoted arguments', () => {
      expect(getArgs(`cmd "" ''`)).toEqual(['', '']);
      expect(getArgs(`cmd " " ' '`)).toEqual([' ', ' ']);
      expect(getArgs(`cmd "'" '"'`)).toEqual([`'`, '"']);
      expect(getArgs(`cmd "type script" 'is fun'`)).toEqual(['type script', 'is fun']);
      expect(getArgs(`cmd type" "script' 'is fun`)).toEqual(['type script is', 'fun']);
      expect(getArgs(`cmd "'type' script" 'is "fun"'`)).toEqual([`'type' script`, 'is "fun"']);
    });

    it('handle escaped characters', () => {
      expect(getArgs(`cmd type\\ script`)).toEqual(['type script']);
      expect(getArgs(`cmd type\\\\script`)).toEqual(['type\\script']);
      expect(getArgs(`cmd "type\\ script"`)).toEqual(['type\\ script']);
      expect(getArgs(`cmd 'type\\ script'`)).toEqual(['type\\ script']);
    });
  });

  describe('a completion index is provided', () => {
    it('handle completion attempt of an empty argument', () => {
      expect(getArgs('cmd ', 4)).toEqual(['']);
    });

    it('handle completion attempt of a non-empty argument', () => {
      expect(getArgs('cmd type', 4)).toEqual(['']);
      expect(getArgs('cmd type', 6)).toEqual(['ty']);
      expect(getArgs('cmd "type script"', 10)).toEqual(['type ']);
    });

    it('handle completion attempt beyond the end of the line', () => {
      expect(getArgs('cmd', 4)).toEqual(['']);
      expect(getArgs('cmd ""', 7)).toEqual(['', '']);
      expect(getArgs('cmd type', 9)).toEqual(['type', '']);
    });
  });
});

describe('areEqual', () => {
  describe('comparing primitive values', () => {
    it('return true on both values equal', () => {
      expect(areEqual(true, true)).toBeTruthy();
      expect(areEqual('abc', 'abc')).toBeTruthy();
      expect(areEqual(123, 123)).toBeTruthy();
    });

    it('return false on values different', () => {
      expect(areEqual(true, false)).toBeFalsy();
      expect(areEqual(false, true)).toBeFalsy();
      expect(areEqual('abc', 'def')).toBeFalsy();
      expect(areEqual(123, 456)).toBeFalsy();
    });
  });

  describe('comparing arrays', () => {
    it('return true on both arrays equal', () => {
      expect(areEqual([], [])).toBeTruthy();
      expect(areEqual([1, 2, 3], [1, 2, 3])).toBeTruthy();
    });

    it('return false on arrays with different lengths', () => {
      expect(areEqual([1, 2], [1, 2, 3])).toBeFalsy();
    });

    it('return false on arrays with values in different order', () => {
      expect(areEqual([1, 2, 3], [3, 2, 1])).toBeFalsy();
    });

    it('return false on arrays with different values', () => {
      expect(areEqual([1, 2], [1])).toBeFalsy();
      expect(areEqual([1], [1, 3])).toBeFalsy();
    });
  });

  describe('comparing objects', () => {
    it('return true on both objects equal', () => {
      expect(areEqual(null, null)).toBeTruthy();
      expect(areEqual({}, {})).toBeTruthy();
      expect(areEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBeTruthy();
    });

    it('return false on objects with different keys', () => {
      expect(areEqual({ a: 1 }, {})).toBeFalsy();
      expect(areEqual({ a: 1 }, { b: 1 })).toBeFalsy();
    });

    it('return false on objects with different values', () => {
      expect(areEqual({ a: 1 }, { a: 2 })).toBeFalsy();
    });

    it('return false on object vs null', () => {
      expect(areEqual(null, {})).toBeFalsy();
      expect(areEqual({}, null)).toBeFalsy();
    });
  });

  describe('comparing other types of values', () => {
    it('return true on same reference', () => {
      expect(areEqual(expect, expect)).toBeTruthy();
    });

    it('return false on different functions', () => {
      expect(
        areEqual(
          () => {},
          () => {},
        ),
      ).toBeFalsy();
    });

    it('return true on deeply equal complex values', () => {
      expect(areEqual([1, { a: ['b', 2] }], [1, { a: ['b', 2] }])).toBeTruthy();
      expect(areEqual({ a: ['b', { c: 1 }] }, { a: ['b', { c: 1 }] })).toBeTruthy();
    });
  });
});

describe('readFile', () => {
  it('throw an error when trying to read from invalid file descriptor', () => {
    expect(readFile(-1)).rejects.toThrow('out of range');
  });

  it.skip('block when trying to read from an interactive terminal', () => {
    process.stdin.isTTY = true;
    expect(readFile(0)).resolves.toBeUndefined();
  });

  it('return undefined when there is no data to read', () => {
    expect(readFile('')).resolves.toBeUndefined();
    expect(readFile('a')).resolves.toBeUndefined();
  });

  it('return data read from a local file', () => {
    const path = `${import.meta.dirname}/data/test-read-file.txt`;
    expect(readFile(path)).resolves.toMatch(/^test\r?\nread\r?\nfile$/);
  });
});

describe('selectAlternative', () => {
  it('handle an empty phrase', () => {
    expect(selectAlternative('')).toEqual('');
  });

  it('handle a phrase with no groups', () => {
    expect(selectAlternative('type|script (is fun)')).toEqual('type|script (is fun)');
  });

  it('handle a phrase with unmatched parentheses', () => {
    expect(selectAlternative('type (script')).toEqual('type (script');
    expect(selectAlternative('type )script')).toEqual('type )script');
  });

  it('handle a phrase with empty groups', () => {
    expect(selectAlternative('type (|) script', 0)).toEqual('type  script');
    expect(selectAlternative('type (|) script', 1)).toEqual('type  script');
  });

  it('handle a phrase with non-empty groups', () => {
    expect(selectAlternative('(type|script) is fun', 0)).toEqual('type is fun');
    expect(selectAlternative('(type|script) is fun', 1)).toEqual('script is fun');
  });

  it('handle a phrase with parentheses inside groups', () => {
    expect(selectAlternative('((type)|(script)) is fun', 0)).toEqual('(type) is fun');
    expect(selectAlternative('((type)|(script)) is fun', 1)).toEqual('(script) is fun');
  });

  it('handle a phrase with multiple groups', () => {
    expect(selectAlternative('(type|script) (is|fun)', 0)).toEqual('type is');
    expect(selectAlternative('(type|script) (is|fun)', 1)).toEqual('script fun');
  });

  it('handle a phrase with parentheses after a group', () => {
    expect(selectAlternative('(type|script) (is fun)', 0)).toEqual('type (is fun)');
    expect(selectAlternative('(type|script) (is fun)', 1)).toEqual('script (is fun)');
  });
});

describe('makeUnique', () => {
  it('remove duplicates while preserving order', () => {
    expect(makeUnique([2, 3, 2, 1, 3, 1])).toEqual([2, 3, 1]);
  });
});

describe('setUnion', () => {
  it('add elements while preserving order', () => {
    const set = setUnion(new Set([2, 3]), new Set([1, 3]));
    expect([...set]).toEqual([2, 3, 1]);
  });
});

describe('setDifference', () => {
  it('remove elements while preserving order', () => {
    const set = setDifference(new Set([2, 3, 4]), new Set([1, 3]));
    expect([...set]).toEqual([2, 4]);
  });
});

describe('setIntersection', () => {
  it('keep elements while preserving order', () => {
    const set = setIntersection(new Set([2, 3, 1]), new Set([1, 3]));
    expect([...set]).toEqual([3, 1]);
  });
});

describe('stronglyConnected and createUsage', () => {
  it('create a usage statement for mutually dependent options', () => {
    const dependencies = {
      a: ['b', 'c'],
      b: ['a', 'c', 'd'], // test duplicate removal
      c: ['d', 'e'],
      d: ['c'],
      x: ['y', 'c'],
      y: ['x', 'z'],
    };
    const [byKey, byComp, compAdj] = stronglyConnected(dependencies);
    expect(byKey).toEqual({ a: 'a', b: 'a', c: 'c', d: 'c', e: 'e', x: 'x', y: 'x', z: 'z' });
    expect(byComp).toEqual({ a: ['a', 'b'], c: ['c', 'd'], e: ['e'], x: ['x', 'y'], z: ['z'] });
    expect(compAdj).toEqual({ a: ['c'], c: ['e'], e: [], x: ['c', 'z'], z: [] });
    const usage = createUsage(compAdj);
    expect(usage).toEqual([['e', ['c', ['a']], ['c', 'z', ['x']]], ['z']]);
  });

  it('create a usage statement for transitively dependent options', () => {
    const dependencies = {
      a: ['d', 'e', 'k'], // test direct dependency together with transitive
      b: ['f', 'j'],
      c: ['g', 'k'],
      d: ['g', 'h'],
      e: ['i', 'j'],
      f: ['i', 'j'],
      g: ['k'],
    };
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
    const [byKey, byComp, compAdj] = stronglyConnected(dependencies);
    expect(byKey).toEqual(Object.assign({}, ...keys.map((key) => ({ [key]: key }))));
    expect(byComp).toEqual(Object.assign({}, ...keys.map((key) => ({ [key]: [key] }))));
    expect(compAdj).toEqual({
      a: ['d', 'e', 'k'],
      b: ['f', 'j'],
      c: ['g', 'k'],
      d: ['g', 'h'],
      e: ['i', 'j'],
      f: ['i', 'j'],
      g: ['k'],
      h: [],
      i: [],
      j: [],
      k: [],
    });
    const usage = createUsage(compAdj);
    expect(usage).toEqual([
      ['k', ['g', ['c']], ['g', 'h', ['d']], ['g', 'h', 'i', 'j', ['d', 'e', ['a']]]],
      ['h'],
      ['i'],
      ['j'],
      ['i', 'j', ['e'], ['f', ['b']]],
    ]);
  });
});
