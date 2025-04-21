//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  MessageOptionType,
  NiladicOptionType,
  NumericRange,
  OpaqueOption,
  OpaqueOptions,
  OptionInfo,
  Options,
  OptionType,
  OptionValues,
  ParsingCallback,
  RequirementCallback,
  Requires,
  RequiresVal,
} from './options.js';
import type { FormattingFlags } from './styles.js';

import { ErrorItem } from './enums.js';
import { RequiresAll, RequiresNot, RequiresOne } from './options.js';
import { AnsiString, ErrorMessage } from './styles.js';

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
 * @template T The type of naming rulesets
 */
export type NamingMatch<T extends NamingRules> = Resolve<{
  -readonly [key1 in keyof T]: {
    -readonly [key2 in keyof T[key1]]?: string;
  }; // NOTE: do not use `Record` here
}>;

/**
 * A map of record keys to lists of record keys.
 */
export type RecordKeyMap = Record<string, Array<string>>;

/**
 * A forest structure representing a usage statement.
 */
export type UsageStatement = Array<string | UsageStatement>;

/**
 * A record of string keys and unknown values.
 */
export type UnknownRecord = Record<string, unknown>;

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
   * A regular expression to match whitespace.
   */
  space: /\s+/,
  /**
   * A regular expression to match placeholders.
   */
  spec: /(#\d+)/,
  /**
   * A regular expression to match SGR sequences.
   */
  sgr: /(?:\x1b\[[\d;]+m)+/g, // eslint-disable-line no-control-regex
  /**
   * A regular expression to match JavaScript identifiers.
   */
  id: /^[a-zA-Z_]\w*$/,
  /**
   * A regular expression to match punctuation characters.
   */
  punct: /\p{P}/gu,
  /**
   * A regular expression to match path separators.
   */
  pathSep: /[\\/]/,
  /**
   * A regular expression to match option-parameter separators.
   */
  valSep: /=(.*)/,
  /**
   * A regular expression to match kebab-case words.
   */
  kebab: /[^-]+-[^-]+/,
  /**
   * A regular expression to match snake_case words.
   */
  snake: /[^_]+_[^_]+/,
  /**
   * A regular expression to match colon:case words.
   */
  colon: /[^:]+:[^:]+/,
} as const satisfies Record<string, RegExp>;

/**
 * The import attributes for JSON modules.
 */
const jsonImportAttributes: ImportAttributes = { type: 'json' };

/**
 * The import options for JSON modules.
 */
const jsonImportOptions: ImportCallOptions = {
  with: jsonImportAttributes,
  assert: jsonImportAttributes,
};

const { min, max } = Math;
export { max, min }; // to avoid typing `Math` all the time and reduce footprint

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements a registry of option definitions.
 */
export class OptionRegistry {
  /**
   * A map of option names to option keys.
   */
  readonly names: Map<string, string> = new Map<string, string>();

  /**
   * A map of cluster letters to option keys.
   */
  readonly letters: Map<string, string> = new Map<string, string>();

  /**
   * Information regarding the positional options.
   */
  readonly positional: Array<OptionInfo> = [];

  /**
   * Creates an option registry based on a set of option definitions.
   * @param options The option definitions
   */
  constructor(readonly options: OpaqueOptions) {
    for (const [key, option] of getEntries(this.options)) {
      registerNames(this.names, this.letters, key, option);
      if (option.positional) {
        this.positional.push([key, option, option.preferredName!]);
      }
    }
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Registers an option's names.
 * @param nameToKey The map of option names to keys
 * @param letterToKey The map of cluster letters to key
 * @param key The option key
 * @param option The option definition
 */
function registerNames(
  nameToKey: Map<string, string>,
  letterToKey: Map<string, string>,
  key: string,
  option: OpaqueOption,
) {
  const names = getOptionNames(option);
  for (const name of names) {
    nameToKey.set(name, key);
  }
  if (!option.preferredName) {
    option.preferredName = names[0] ?? '';
  }
  for (const letter of option.cluster ?? '') {
    letterToKey.set(letter, key);
  }
}

/**
 * Gets a list of option names.
 * @param option The option definition
 * @returns The option names
 */
export function getOptionNames(option: OpaqueOption): Array<string> {
  return option.names?.slice().filter(isString) ?? [];
}

/**
 * Gets the last name of an option, if one exists.
 * @param option The option definition
 * @returns The option name, if any
 */
export function getLastOptionName(option: OpaqueOption): string | undefined {
  return option.names?.findLast(isString);
}

/**
 * Checks whether an option has a template attribute.
 * @param option The option definition
 * @param isUsage Whether the template appears in a usage statement
 * @returns True if the option has a template attribute
 */
export function hasTemplate(option: OpaqueOption, isUsage: boolean): boolean {
  const { example, paramName, usageParamName } = option;
  return (example ?? paramName) !== undefined || (isUsage && usageParamName !== undefined);
}

/**
 * Checks whether an option has a name that can be supplied on the command line.
 * @param option The option definition
 * @returns True if the option has a name that can be supplied
 */
export function hasSuppliableName(option: OpaqueOption): boolean {
  return !!option.cluster || getLastOptionName(option) !== undefined;
}

/**
 * Checks whether an option can only be supplied through the environment.
 * Does not check whether the environment attributes are actually set.
 * @param option The option definition
 * @returns True if the option can only be supplied through the environment
 */
export function isEnvironmentOnly(option: OpaqueOption): boolean {
  return !hasSuppliableName(option) && !option.positional;
}

/**
 * Gets a list of environment variables for an option.
 * @param option The option definition
 * @returns The variable names
 */
export function getOptionEnvVars(option: OpaqueOption): Array<string> | undefined {
  return option.sources?.filter(isString);
}

/**
 * Tests if an option type is that of a message-valued option.
 * @param type The option type
 * @returns True if the option type is message
 */
export function isMessage(type: OptionType): type is MessageOptionType {
  return ['help', 'version'].includes(type);
}

/**
 * Tests if an option type is that of a niladic option.
 * @param type The option type
 * @returns True if the option type is niladic
 */
export function isNiladic(type: OptionType): type is NiladicOptionType {
  return isMessage(type) || ['command', 'flag'].includes(type);
}

/**
 * Tests if an option type is that of a command option.
 * @param type The option type
 * @returns True if the option type is command
 */
export function isCommand(type: OptionType): type is 'command' {
  return type === 'command';
}

/**
 * Gets the parameter count of an option as a numeric range.
 * @param option The option definition
 * @returns The count range
 */
export function getParamCount(option: OpaqueOption): NumericRange {
  if (isNiladic(option.type)) {
    return [0, 0];
  }
  const { type, paramCount } = option;
  return type === 'function'
    ? isObject(paramCount)
      ? paramCount
      : paramCount !== undefined && isFinite(paramCount)
        ? [paramCount, paramCount]
        : [0, Infinity]
    : type === 'array'
      ? [0, Infinity]
      : [1, 1];
}

/**
 * Visits an option's requirements, executing a callback according to the type of the requirement.
 * @template T The type of the callback result
 * @param requires The option requirements
 * @param keyFn The callback to process an option key
 * @param notFn The callback to process a "not" expression
 * @param allFn The callback to process an "all" expression
 * @param oneFn The callback to process a "one" expression
 * @param valFn The callback to process a requirement object
 * @param cbkFn The callback to process a requirement callback
 * @returns The result of the callback
 */
export function visitRequirements<T>(
  requires: Requires,
  keyFn: (req: string) => T,
  notFn: (req: RequiresNot) => T,
  allFn: (req: RequiresAll) => T,
  oneFn: (req: RequiresOne) => T,
  valFn: (req: RequiresVal) => T,
  cbkFn: (req: RequirementCallback) => T,
): T {
  return isString(requires)
    ? keyFn(requires)
    : requires instanceof RequiresNot
      ? notFn(requires)
      : requires instanceof RequiresAll
        ? allFn(requires)
        : requires instanceof RequiresOne
          ? oneFn(requires)
          : isFunction(requires)
            ? cbkFn(requires)
            : valFn(requires);
}

/**
 * Creates a {@link RequiresAll} expression.
 * @param items The requirement items
 * @returns The requirement expression
 */
export function allOf(...items: Array<Requires>): RequiresAll {
  return new RequiresAll(items);
}

/**
 * Creates a {@link RequiresOne} expression.
 * @param items The requirement items
 * @returns The requirement expression
 */
export function oneOf(...items: Array<Requires>): RequiresOne {
  return new RequiresOne(items);
}

/**
 * Creates a {@link RequiresNot} expression.
 * @param item The requirement item
 * @returns The requirement expression
 */
export function not(item: Requires): RequiresNot {
  return new RequiresNot(item);
}

/**
 * Creates an object to hold the option values.
 * @template T The type of the option definitions
 * @param _options The option definitions
 * @returns The option values
 */
export function valuesFor<T extends Options>(_options: T): OptionValues<T> {
  return {} as OptionValues<T>;
}

/**
 * Resolves the nested options of a subcommand.
 * @param option The option definition
 * @returns The nested options
 */
export async function getNestedOptions(option: OpaqueOption): Promise<OpaqueOptions> {
  // do not destructure `options`, because the callback might need to use `this`
  return isFunction(option.options) ? option.options() : (option.options ?? {});
}

/**
 * Gets the inline constraint of an option name.
 * @param option The option definition
 * @param name The option name
 * @returns The inline constraint
 */
export function checkInline(option: OpaqueOption, name: string): boolean | 'always' {
  const { inline } = option;
  return (isObject(inline) ? inline[name] : inline) ?? true; // allowed by default, but not required
}

/**
 * Creates an error message associated with an option.
 * @param itemOrPhrase The error item or phrase
 * @param name The option name (or key)
 * @param flags The formatting flags
 * @param args The message arguments
 * @returns The error message
 */
export function error(
  itemOrPhrase: ErrorItem | string,
  name: string,
  flags: FormattingFlags = {},
  ...args: Args
): ErrorMessage {
  return new ErrorMessage().add(itemOrPhrase, flags, getSymbol(name), ...args);
}

/**
 * Normalizes the value of an array-valued option and checks the validity of its element count.
 * @param option The option definition
 * @param name The option name (or key)
 * @param value The option value
 * @returns The normalized array
 * @throws On value not satisfying the limit constraint
 */
export function normalizeArray(option: OpaqueOption, name: string, value: unknown): Array<unknown> {
  if (!isArray(value)) {
    return [value]; // convert to a single-element tuple
  }
  const { unique, limit } = option;
  const result = unique ? makeUnique(value) : value.slice(); // the input may be read-only
  if (limit && limit > 0 && limit < result.length) {
    throw error(ErrorItem.limitConstraintViolation, name, {}, result.length, limit);
  }
  return result;
}

/**
 * Create a parsing callback for numbers that should be within a range.
 * @param range The numeric range
 * @param phrase The custom error phrase
 * @returns The parsing callback
 */
export function numberInRange(
  range: NumericRange,
  phrase: string,
): ParsingCallback<string, number> {
  const [min, max] = range;
  return function (param, info) {
    const num = Number(param);
    if (info.comp || (min <= num && num <= max)) {
      return num; // handle NaN; avoid throwing errors when completion is in effect
    }
    throw error(phrase, info.name, {}, param, range);
  };
}

/**
 * Gets a version text to be used with version options.
 * @param jsonModule The ID of the JSON module containing a version field
 * @returns The version, if the module was found; otherwise undefined
 */
export async function getVersion(jsonModule: string): Promise<string | undefined> {
  const json = await import(jsonModule, jsonImportOptions);
  return json?.version as string | undefined;
}

/**
 * Create a footer text to be used in help sections.
 * @param jsonModule The ID of the JSON module containing a repository URL field
 * @param phrase The custom phrase for the footer
 * @param suffix A suffix to append to the repository URL
 * @returns The footer ANSI string, if a package.json file was found; otherwise undefined
 */
export async function sectionFooter(
  jsonModule: string,
  phrase: string = '#0',
  suffix: string = '',
): Promise<AnsiString | undefined> {
  const json = await import(jsonModule, jsonImportOptions);
  if (json) {
    const { repository } = json as { repository?: string | { url?: string } };
    if (repository) {
      const repoUrl = typeof repository === 'string' ? repository : repository.url;
      if (repoUrl) {
        let url = repoUrl.replace(/(?:^git\+|\.git$)/g, '');
        if (!url.startsWith('https:')) {
          const [host, repo] = url.split(':');
          url = `https://${repo ? host : 'github'}.com/${repo ?? host}`;
        }
        return new AnsiString().format(phrase, {}, new URL(url + suffix));
      }
    }
  }
  return undefined;
}

/**
 * Handles an error caught in a try/catch block.
 * For use in non-browser environments only.
 * @param err The caught error
 */
export function handleError(err: unknown): never {
  if (err instanceof ErrorMessage) {
    console.error('' + err); // expected error
    process.exit(1);
  } else if (!(err instanceof Error)) {
    console.log('' + err); // help, version or completion message
    process.exit();
  }
  throw err; // internal error: should print stack trace
}

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
 * Reads data from a file. It may block to wait for new data.
 * @param file The file path, descriptor or URL
 * @returns The file data, if any
 */
export async function readFile(file: string | number | URL): Promise<string | undefined> {
  try {
    const { readFileSync } = await import('fs');
    return readFileSync?.(file).toString();
  } catch (err) {
    type ErrnoException = { code?: string };
    const code = (err as ErrnoException).code ?? '';
    if (!['ENOENT', 'EAGAIN'].includes(code)) {
      throw err;
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
  if (typeof actual === typeof expected && !isFunction(actual)) {
    const array1 = isArray(actual);
    const array2 = isArray(expected);
    if (array1 && array2) {
      return (
        actual.length === expected.length && !actual.find((val, i) => !areEqual(val, expected[i]))
      );
    }
    if (!array1 && !array2 && actual && expected && isObject(actual)) {
      const keys1 = getKeys(actual);
      const keys2 = getKeys(expected);
      return (
        keys1.length === keys2.length &&
        !keys1.find(
          (key) => !areEqual((actual as UnknownRecord)[key], (expected as UnknownRecord)[key]),
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
 * @see https://en.wikipedia.org/wiki/Longest_common_substring
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
 * @see https://en.wikipedia.org/wiki/Gestalt_pattern_matching
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
 * @template T The type of naming rulesets
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
 * Strongly-connected components (of directed graph).
 * @param adj The adjacency list
 * @returns [The component for each key, The keys in each component, The component adjacency list]
 */
export function stronglyConnected(
  adj: Readonly<RecordKeyMap>,
): [byKey: Record<string, string>, byComp: RecordKeyMap, compAdj: RecordKeyMap] {
  /** @ignore */
  function dfs(u: string) {
    if (!low[u]) {
      const tu = (low[u] = ++time);
      const iu = vis.push(u) - 1;
      for (const v of adj[u] ?? []) {
        dfs(v);
        low[u] = min(low[u], low[v]);
      }
      if (low[u] == tu) {
        const keys = (byComp[u] = vis.splice(iu));
        for (const v of keys) {
          low[v] = Infinity;
          byKey[v] = u; // id of component is its first element
        }
      }
    }
  }
  let time = 0;
  const low: Record<string, number> = {};
  const vis: Array<string> = [];
  const byKey: Record<string, string> = {};
  const byComp: RecordKeyMap = {};
  const compAdj: RecordKeyMap = {};
  getKeys(adj).forEach(dfs);
  for (const [comp, keys] of getEntries(byComp)) {
    compAdj[comp] = makeUnique(
      keys.flatMap((key) =>
        (adj[key] ?? []).map((req) => byKey[req]).filter((comp2) => comp2 != comp),
      ),
    );
  }
  return [byKey, byComp, compAdj];
}

/**
 * Creates a usage statement from a DAG.
 * @param adj The adjacency list (must be a DAG)
 * @returns The usage statement
 */
export function createUsage(adj: Readonly<RecordKeyMap>): UsageStatement {
  /** @ignore */
  function dfs(u: string) {
    if (!memo.has(u)) {
      const sets = [new Set([u])];
      memo.set(u, sets);
      for (const v of adj[u] ?? []) {
        dfs(v);
        memo.get(v)!.forEach((set, i) => (sets[i + 1] = setUnion(sets[i + 1] ?? new Set(), set)));
      }
      for (let i = sets.length - 1, union = new Set<string>(), prevId = ''; i >= 0; i--) {
        const set = setDifference(sets[i], union); // remove those already seen in parents
        const id = [...set].sort().join('\0');
        if (!map.has(id)) {
          const usage = [...set];
          map.set(id, usage);
          map.get(prevId)!.push(usage); // append to parent usage
        }
        union = setUnion(union, set); // accumulate already seen
        prevId = id;
      }
    }
  }
  const ans: UsageStatement = [];
  const map = new Map<string, UsageStatement>([['', ans]]);
  const memo = new Map<string, Array<Set<string>>>();
  getKeys(adj).forEach(dfs);
  return ans;
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
 * Finds a value that matches a predicate in an object.
 * @template T The type of record value
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
 * @template T The type of record value
 * @param rec The record-like object
 * @returns The list of object values
 */
export function getValues<T>(rec: Readonly<Record<string, T>>): Array<T> {
  return Object.values(rec);
}

/**
 * Gets a list of entries from an object.
 * @template T The type of record value
 * @param rec The record-like object
 * @returns The list of object entries
 */
export function getEntries<T>(rec: Readonly<Record<string, T>>): Array<[string, T]> {
  return Object.entries(rec);
}

/**
 * Checks if a value is an array.
 * @template T The type of array
 * @param value The value
 * @returns True if the value is an array
 */
export function isArray<T = Array<unknown>>(value: unknown): value is T {
  return Array.isArray(value);
}

/**
 * Checks if a value is a string.
 * @param value The value
 * @returns True if the value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a number.
 * @param value The value
 * @returns True if the value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Checks if a value is an object.
 * @param value The value
 * @returns True if the value is an object
 */
export function isObject(value: unknown): value is object {
  return typeof value === 'object';
}

/**
 * Checks if a value is a function.
 * @param value The value
 * @returns True if the value is a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isFunction(value: unknown): value is (...args: any) => any {
  return typeof value === 'function';
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
 * Check whether styles should be omitted from ANSI strings.
 * @param width The terminal width (in number of columns)
 * @returns True if styles should be omitted
 * @see https://clig.dev/#output
 */
export function omitStyles(width: number): boolean {
  return !getEnv('FORCE_COLOR') && (!width || !!getEnv('NO_COLOR') || getEnv('TERM') === 'dumb');
}

/**
 * Check whether indentation spaces can be omitted from ANSI strings.
 * @param width The terminal width (in number of columns)
 * @returns True if indentation spaces can be omitted
 */
export function omitSpaces(width: number): boolean {
  return !getEnv('FORCE_SPACES') && !!width;
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

/**
 * Remove duplicate values from an array without sorting.
 * @template T The type of array element
 * @param vals The values
 * @returns The unique values
 */
export function makeUnique<T>(vals: ReadonlyArray<T>): Array<T> {
  return [...new Set(vals)];
}

/**
 * Add elements to a set from another set.
 * @template T The type of set element
 * @param lhs The left-hand side of the operation (may be updated)
 * @param rhs The right-hand side of the operation
 * @returns The set union
 */
export function setUnion<T>(lhs: Set<T>, rhs: ReadonlySet<T>): Set<T> {
  rhs.forEach((element) => lhs.add(element));
  return lhs;
}

/**
 * Removes elements from a set that also appear in another set.
 * @template T The type of set element
 * @param lhs The left-hand side of the operation (may be updated)
 * @param rhs The right-hand side of the operation
 * @returns The set difference
 */
export function setDifference<T>(lhs: Set<T>, rhs: ReadonlySet<T>): Set<T> {
  rhs.forEach((element) => lhs.delete(element));
  return lhs;
}

/**
 * Creates an array with a phrase to be applied to each element.
 * To be used as argument in formatting functions.
 * @template T The type of array element
 * @param $phrase The custom phrase
 * @param $elements The array elements
 * @returns The array with a phrase
 */
export function arrayWithPhrase<T>(
  $phrase: string,
  $elements: ReadonlyArray<T>,
): { $phrase: string; $elements: ReadonlyArray<T> } {
  return { $phrase, $elements };
}

/**
 * Gets the base name of a file path (i.e., the file name with extension).
 * @param path The file path
 * @returns The base name
 */
export function getBaseName(path: string): string {
  return path.split(regex.pathSep).at(-1)!;
}

/**
 * Gets the normalized value of the positional marker(s).
 * @param marker The positional marker(s)
 * @returns The normalized value
 */
export function getMarker(marker?: string | [string, string]): [string?, string?] {
  return isString(marker) ? [marker] : (marker ?? []);
}
