//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import {
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
  RequiresAll,
  RequiresNot,
  RequiresOne,
  RequiresVal,
} from './options.js';

import { ErrorItem } from './enums.js';
import { AnsiString, ErrorMessage } from './styles.js';
import {
  getEntries,
  getSymbol,
  isArray,
  isFunction,
  isObject,
  isString,
  makeUnique,
} from './utils.js';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
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
   * Information regarding the positional option, if any.
   */
  readonly positional: OptionInfo | undefined;

  /**
   * Creates an option registry based on a set of option definitions.
   * @param options The option definitions
   */
  constructor(readonly options: OpaqueOptions) {
    for (const [key, option] of getEntries(this.options)) {
      registerNames(this.names, this.letters, key, option);
      if (option.positional !== undefined) {
        this.positional = [key, option, option.preferredName ?? ''];
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
    option.preferredName = names[0]; // may be undefined
  }
  for (const letter of option.cluster ?? '') {
    letterToKey.set(letter, key);
  }
}

/**
 * Gets a list of option names, including the positional marker.
 * @param option The option definition
 * @returns The option names
 */
export function getOptionNames(option: OpaqueOption): Array<string> {
  const names = option.names?.slice().filter(isString) ?? [];
  if (isString(option.positional)) {
    names.push(option.positional);
  }
  return names;
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
 * Checks whether an option can only be supplied through the environment.
 * Does not check whether the environment attributes are actually set.
 * @param option The option definition
 * @returns True if the option can only be supplied through the environment
 */
export function isEnvironmentOnly(option: OpaqueOption): boolean {
  return !option.cluster && (option.positional ?? getLastOptionName(option)) === undefined;
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
      : paramCount !== undefined && paramCount >= 0
        ? [paramCount, paramCount]
        : [0, Infinity]
    : type === 'array'
      ? [0, Infinity]
      : [1, 1];
}

/**
 * Visits an option's requirements, executing a callback according to the type of the requirement.
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
  return (isObject(inline) ? inline[name] : inline) ?? true;
}

/**
 * Normalizes the value of an array-valued option and checks the validity of its element count.
 * @param option The option definition
 * @param name The option name (or key)
 * @param value The option value
 * @returns The normalized array
 * @throws On value not satisfying the limit constraint
 */
export function normalizeArray(option: OpaqueOption, name: symbol, value: unknown): Array<unknown> {
  if (!isArray(value)) {
    return [value]; // convert to a single-element tuple
  }
  const { unique, limit } = option;
  const result = unique ? makeUnique(value) : value.slice(); // the input may be read-only
  if (limit && limit > 0 && limit < result.length) {
    throw ErrorMessage.create(ErrorItem.limitConstraintViolation, {}, name, result.length, limit);
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
    throw ErrorMessage.createCustom(phrase, {}, getSymbol(info.name), param, range);
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
