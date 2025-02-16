//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * A helper type to enumerate numbers.
 * @template N The last enumerated number
 * @template A The helper array
 */
export type Enumerate<N extends number, A extends Array<number> = []> = A['length'] extends N
  ? A[number]
  : Enumerate<N, [...A, A['length']]>;

/**
 * A helper type to add optionality to types and their properties.
 * @template T The source type
 * @template N The maximum recursion depth
 * @template A The helper array
 */
export type PartialWithDepth<
  T,
  N extends number = 1,
  A extends Array<number> = [],
> = A['length'] extends N ? Partial<T> : { [K in keyof T]?: PartialWithDepth<T[K], N, [...A, 1]> };

/**
 * A helper type to alias another type while eliding type resolution in IntelliSense.
 * @template T The type to be aliased
 */
export type Alias<T> = T extends T ? T : T;

/**
 * A helper type to resolve types in IntelliSense.
 * @template T The type to be resolved
 */
export type Resolve<T> = T & unknown;

/**
 * A helper type to get a union of the values of all properties from a type.
 * @template T The source type
 */
export type ValuesOf<T> = T[keyof T];

/**
 * A helper type to get a union of a type with its promise.
 * @template T The source type
 */
export type Promissory<T> = T | Promise<T>;

/**
 * A generic array of arguments to be used in rest parameters.
 */
export type Args = ReadonlyArray<unknown>;

/**
 * A naming rule to match a name.
 * @param name The original name
 * @param lower The lower-cased name
 * @param upper The upper-cased name
 * @returns True if the name was matched
 */
export type NamingRule = (name: string, lower: string, upper: string) => boolean;

/**
 * A set of naming rules.
 */
export type NamingRuleSet = Readonly<Record<string, NamingRule>>;

/**
 * A collection of naming rulesets.
 */
export type NamingRules = Readonly<Record<string, NamingRuleSet>>;

/**
 * The result of matching names against naming rules.
 * It includes the first match in each ruleset.
 * Please do not use {@link Record} here.
 */
export type NamingMatch<T extends NamingRules> = Resolve<{
  -readonly [key1 in keyof T]: {
    -readonly [key2 in keyof T[key1]]?: string;
  };
}>;

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * A collection of regular expressions.
 */
export const regex = {
  /**
   * A regular expression to split paragraphs.
   */
  para: /(?:[ \t]*\r?\n){2,}/,
  /**
   * A regular expression to split list items.
   */
  item: /^[ \t]*(-|\*|\d+\.) /m,
  /**
   * A regular expression to split words.
   */
  word: /\s+/,
  /**
   * A regular expression to match format specifiers.
   */
  spec: /(#\d+)/,
  /**
   * A regular expression to match SGR sequences.
   */
  // eslint-disable-next-line no-control-regex
  sgr: /(?:\x1b\[[\d;]+m)+/g,
  /**
   * A regular expression to match JavaScript identifiers.
   */
  id: /^[a-zA-Z_]\w*$/,
  /**
   * A regular expression to match punctuation characters.
   */
  punct: /\p{P}/gu,
  /**
   * A regular expression to match `RegExp` special characters.
   */
  regex: /[\\^$.*+?()[\]{}|]/g,
  /**
   * A regular expression to match invalid option names.
   */
  name: /[\s=]/,
  /**
   * A regular expression to match whitespace.
   */
  ws: /\s+/g,
} as const satisfies Record<string, RegExp>;

/**
 * A stateless version of {@link regex.regex}.
 */
const regexSymbol = RegExp(regex.regex.source);

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Gets a list of arguments from a raw command line.
 * @param line The command line, including the command name
 * @param compIndex The completion index, if any (should be non-negative)
 * @returns The list of arguments, up to the completion index
 */
export function getArgs(line: string, compIndex = NaN): Array<string> {
  /** @ignore */
  function append(char: string) {
    arg = (arg ?? '') + char;
  }
  const result: Array<string> = [];
  const rest = line.length - compIndex;
  line = rest < 0 ? line + ' ' : rest >= 0 ? line.slice(0, compIndex) : line.trimEnd();
  let arg: string | undefined;
  let quote = '';
  let escape = false;
  for (const char of line) {
    if (escape) {
      append(char);
      escape = false;
      continue;
    }
    switch (char) {
      case '\\':
        if (quote) {
          append(char);
        } else {
          escape = true;
        }
        break;
      case ' ':
        if (quote) {
          append(char);
        } else if (arg !== undefined) {
          result.push(arg);
          arg = undefined;
        }
        break;
      case `'`:
      case '"':
        if (quote === char) {
          quote = '';
        } else if (quote) {
          append(char);
        } else {
          quote = char;
          append(''); // handles empty quotes
        }
        break;
      default:
        append(char);
    }
  }
  result.push(arg ?? '');
  return result.slice(1); // remove the command name
}

/**
 * Reads data from a file, if available. Does not block to wait for new data.
 * @param file The file path, descriptor or URL
 * @returns The file data, if any
 */
export async function readFile(file: string | number | URL): Promise<string | undefined> {
  if (file || !process?.stdin?.isTTY) {
    try {
      const { readFileSync } = await import('fs');
      return readFileSync?.(file).toString();
    } catch (err) {
      const code = (err as ErrnoException).code ?? '';
      if (!['ENOENT', 'EAGAIN'].includes(code)) {
        throw err;
      }
    }
  }
}
/**
 * Compares two arbitrary values for deep equality.
 * @param actual The specified value
 * @param expected The required value
 * @returns True if the values are equal
 */
export function areEqual(actual: unknown, expected: unknown): boolean {
  if (actual === expected) {
    return true;
  }
  const type = typeof actual;
  if (type === typeof expected && type !== 'function') {
    const array1 = isArray(actual);
    const array2 = isArray(expected);
    if (array1 && array2) {
      return (
        actual.length === expected.length && !actual.find((val, i) => !areEqual(val, expected[i]))
      );
    }
    if (!array1 && !array2 && actual && expected && type === 'object') {
      const keys1 = getKeys(actual);
      const keys2 = getKeys(expected);
      return (
        keys1.length === keys2.length &&
        !keys1.find(
          (key) =>
            !areEqual(
              (actual as Record<string, unknown>)[key],
              (expected as Record<string, unknown>)[key],
            ),
        )
      );
    }
  }
  return false;
}

/**
 * The longest strings that are substrings of both strings.
 * @param S The source string
 * @param T The target string
 * @returns The length of the largest substrings and their indices in both strings
 * @see https://www.wikiwand.com/en/Longest_common_substring
 */
function longestCommonSubstrings(S: string, T: string): [number, Array<[number, number]>] {
  const dp = new Array<number>(T.length);
  const indices: Array<[number, number]> = [];
  let z = 0;
  for (let i = 0, last = 0; i < S.length; ++i) {
    for (let j = 0; j < T.length; ++j) {
      if (S[i] === T[j]) {
        const a = i === 0 || j === 0 ? 1 : last + 1;
        if (a >= z) {
          if (a > z) {
            z = a;
            indices.length = 0;
          }
          indices.push([i - z + 1, j - z + 1]);
        }
        last = dp[j];
        dp[j] = a;
      } else {
        last = dp[j];
        dp[j] = 0;
      }
    }
  }
  return [z, indices];
}

/**
 * Gets the maximum number of matching characters of two strings, which are defined as some longest
 * common substring plus (recursively) the matching characters on both sides of it.
 * @param S The source string
 * @param T The target string
 * @returns The number of matching characters
 */
function matchingCharacters(S: string, T: string): number {
  const [z, indices] = longestCommonSubstrings(S, T);
  return indices.reduce((acc, [i, j]) => {
    const l = matchingCharacters(S.slice(0, i), T.slice(0, j));
    const r = matchingCharacters(S.slice(i + z), T.slice(j + z));
    return max(acc, z + l + r);
  }, 0);
}

/**
 * Gets the similarity of two strings based on the Gestalt algorithm.
 * @param S The source string
 * @param T The target string
 * @returns The similarity between the two strings
 * @see https://www.wikiwand.com/en/Gestalt_pattern_matching
 */
export function gestaltSimilarity(S: string, T: string): number {
  return (2 * matchingCharacters(S, T)) / (S.length + T.length);
}

/**
 * Gets a list of names that are similar to a given name.
 * @param needle The name to be searched
 * @param haystack The names to search amongst
 * @param threshold The similarity threshold
 * @returns The list of similar names in decreasing order of similarity
 */
export function findSimilar(
  needle: string,
  haystack: Iterable<string>,
  threshold = 0,
): Array<string> {
  /** @ignore */
  function norm(name: string) {
    return name.replace(regex.punct, '').toLowerCase();
  }
  const result: Array<[string, number]> = [];
  const search = norm(needle);
  for (const name of haystack) {
    // skip the original name
    if (name !== needle) {
      const sim = gestaltSimilarity(search, norm(name));
      if (sim >= threshold) {
        result.push([name, sim]);
      }
    }
  }
  return result.sort(([, as], [, bs]) => bs - as).map(([str]) => str);
}

/**
 * Matches names against naming rules.
 * @param names The list of names
 * @param rulesets The sets of rules
 * @returns The matching result
 */
export function matchNamingRules<T extends NamingRules>(
  names: Iterable<string>,
  rulesets: T,
): NamingMatch<T> {
  const result: Record<string, Record<string, string>> = {};
  for (const key in rulesets) {
    result[key] = {};
  }
  for (const name of names) {
    const lower = name.toLowerCase();
    const upper = name.toUpperCase();
    for (const [setId, ruleset] of getEntries(rulesets)) {
      const matches = result[setId];
      for (const ruleId in ruleset) {
        if (!(ruleId in matches) && ruleset[ruleId](name, lower, upper)) {
          matches[ruleId] = name;
        }
      }
    }
  }
  return result as NamingMatch<T>;
}

/**
 * Gets an adjacency list from a set of requirements.
 * @param requires The map of option keys to required options
 * @returns The adjacency list
 */
export function getRequiredBy(
  requires: Readonly<Record<string, string>>,
): Record<string, Array<string>> {
  const result: Record<string, Array<string>> = {};
  for (const [key, required] of getEntries(requires)) {
    if (required in result) {
      result[required].push(key);
    } else {
      result[required] = [key];
    }
  }
  return result;
}

/**
 * Select a phrase alternative
 * @param phrase The phrase string
 * @param alt The alternative number
 * @returns The phrase alternatives
 */
export function selectAlternative(phrase: string, alt = 0): string {
  const groups: Array<[number, number]> = [];
  for (let i = 0, s = 0, level = 0, groupLevel = 0, startIndices = []; i < phrase.length; ++i) {
    const c = phrase[i];
    if (c === '(') {
      level = startIndices.push(i);
    } else if (level) {
      if (c === '|') {
        if (!groupLevel) {
          groupLevel = level;
        }
      } else if (c === ')') {
        s = startIndices.pop() ?? 0;
        if (groupLevel === level) {
          groups.push([s, i]);
          groupLevel = 0; // reset
        }
        level--;
      }
    }
  }
  if (groups.length) {
    const result = [];
    let j = 0;
    for (const group of groups) {
      const [s, e] = group;
      result.push(phrase.slice(j, s), phrase.slice(s + 1, e).split('|')[alt]);
      j = e + 1;
    }
    result.push(phrase.slice(j));
    return result.join('');
  }
  return phrase;
}

/**
 * Merges the first-level properties of a source object with those of a template object.
 * @param template The template object
 * @param source The source object
 * @returns The result object
 */
export function mergeValues<T extends Record<string, unknown>>(
  template: T,
  source: PartialWithDepth<T>,
): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of getEntries(template)) {
    result[key] =
      Array.isArray(val) || typeof val !== 'object'
        ? (source[key] ?? val)
        : { ...val, ...(source[key] as object) };
  }
  return result as T;
}

/**
 * Finds a value that matches a predicate in an object.
 * @param rec The record-like object to search in
 * @param pred The predicate function
 * @returns The first value matching the predicate
 */
export function findValue<T>(rec: Record<string, T>, pred: (val: T) => boolean): T | undefined {
  for (const val of Object.values(rec)) {
    if (pred(val)) {
      return val;
    }
  }
}

/**
 * Gets the maximum of two numbers.
 * @param a The first operand
 * @param b The second operand
 * @returns The maximum of the two
 */
export function max(a: number, b: number): number {
  return a > b ? a : b;
}

/**
 * Gets the value of an environment variable.
 * @param name The variable name
 * @returns The variable value, if it exists; else undefined
 */
export function getEnv(name: string): string | undefined {
  return process?.env[name];
}

/**
 * Gets a symbol for a string.
 * @param key The string key
 * @returns The symbol
 */
export function getSymbol(key: string): symbol {
  return Symbol.for(key);
}

/**
 * Gets a list of keys from an object.
 * @param rec The record-like object
 * @returns The list of object keys
 */
export function getKeys(rec: object): Array<string> {
  return Object.keys(rec);
}

/**
 * Gets a list of values from an object.
 * @param rec The record-like object
 * @returns The list of object values
 */
export function getValues<T>(rec: Readonly<Record<string, T>>): Array<T> {
  return Object.values(rec);
}

/**
 * Gets a list of entries from an object.
 * @param rec The record-like object
 * @returns The list of object entries
 */
export function getEntries<T>(rec: Readonly<Record<string, T>>): Array<[string, T]> {
  return Object.entries(rec);
}

/**
 * Checks if a value is an array.
 * @param value The value
 * @returns True if the value is an array
 */
export function isArray<T = unknown>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

/**
 * Checks if a value is an array.
 * @param value The value
 * @returns True if the value is an array
 */
export function isReadonlyArray<T = unknown>(value: unknown): value is ReadonlyArray<T> {
  return Array.isArray(value);
}

/**
 * Escapes the `RegExp` special characters.
 * @param str The string to be escaped
 * @returns The escaped string
 * @see https://docs-lodash.com/v4/escape-reg-exp/
 */
export function escapeRegExp(str: string): string {
  return str && regexSymbol.test(str) ? str.replace(regex.regex, '\\$&') : str;
}

/**
 * Gets the terminal width of a process stream.
 * @param stream The name of the stream
 * @returns The terminal width (in number of columns)
 */
export function streamWidth(stream: 'stdout' | 'stderr'): number | undefined {
  const forceWidth = getEnv('FORCE_WIDTH');
  return forceWidth ? Number(forceWidth) : process?.[stream]?.columns;
}

/**
 * @param width The terminal width (in number of columns)
 * @returns True if styles should be omitted from terminal strings
 * @see https://clig.dev/#output
 */
export function omitStyles(width: number): boolean {
  return !getEnv('FORCE_COLOR') && (!width || !!getEnv('NO_COLOR') || getEnv('TERM') === 'dumb');
}

/**
 * @returns The default value of the command line
 */
export function getCmdLine(): string | Array<string> {
  return getEnv('COMP_LINE') ?? getEnv('BUFFER') ?? process?.argv.slice(2) ?? [];
}

/**
 * @returns The default value of the completion index
 */
export function getCompIndex(): number | undefined {
  return Number(getEnv('COMP_POINT') ?? getEnv('CURSOR')) || getEnv('BUFFER')?.length;
}
