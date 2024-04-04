//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { URL as _URL } from 'url';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * A collection of global variables to configure the behavior of the library.
 * @internal
 */
export const overrides: {
  /**
   * Overrides the terminal width of the standard output stream.
   */
  stdoutCols?: number;
  /**
   * Overrides the terminal width of the standard error stream.
   */
  stderrCols?: number;
} = {};

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
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
 * A helper type to enumerate numbers.
 * @template N The last enumerated number
 * @template A The type of the helper array
 */
export type Enumerate<N extends number, A extends Array<number> = []> = A['length'] extends N
  ? A[number]
  : Enumerate<N, [...A, A['length']]>;

/**
 * A helper type to remove optionality from types and properties.
 * @template T The source type
 * @template N The maximum recursion depth
 * @template A The type of the helper array
 */
export type Concrete<T, N extends number = 1, A extends Array<number> = []> = A['length'] extends N
  ? { [K in keyof T]-?: T[K] }
  : { [K in keyof T]-?: Concrete<T[K], N, [...A, 1]> };

/**
 * A helper type to get the keys of a type depending on a value constraint.
 * @template T The source type
 * @template V The value type
 */
export type KeyHaving<T, V> = keyof { [K in keyof T as T[K] extends V ? K : never]: never };

/**
 * A helper type to get a union of the values of all properties from a type.
 * @template T The source type
 */
export type ValuesOf<T> = T[keyof T];

/**
 * For some reason the global definition of `URL` has issues with static methods.
 */
export interface URL extends _URL {}

/**
 * A naming rule to match a name.
 * @param name The original name
 * @param lower The lower-cased name
 * @param upper The upper-cased name
 * @returns True if the name was matched
 * @internal
 */
export type NamingRule = (name: string, lower: string, upper: string) => boolean;

/**
 * A set of naming rules.
 * @internal
 */
export type NamingRuleSet = Readonly<Record<string, NamingRule>>;

/**
 * A collection of naming rule sets.
 * @internal
 */
export type NamingRules = Readonly<Record<string, NamingRuleSet>>;

/**
 * The result of matching names against naming rules.
 * It includes the first match in each rule set.
 * Please do not use {@link Record} here.
 * @internal
 */
export type NamingMatch<T extends NamingRules> = Resolve<{
  -readonly [key1 in keyof T]: {
    -readonly [key2 in keyof T[key1]]: string;
  };
}>;

/**
 * A (closed) numeric range.
 *
 * In a valid range, the minimum should be strictly less than the maximum.
 */
export type Range = [min: number, max: number];

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Gets a list of command arguments from a raw command line.
 * @param line The command line
 * @param compIndex The completion index, if any
 * @returns The list of arguments
 * @internal
 */
export function getArgs(line: string, compIndex = NaN): Array<string> {
  /** @ignore */
  function append(char: string) {
    if (arg === undefined) {
      arg = char;
    } else {
      arg += char;
    }
  }
  const result = new Array<string>();
  let arg: string | undefined;
  for (let i = 0, quote = ''; i < line.length; ++i) {
    if (i == compIndex) {
      append('\0');
    }
    switch (line[i]) {
      case '\n':
      case ' ':
        if (quote) {
          append(line[i]);
        } else if (arg !== undefined) {
          result.push(arg);
          arg = undefined;
        }
        break;
      case `'`:
      case '"':
        if (quote == line[i]) {
          quote = '';
        } else if (quote) {
          append(line[i]);
        } else {
          quote = line[i];
        }
        break;
      default:
        append(line[i]);
    }
  }
  if (line.length == compIndex) {
    append('\0');
  }
  if (arg !== undefined) {
    result.push(arg);
  }
  return result;
}

/**
 * Compares two arrays for equality.
 * @template T The type of the array element
 * @param actual The specified value
 * @param expected The required value
 * @param unique True if array elements should be considered in any order, ignoring duplicates
 * @returns True if the arrays are equal
 * @internal
 */
export function checkArrayEqual<T>(
  actual: ReadonlyArray<T>,
  expected: ReadonlyArray<T>,
  unique = false,
): boolean {
  if (unique) {
    const set = new Set(expected);
    for (const val of actual) {
      if (!set.delete(val)) {
        return false;
      }
    }
    if (set.size > 0) {
      return false;
    }
  } else if (actual.length !== expected.length) {
    return false;
  } else {
    for (let i = 0; i < actual.length; ++i) {
      if (actual[i] !== expected[i]) {
        return false;
      }
    }
  }
  return true;
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
  const indices = new Array<[number, number]>();
  let z = 0;
  for (let i = 0, last = 0; i < S.length; ++i) {
    for (let j = 0; j < T.length; ++j) {
      if (S[i] == T[j]) {
        const a = i == 0 || j == 0 ? 1 : last + 1;
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
 * @internal
 */
export function gestaltSimilarity(S: string, T: string): number {
  return (2 * matchingCharacters(S, T)) / (S.length + T.length);
}

/**
 * Gets a list of names that are similar to a given name.
 * @param name The name to be searched
 * @param names The names to be searched in
 * @param threshold The similarity threshold
 * @returns The list of similar names in decreasing order of similarity
 */
export function findSimilarNames(name: string, names: Array<string>, threshold = 0): Array<string> {
  /** @ignore */
  function norm(name: string) {
    return name.replace(/\p{P}/gu, '').toLowerCase();
  }
  const searchName = norm(name);
  return names
    .reduce((acc, name2) => {
      // skip the original name
      if (name2 != name) {
        const sim = gestaltSimilarity(searchName, norm(name2));
        if (sim >= threshold) {
          acc.push([name2, sim]);
        }
      }
      return acc;
    }, new Array<[string, number]>())
    .sort(([, as], [, bs]) => bs - as)
    .map(([str]) => str);
}

/**
 * Select a phrase alternative
 * @param phrase The phrase string
 * @param alt The alternative number
 * @returns The phrase alternatives
 * @internal
 */
export function selectAlternative(phrase: string, alt = 0): string {
  const groups = new Array<[number, number]>();
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
        if (groupLevel == level) {
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
    for (let i = 0; i < groups.length; ++i) {
      const [s, e] = groups[i];
      result.push(phrase.slice(j, s), phrase.slice(s + 1, e).split('|')[alt]);
      j = e + 1;
    }
    result.push(phrase.slice(j));
    return result.join('');
  }
  return phrase;
}

/**
 * Converts a string to boolean.
 * @param str The string value
 * @param flags The conversion flags
 * @param flags.truthNames The names of the truth value
 * @param flags.falsityNames The names of the falsity value
 * @param flags.caseSensitive Whether names are case-sensitive
 * @returns True if the string evaluates to true; undefined if it cannot be converted
 * @internal
 */
export function isTrue(
  str: string,
  flags: {
    truthNames?: ReadonlyArray<string>;
    falsityNames?: ReadonlyArray<string>;
    caseSensitive?: boolean;
  } = {},
): boolean | undefined {
  /** @ignore */
  function match(names: ReadonlyArray<string>): boolean {
    return !!str.match(RegExp(`^${names.join('|')}$`, regexFlags));
  }
  str = str.trim();
  const { truthNames, falsityNames, caseSensitive } = flags;
  const regexFlags = caseSensitive ? '' : 'i';
  const truth = truthNames?.length;
  if (truth && match(truthNames)) {
    return true;
  }
  const falsity = falsityNames?.length;
  if (falsity && match(falsityNames)) {
    return false;
  }
  // consider NaN true
  return truth ? (falsity ? undefined : false) : falsity ? true : !(Number(str) === 0);
}

/**
 * Match names against naming rules.
 * @param names The list of names
 * @param rules The sets of rules
 * @returns The matching result
 * @internal
 */
export function matchNamingRules<T extends NamingRules>(
  names: Array<string>,
  rules: T,
): NamingMatch<T> {
  const result: Record<string, Record<string, string>> = {};
  for (const key in rules) {
    result[key] = {};
  }
  for (const name of names) {
    const lower = name.toLowerCase();
    const upper = name.toUpperCase();
    for (const key1 in rules) {
      const rule = rules[key1];
      const res = result[key1];
      for (const key2 in rule) {
        if (!res[key2] && rule[key2](name, lower, upper)) {
          res[key2] = name;
        }
      }
    }
  }
  return result as NamingMatch<T>;
}

/**
 * Checks whether an argument is a word to be completed.
 * @param arg The command-line argument
 * @returns The word being completed; else undefined
 * @internal
 */
export function isComp(arg: string): string | undefined {
  const [a, b] = arg.split('\0', 2);
  return b !== undefined ? a : undefined;
}

/**
 * Gets the maximum of two numbers.
 * @param a The first operand
 * @param b The second operand
 * @returns The maximum of the two
 * @internal
 */
export function max(a: number, b: number): number {
  return a > b ? a : b;
}
