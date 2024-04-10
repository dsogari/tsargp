//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { HelpSections } from './formatter';
import type {
  Options,
  OptionValues,
  OpaqueOption,
  OpaqueOptions,
  OpaqueOptionValues,
  Requires,
  RequiresEntry,
  ResolveCallback,
} from './options';
import type { Range } from './utils';
import type {
  OptionInfo,
  ConcreteConfig,
  ValidatorConfig,
  ValidationFlags,
  ValidationResult,
} from './validator';

import { ConnectiveWord, ErrorItem } from './enums';
import { createFormatter, isHelpFormat } from './formatter';
import { RequiresAll, RequiresNot, RequiresOne, isOpt, getParamCount } from './options';
import { format, WarnMessage, CompMessage, TerminalString, HelpMessage } from './styles';
import { areEqual, findSimilar, getArgs, isTrue, max, findInObject, env } from './utils';
import { OptionValidator, defaultConfig } from './validator';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The default help sections.
 */
const defaultSections: HelpSections = [
  { type: 'usage', title: 'Usage:', indent: 2 },
  { type: 'groups', title: 'Options:' },
];

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * The parsing flags.
 */
export type ParsingFlags = {
  /**
   * The program name.
   */
  readonly progName?: string;
  /**
   * The completion index of a raw command line.
   */
  readonly compIndex?: number;
  /**
   * The prefix of cluster arguments.
   * If set, then eligible arguments that have this prefix will be considered a cluster.
   */
  readonly clusterPrefix?: string;
};

/**
 * The parsing result.
 */
export type ParsingResult = {
  /**
   * The warnings generated by the parser, if any.
   */
  readonly warning?: WarnMessage;
};

/**
 * The command line or command-line arguments.
 */
export type CommandLine = string | Array<string>;

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * Information about the current parsing context.
 */
type ParseContext = [
  validator: OptionValidator,
  values: OpaqueOptionValues,
  args: Array<string>,
  specifiedKeys: Set<string>,
  completing: boolean,
  warning: WarnMessage,
  progName?: string,
  clusterPrefix?: string,
];

/**
 * Information about the current argument sequence.
 */
type ParseEntry = [
  index: number,
  info?: OptionInfo,
  value?: string,
  comp?: boolean,
  marker?: boolean,
  isNew?: boolean,
];

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements parsing of command-line arguments into option values.
 * @template T The type of the option definitions
 */
export class ArgumentParser<T extends Options = Options> {
  private readonly validator: OptionValidator;

  /**
   * Creates an argument parser based on a set of option definitions.
   * @param options The option definitions
   * @param config The validator configuration
   */
  constructor(options: T, config?: ValidatorConfig) {
    this.validator = new OptionValidator(options as OpaqueOptions, mergeConfig(config));
  }

  /**
   * Validates the option definitions.
   * This should only be called during development and testing, but skipped in production.
   * @param flags The validation flags
   * @returns The validation result
   */
  validate(flags?: ValidationFlags): Promise<ValidationResult> {
    return this.validator.validate(flags);
  }

  /**
   * Parses command-line arguments into option values.
   * @param cmdLine The command line or arguments
   * @param flags The parsing flags
   * @returns The options' values
   */
  async parse(cmdLine?: CommandLine, flags?: ParsingFlags): Promise<OptionValues<T>> {
    const values = {} as OptionValues<T>;
    await this.parseInto(values, cmdLine, flags);
    return values;
  }

  /**
   * Parses command-line arguments into option values.
   * @param values The options' values to parse into
   * @param cmdLine The command line or arguments
   * @param flags The parsing flags
   * @returns The parsing result
   */
  async parseInto(
    values: OptionValues<T>,
    cmdLine = env('COMP_LINE') ?? env('BUFFER') ?? process?.argv.slice(2) ?? [],
    flags: ParsingFlags = {
      compIndex: Number(env('COMP_POINT') ?? env('CURSOR')) || env('BUFFER')?.length,
    },
  ): Promise<ParsingResult> {
    const args = typeof cmdLine === 'string' ? getArgs(cmdLine, flags.compIndex) : cmdLine;
    return doParse(
      this.validator,
      values,
      args,
      !!flags.compIndex,
      flags.progName,
      flags.clusterPrefix,
    );
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Merges a validator configuration with the default configuration.
 * @param config The provided configuration
 * @returns The merged configuration
 */
function mergeConfig(config: ValidatorConfig = {}): ConcreteConfig {
  return {
    styles: { ...defaultConfig.styles, ...config.styles },
    phrases: { ...defaultConfig.phrases, ...config.phrases },
    connectives: { ...defaultConfig.connectives, ...config.connectives },
  };
}

/**
 * Parses the command-line arguments.
 * @param validator The option validator
 * @param values The option values
 * @param args The command-line arguments
 * @param completing True if performing completion
 * @param progName The program name, if any
 * @param clusterPrefix The cluster prefix, if any
 * @returns The parsing result
 */
async function doParse(
  validator: OptionValidator,
  values: OpaqueOptionValues,
  args: Array<string>,
  completing: boolean,
  progName = process?.argv[1].split(/[\\/]/).at(-1),
  clusterPrefix?: string,
): Promise<ParsingResult> {
  if (!completing && progName && process?.title) {
    process.title += ' ' + progName;
  }
  initValues(validator.options, values);
  const specifiedKeys = new Set<string>();
  const warning = new WarnMessage();
  const context: ParseContext = [
    validator,
    values,
    args,
    specifiedKeys,
    completing,
    warning,
    progName,
    clusterPrefix,
  ];
  if (await parseArgs(context)) {
    await checkRequired(context);
  }
  return warning.length ? { warning } : {};
}

/**
 * Initializes the option values.
 * @param options The option definitions
 * @param values The option values
 */
function initValues(options: OpaqueOptions, values: OpaqueOptionValues) {
  for (const key in options) {
    const option = options[key];
    if (!(key in values) && (!isOpt.msg(option) || option.saveMessage)) {
      values[key] = undefined;
    }
  }
}

/**
 * Parses a cluster argument.
 * @param context The parsing context
 * @param index The argument index
 * @returns True if the argument was a cluster
 */
function parseCluster(context: ParseContext, index: number): boolean {
  /** @ignore */
  function getOpt(letter: string): [string, OpaqueOption, string?] {
    const key = letters.get(letter) ?? '';
    const option = validator.options[key];
    const name = option.names?.find((name): name is string => !!name);
    return [key, option, name];
  }
  const [validator, , args, , completing, , , prefix] = context;
  const cluster = args[index++];
  if (!prefix || !cluster.startsWith(prefix) || cluster.length === prefix.length) {
    return false;
  }
  const letters = validator.letters;
  const rest = cluster.slice(prefix.length);
  const unknownIndex = [...rest].findIndex((letter) => !letters.has(letter));
  if (unknownIndex === 0) {
    return false; // do not consider it a cluster
  }
  if (unknownIndex > 0) {
    const [, , name] = getOpt(rest[0]);
    args.splice(index, 0, ...(name ? [name] : []), rest.slice(1));
    return true; // treat it as an inline parameter
  }
  for (let j = 0; j < rest.length && (!completing || index < args.length); ++j) {
    const letter = rest[j];
    const [, option, name] = getOpt(letter);
    const [min, max] = getParamCount(option);
    if (j < rest.length - 1 && (option.type === 'command' || min < max)) {
      throw validator.error(ErrorItem.invalidClusterOption, { o: letter });
    }
    if (name) {
      args.splice(index++, 0, name);
    }
    index += min;
  }
  return true;
}

/**
 * Reads the value of an environment variable.
 * @param context The parsing context
 * @param info The option information
 * @returns True if the environment variable was found
 */
async function readEnvVar(context: ParseContext, info: OptionInfo): Promise<boolean> {
  const [, values] = context;
  const [key, name, option] = info;
  const value = env(name);
  if (value !== undefined) {
    if (option.type === 'flag') {
      // don't parse the flag value, for consistency with the semantics of the command-line
      values[key] = true;
    } else {
      await parseParam(context, NaN, info, [value]);
    }
    return true;
  }
  return false;
}

/**
 * Parses the command-line arguments.
 * @param context The parsing context
 * @returns True if requirements should be checked
 */
async function parseArgs(context: ParseContext): Promise<boolean> {
  const [validator, values, args, specifiedKeys, completing, warning] = context;
  let prev: ParseEntry = [-1];
  let paramCount: Range = [0, 0];
  let positional = false;
  for (let i = 0, k = 0; i < args.length; i = prev[0]) {
    const next = findNext(context, prev);
    const [j, info, value, comp, marker, isNew] = next;
    if (isNew || !info) {
      if (prev[1]) {
        // process the previous sequence
        const breakLoop = await handleNonNiladic(context, prev[1], i, args.slice(k, j));
        if (breakLoop) {
          return false;
        }
      }
      if (!info) {
        break; // finished
      }
      prev = next;
      const [key, name, option] = info;
      paramCount = getParamCount(option);
      const niladic = !paramCount[1];
      const hasValue = value !== undefined;
      if (niladic || marker) {
        if (comp) {
          throw new CompMessage();
        }
        if (hasValue) {
          if (completing) {
            // ignore inline parameters of niladic options or positional marker while completing
            prev[1] = undefined;
            prev[4] = false;
            continue;
          }
          const [alt, name2] = marker ? [1, info[3]] : [0, name];
          throw validator.error(ErrorItem.disallowedInlineValue, { o: name2 }, { alt });
        }
      }
      if (!completing && !specifiedKeys.has(key)) {
        if (option.deprecated) {
          warning.push(validator.format(ErrorItem.deprecatedOption, { o: name }));
        }
        specifiedKeys.add(key);
      }
      if (niladic) {
        // comp === false
        const [breakLoop, skipCount] = await handleNiladic(context, info, j, args.slice(j + 1));
        if (breakLoop) {
          return false;
        }
        prev[0] += skipCount;
        prev[1] = undefined;
        continue; // fetch more
      }
      // don't use option.positional for this check
      positional = info === validator.positional;
      if (!comp) {
        if (positional || !hasValue) {
          // positional marker, first positional parameter or option name
          k = hasValue ? j : j + 1;
        } else {
          // option name with inline parameter
          const breakLoop = await handleNonNiladic(context, info, j, [value]);
          if (breakLoop) {
            return false;
          }
          prev[1] = undefined;
        }
        continue; // fetch more
      }
      // perform completion of first positional or inline parameter
      k = j;
    }
    if (!info) {
      break; // finished
    }
    // comp === true
    const words = await handleCompletion(values, info, i, args.slice(k, j), value);
    if (!marker && ((j === k && positional) || j - k >= paramCount[0])) {
      words.push(...completeName(validator, value));
    }
    throw new CompMessage(...words);
  }
  return !completing;
}

/**
 * Finds the start of the next sequence in the command-line arguments, or a word to complete.
 * If a sequence is found, it is a new option specification (but the option can be the same).
 * @param context The parsing context
 * @param prev The previous parse entry
 * @returns The new parse entry
 */
function findNext(context: ParseContext, prev: ParseEntry): ParseEntry {
  const [validator, , args, , completing] = context;
  const [index, info, prevVal, , marker] = prev;
  const inc = prevVal !== undefined ? 1 : 0;
  const positional = validator.positional;
  const [min, max] = info ? getParamCount(info[2]) : [0, 0];
  for (let i = index + 1; i < args.length; ++i) {
    const arg = args[i];
    const comp = completing && i + 1 === args.length;
    if (!info || (!marker && i - index + inc > min)) {
      const [name, value] = arg.split(/=(.*)/, 2);
      const key = validator.names.get(name);
      if (key) {
        if (comp && value === undefined) {
          throw new CompMessage(name);
        }
        const marker = name === positional?.[3];
        const info = marker ? positional : ([key, name, validator.options[key]] as OptionInfo);
        return [i, info, value, comp, marker, true];
      }
      if (parseCluster(context, i)) {
        if (comp) {
          throw new CompMessage();
        }
        continue;
      }
      if (!info || i - index + inc > max) {
        if (!positional) {
          if (comp) {
            throw new CompMessage(...completeName(validator, arg));
          }
          if (completing) {
            continue; // ignore unknown options during completion
          }
          handleUnknownName(validator, name);
        }
        return [i, positional, arg, comp, false, true];
      }
    }
    if (comp) {
      return [i, info, arg, comp, marker, false];
    }
  }
  return [args.length];
}

/**
 * Handles a non-niladic option.
 * @param context The parsing context
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param params The option parameters, if any
 * @returns True if the parsing loop should be broken
 */
async function handleNonNiladic(
  context: ParseContext,
  info: OptionInfo,
  index: number,
  params: Array<string>,
): Promise<boolean> {
  const [validator, , , , comp] = context;
  const [, name, option] = info;
  // max is not needed here because either:
  // - the parser would have failed to find an option that starts a new sequence at max + 1; or
  // - it would have reached the end of the arguments before max + 1
  const [min] = getParamCount(option);
  if (params.length < min) {
    throw validator.error(ErrorItem.missingParameter, { o: name });
  }
  if (option.type === 'function') {
    // since we know this is a function option, we're deliberately reusing the niladic handling,
    // with params as the "rest", and ignoring the skip count
    const [breakLoop] = await handleNiladic(context, info, index, params);
    return breakLoop;
  }
  try {
    // use await here instead of return, in order to catch errors
    await parseParam(context, index, info, params);
  } catch (err) {
    // do not propagate errors during completion
    if (!comp) {
      throw err;
    }
  }
  return false;
}

/**
 * Resolve a package version using a module-resolve function.
 * @param validator The option validator
 * @param resolve The resolve callback
 * @returns The version string
 */
async function resolveVersion(
  validator: OptionValidator,
  resolve: ResolveCallback,
): Promise<string> {
  const { promises } = await import('fs');
  for (
    let path = './package.json', lastResolved = '', resolved = resolve(path);
    resolved !== lastResolved;
    path = '../' + path, lastResolved = resolved, resolved = resolve(path)
  ) {
    try {
      const jsonData = await promises.readFile(new URL(resolved));
      return JSON.parse(jsonData.toString()).version;
    } catch (err) {
      if ((err as ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
  throw validator.error(ErrorItem.missingPackageJson);
}

/**
 * Handles an unknown option name.
 * @param validator The option validator
 * @param name The unknown option name
 */
function handleUnknownName(validator: OptionValidator, name: string): never {
  const similar = findSimilar(name, validator.names.keys(), 0.6);
  const [args, alt] = similar.length ? [{ o1: name, o2: similar }, 1] : [{ o: name }, 0];
  const sep = validator.config.connectives[ConnectiveWord.optionSep];
  throw validator.error(ErrorItem.unknownOption, args, { alt, sep });
}

/**
 * Completes an option name.
 * @param validator The option validator
 * @param prefix The name prefix, if any
 * @returns The completion words
 */
function completeName(validator: OptionValidator, prefix?: string): Array<string> {
  const names = [...validator.names.keys()];
  return prefix ? names.filter((name) => name.startsWith(prefix)) : names;
}

/**
 * Checks the items of a requirement expression or object.
 * @param validator The option validator
 * @param items The list of requirement items
 * @param itemFn The callback to execute on each item
 * @param error The terminal string error
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @param and If true, return on the first error; else return on the first success
 * @returns True if the requirement was satisfied
 */
async function checkRequireItems<T>(
  validator: OptionValidator,
  items: Array<T>,
  itemFn: (
    item: T,
    error: TerminalString,
    negate: boolean,
    invert: boolean,
  ) => boolean | Promise<boolean>,
  error: TerminalString,
  negate: boolean,
  invert: boolean,
  and: boolean,
): Promise<boolean> {
  const connectives = validator.config.connectives;
  const connective = invert ? connectives[ConnectiveWord.and] : connectives[ConnectiveWord.or];
  if (!and && items.length > 1) {
    error.open('(');
  }
  let first = true;
  for (const item of items) {
    if (and || first) {
      first = false;
    } else {
      error.word(connective);
    }
    const success = await itemFn(item, error, negate, invert);
    if (success !== and) {
      return success;
    }
  }
  if (and) {
    return true;
  }
  if (items.length > 1) {
    error.close(')');
  }
  return false;
}

/**
 * Parses the value(s) of the option parameter(s).
 * @param context The parsing context
 * @param index The starting index of the argument sequence
 * @param info The option information
 * @param params The option parameter(s)
 * @returns A promise that must be awaited before continuing
 */
async function parseParam(
  context: ParseContext,
  index: number,
  info: OptionInfo,
  params: Array<string>,
) {
  /** @ignore */
  function norm<T>(val: T) {
    return validator.normalize(option, name, val);
  }
  /** @ignore */
  function bool(str: string): boolean {
    const result = isTrue(str, option);
    if (result === undefined) {
      const names = [...(option.truthNames ?? []), ...(option.falsityNames ?? [])];
      const args = { o: name, s1: str, s2: names };
      const sep = validator.config.connectives[ConnectiveWord.stringSep];
      throw validator.error(ErrorItem.enumsConstraintViolation, args, { alt: 0, sep });
    }
    return result;
  }
  const [key, name, option] = info;
  if (!params.length) {
    return setValue(context, key, option, option.fallback);
  }
  const [validator, values, , , comp] = context;
  const convertFn: (val: string) => unknown = isOpt.bool(option)
    ? bool
    : isOpt.str(option)
      ? (str: string) => str
      : Number;
  const parse = option.parse;
  const lastParam = params[params.length - 1];
  let value;
  if (isOpt.arr(option)) {
    const separator = option.separator;
    const param = separator ? lastParam.split(separator) : params;
    if (parse) {
      const seq = { values, index, name, param, comp };
      value = ((await parse(seq)) as Array<unknown>).map(norm);
    } else {
      value = option.append ? (values[key] as Array<unknown>) ?? [] : [];
      value.push(...param.map(convertFn).map(norm));
    }
  } else {
    const seq = { values, index, name, param: lastParam, comp };
    value = parse ? await parse(seq) : convertFn(lastParam);
  }
  values[key] = norm(value);
}

/**
 * Sets the normalized value of an option.
 * @param context The parsing context
 * @param key The option key
 * @param option The option definition
 * @param value The option value
 */
async function setValue(context: ParseContext, key: string, option: OpaqueOption, value: unknown) {
  /** @ignore */
  function norm<T>(val: T) {
    return validator.normalize(option, key, val);
  }
  const [validator, values] = context;
  if (value === undefined) {
    values[key] = value;
    return;
  }
  const resolved = typeof value === 'function' ? await value(values) : value;
  values[key] =
    isOpt.ukn(option) || isOpt.bool(option)
      ? resolved
      : isOpt.arr(option)
        ? norm(resolved.map(norm))
        : norm(resolved);
}

/**
 * Handles a niladic option.
 * @param context The parsing context
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param rest The remaining command-line arguments
 * @returns [True if the parsing loop should be broken, number of additional processed arguments]
 */
async function handleNiladic(
  context: ParseContext,
  info: OptionInfo,
  index: number,
  rest: Array<string>,
): Promise<[boolean, number]> {
  const [, values, , , comp, warnings] = context;
  const [key, name, option] = info;
  switch (option.type) {
    case 'flag': {
      values[key] = !option.negationNames?.includes(name);
      return [false, 0];
    }
    case 'function': {
      const breakLoop = !!option.break && !comp;
      if (breakLoop) {
        await checkRequired(context);
      }
      const skipCount = await handleFunction(context, index, rest, info);
      return [breakLoop, skipCount];
    }
    case 'command': {
      if (!comp) {
        await checkRequired(context);
      }
      const { warning } = await handleCommand(context, index, rest, info);
      if (warning) {
        warnings.push(...warning);
      }
      return [true, 0];
    }
    default: {
      // skip message-valued options during completion
      if (!comp) {
        await handleMessage(context, rest, option, key);
      }
      return [!comp, 0];
    }
  }
}

/**
 * Handles a function option.
 * @param context The parsing context
 * @param index The starting index of the argument sequence
 * @param param The remaining command-line arguments
 * @param info The option information
 * @returns The number of additional processed arguments
 */
async function handleFunction(
  context: ParseContext,
  index: number,
  param: Array<string>,
  info: OptionInfo,
): Promise<number> {
  const [key, name, option] = info;
  if (option.exec) {
    const [, values, , , comp] = context;
    try {
      values[key] = await option.exec({ values, index, name, param, comp });
    } catch (err) {
      // do not propagate common errors during completion
      if (!comp || err instanceof CompMessage) {
        throw err;
      }
    }
  }
  return max(0, option.skipCount ?? 0);
}

/**
 * Handles a command option.
 * @param context The parsing context
 * @param index The starting index of the argument sequence
 * @param rest The remaining command-line arguments
 * @param info The option information
 * @returns The result of parsing the command arguments
 */
async function handleCommand(
  context: ParseContext,
  index: number,
  rest: Array<string>,
  info: OptionInfo,
): Promise<ParsingResult> {
  const [validator, values, , , comp] = context;
  const [key, name, option] = info;
  const { options, clusterPrefix } = option;
  const cmdOptions = typeof options === 'function' ? await options() : options ?? {};
  const cmdValidator = new OptionValidator(cmdOptions as OpaqueOptions, validator.config);
  const param: OpaqueOptionValues = {};
  const result = await doParse(cmdValidator, param, rest, comp, name, clusterPrefix);
  // comp === false, otherwise completion will have taken place by now
  if (option.exec) {
    values[key] = await option.exec({ values, index, name, param });
  }
  return result;
}

/**
 * Handles a message-valued option.
 * @param context The parsing context
 * @param rest The remaining command-line arguments
 * @param option The option definition
 * @param key The option key
 * @throws The help or version message
 */
async function handleMessage(
  context: ParseContext,
  rest: Array<string>,
  option: OpaqueOption,
  key: string,
) {
  const [validator, values] = context;
  const message =
    option.type === 'help'
      ? await handleHelp(context, rest, option)
      : option.resolve
        ? await resolveVersion(validator, option.resolve)
        : option.version ?? '';
  if (option.saveMessage) {
    values[key] = message;
  } else {
    throw message;
  }
}

/**
 * Handles a help option.
 * @param context The parsing context
 * @param rest The remaining command-line arguments
 * @param option The option definition
 * @returns The help message
 */
async function handleHelp(
  context: ParseContext,
  rest: Array<string>,
  option: OpaqueOption,
): Promise<HelpMessage> {
  let [validator, , , , , , progName] = context;
  if (option.useNested && rest.length) {
    const command = findInObject(
      validator.options,
      (opt) => opt.type === 'command' && !!opt.names?.includes(rest[0]),
    );
    if (command) {
      const options = command.options;
      if (options) {
        const resolved = (
          typeof options === 'function' ? await options() : options
        ) as OpaqueOptions;
        const help = findInObject(resolved, (opt) => opt.type === 'help');
        if (help) {
          validator = new OptionValidator(resolved, validator.config);
          option = help;
          rest.splice(0, 1); // only if the command has help; otherwise, it may be an option filter
        }
      }
    }
  }
  let format;
  if (option.useFormat && rest.length && isHelpFormat(rest[0])) {
    format = rest[0];
    rest.splice(0, 1); // only if the format is recognized; otherwise, it may be an option filter
  }
  const config = option.config ?? {};
  if (option.useFilter) {
    config.filter = rest;
  }
  const formatter = createFormatter(validator, config, format);
  const sections = option.sections ?? defaultSections;
  return formatter.formatSections(sections, progName);
}

/**
 * Handles the completion of an option parameter.
 * @param values The option values
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param param The preceding parameters, if any
 * @param comp The word being completed
 * @returns The completion words
 */
async function handleCompletion(
  values: OpaqueOptionValues,
  info: OptionInfo,
  index: number,
  param: Array<string>,
  comp = '',
): Promise<Array<string>> {
  const [, name, option] = info;
  let words: Array<string>;
  if (option.complete) {
    try {
      words = await option.complete({ values, index, name, param, comp });
    } catch (err) {
      // do not propagate errors during completion
      words = [];
    }
  } else {
    words = isOpt.bool(option)
      ? [...(option.truthNames ?? []), ...(option.falsityNames ?? [])]
      : option.enums?.map((val) => `${val}`) ?? [];
    if (comp) {
      words = words.filter((word) => word.startsWith(comp));
    }
  }
  return words;
}

/**
 * Checks if required options were correctly specified.
 * This should only be called when completion is not in effect.
 * @param context The parsing context
 */
async function checkRequired(context: ParseContext) {
  /** @ignore */
  function checkEnv(key: string) {
    return checkEnvVarAndDefaultValue(context, key);
  }
  /** @ignore */
  function checkReq(key: string) {
    return checkRequiredOption(context, key);
  }
  const [validator] = context;
  const keys = Object.keys(validator.options);
  await Promise.all(keys.map(checkEnv)); // <<-- we may need to serialize this
  await Promise.all(keys.map(checkReq)); // <<-- this does not need to be serialized
}

/**
 * Checks if there is an environment variable or default value for an option.
 * @param context The parsing context
 * @param key The option key
 * @returns A promise that must be awaited before continuing
 */
async function checkEnvVarAndDefaultValue(context: ParseContext, key: string) {
  const [validator, , , specifiedKeys] = context;
  if (specifiedKeys.has(key)) {
    return;
  }
  const option = validator.options[key];
  const envVar = option.envVar;
  if (envVar && (await readEnvVar(context, [key, envVar, option]))) {
    specifiedKeys.add(key);
  } else if (option.required) {
    const name = option.preferredName ?? '';
    throw validator.error(ErrorItem.missingRequiredOption, { o: name });
  } else if ('default' in option) {
    return setValue(context, key, option, option.default); // sets undefined as well
  }
}

/**
 * Checks the requirements of an option.
 * @param context The parsing context
 * @param key The option key
 */
async function checkRequiredOption(context: ParseContext, key: string) {
  const [validator, , , specifiedKeys] = context;
  /** @ignore */
  function check(requires: Requires, negate: boolean, invert: boolean) {
    return checkRequires(context, requires, error, negate, invert);
  }
  const option = validator.options[key];
  const specified = specifiedKeys.has(key);
  const requires = option.requires;
  const requiredIf = option.requiredIf;
  const error = new TerminalString();
  if (
    (specified && requires && !(await check(requires, false, false))) ||
    (!specified && requiredIf && !(await check(requiredIf, true, true)))
  ) {
    const name = option.preferredName ?? '';
    const kind = specified
      ? ErrorItem.unsatisfiedRequirement
      : ErrorItem.unsatisfiedCondRequirement;
    throw validator.error(kind, { o: name, p: error });
  }
}

/**
 * Checks the requirements of an option that was specified.
 * @param context The parsing context
 * @param requires The option requirements
 * @param error The terminal string error
 * @param negate True if the requirements should be negated
 * @param invert True if the requirements should be inverted
 * @returns True if the requirements were satisfied
 */
async function checkRequires(
  context: ParseContext,
  requires: Requires,
  error: TerminalString,
  negate: boolean,
  invert: boolean,
): Promise<boolean> {
  /** @ignore */
  function checkItem(requires: Requires, error: TerminalString, negate: boolean, invert: boolean) {
    return checkRequires(context, requires, error, negate, invert);
  }
  /** @ignore */
  function checkEntry(
    entry: RequiresEntry,
    error: TerminalString,
    negate: boolean,
    invert: boolean,
  ) {
    return checkRequirement(context, entry, error, negate, invert);
  }
  if (typeof requires === 'string') {
    return checkEntry([requires, undefined], error, negate, invert);
  }
  if (requires instanceof RequiresNot) {
    return checkItem(requires.item, error, !negate, invert);
  }
  const [validator, values] = context;
  if (requires instanceof RequiresAll || requires instanceof RequiresOne) {
    const and = requires instanceof RequiresAll !== negate;
    return checkRequireItems(validator, requires.items, checkItem, error, negate, invert, and);
  }
  if (typeof requires === 'object') {
    const entries = Object.entries(requires);
    return checkRequireItems(validator, entries, checkEntry, error, negate, invert, !negate);
  }
  if ((await requires(values)) === negate) {
    const { styles, connectives } = validator.config;
    if (negate !== invert) {
      error.word(connectives[ConnectiveWord.not]);
    }
    format.v(requires, styles, error);
    return false;
  }
  return true;
}

/**
 * Checks if a required option was specified with correct values.
 * @param context The parsing context
 * @param entry The required option key and value
 * @param error The terminal string error
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @returns True if the requirement was satisfied
 */
function checkRequirement(
  context: ParseContext,
  entry: RequiresEntry,
  error: TerminalString,
  negate: boolean,
  invert: boolean,
): boolean {
  const [validator, values, , specifiedKeys] = context;
  const [key, value] = entry;
  const actual = values[key];
  const option = validator.options[key];
  const specified = specifiedKeys.has(key) || actual !== undefined; // consider default values
  const required = value !== null;
  if (isOpt.msg(option) || isOpt.ukn(option) || !specified || !required || value === undefined) {
    if ((specified === required) !== negate) {
      return true;
    }
    const { styles, connectives } = validator.config;
    if (specified !== invert) {
      error.word(connectives[ConnectiveWord.no]);
    }
    format.o(option.preferredName ?? '', styles, error);
    return false;
  }
  const spec = isOpt.bool(option) ? 'b' : isOpt.str(option) ? 's' : 'n';
  return checkRequiredValue(validator, option, negate, invert, actual, value, error, spec);
}

/**
 * Checks the required value of an option against a specified value.
 * @param validator The option validator
 * @param option The option definition
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @param actual The specified value
 * @param value The required value
 * @param error The terminal string error
 * @param spec The formatting specification
 * @returns True if the requirement was satisfied
 */
function checkRequiredValue(
  validator: OptionValidator,
  option: OpaqueOption,
  negate: boolean,
  invert: boolean,
  actual: unknown,
  value: unknown,
  error: TerminalString,
  spec: string,
): boolean {
  /** @ignore */
  function norm<T>(val: T) {
    return validator.normalize(option, name, val);
  }
  const name = option.preferredName ?? '';
  const array = Array.isArray(value);
  let expected;
  if (array) {
    expected = norm(value.map(norm));
    if (areEqual(actual as ReadonlyArray<unknown>, expected, option.unique) !== negate) {
      return true;
    }
  } else {
    expected = norm(value);
    if ((actual === expected) !== negate) {
      return true;
    }
  }
  const config = validator.config;
  const styles = config.styles;
  const connectives = config.connectives;
  const connective =
    negate !== invert ? connectives[ConnectiveWord.notEquals] : connectives[ConnectiveWord.equals];
  const phrase = array ? `[%${spec}]` : `%${spec}`;
  format.o(name, styles, error);
  error.word(connective).format(styles, phrase, { [spec]: expected });
  return false;
}
