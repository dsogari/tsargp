//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  Options,
  OptionInfo,
  OptionValues,
  OpaqueOption,
  OpaqueOptionValues,
  Requires,
  RequiresEntry,
  ModuleResolutionCallback,
  RequirementCallback,
} from './options.js';
import type { AnsiMessage, FormattingFlags } from './styles.js';
import type { Args } from './utils.js';

import { config } from './config.js';
import { ErrorItem } from './enums.js';
import { format } from './formatter.js';
import {
  getParamCount,
  isMessage,
  visitRequirements,
  OptionRegistry,
  valuesFor,
  getNestedOptions,
  isCommand,
  checkInline,
} from './options.js';
import { fmt, WarnMessage, TextMessage, AnsiString, ErrorMessage } from './styles.js';
import {
  getCmdLine,
  findSimilar,
  getEnv,
  getCompIndex,
  getEntries,
  getSymbol,
  getKeys,
  isArray,
  findValue,
  getArgs,
  readFile,
  areEqual,
  regex,
  isString,
  isFunction,
} from './utils.js';

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * The parsing flags.
 */
export type ParsingFlags = {
  /**
   * The program name. It may be changed by the parser.
   */
  progName?: string;
  /**
   * The completion index of a raw command line.
   */
  readonly compIndex?: number;
  /**
   * The prefix of cluster arguments.
   * If set, then eligible arguments that have this prefix will be considered a cluster.
   * Has precedence over {@link ParsingFlags.optionPrefix}.
   */
  readonly clusterPrefix?: string;
  /**
   * The prefix of option names.
   * If set, then arguments that have this prefix will always be considered an option name.
   */
  readonly optionPrefix?: string;
  /**
   * A resolution function for JavaScript modules.
   * Use `import.meta.resolve.bind(import.meta)`. Use in non-browser environments only.
   */
  readonly resolve?: ModuleResolutionCallback;
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
 * The parsing context.
 */
type ParseContext = [
  /**
   * The option registry.
   */
  registry: OptionRegistry,
  /**
   * The current option values.
   */
  values: OpaqueOptionValues,
  /**
   * The command-line arguments.
   */
  args: Array<string>,
  /**
   * The set of options that were specified.
   */
  specifiedKeys: Set<string>,
  /**
   * True if word completion is in effect.
   */
  completing: boolean,
  /**
   * The list of warnings.
   */
  warning: WarnMessage,
  /**
   * The parsing flags.
   */
  flags: ParsingFlags,
];

/**
 * Information about the current argument sequence.
 */
type ParseEntry = [
  /**
   * The argument index.
   */
  index: number,
  /**
   * The option definition (augmented).
   */
  info?: OptionInfo,
  /**
   * The option value.
   */
  value?: string,
  /**
   * True if an argument is being completed.
   */
  comp?: boolean,
  /**
   * True if it is the positional marker.
   */
  isMarker?: boolean,
  /**
   * True if it is a new specification.
   */
  isNew?: boolean,
  /**
   * True if it is positional, but not the marker.
   */
  isPositional?: boolean,
];

/**
 * A function to check a requirement item.
 * @template T The type of the item
 */
type RequireItemFn<T> = (
  context: ParseContext,
  option: OpaqueOption,
  item: T,
  error: AnsiString,
  negate: boolean,
  invert: boolean,
) => boolean | Promise<boolean>;

/**
 * The type of command-line argument encountered during parsing.
 */
const enum ArgType {
  /**
   * A valid option name.
   */
  optionName,
  /**
   * An invalid option name.
   */
  unknownOption,
  /**
   * A valid option parameter.
   */
  parameter,
  /**
   * A missing option parameter.
   */
  missingParameter,
  /**
   * A positional argument.
   */
  positional,
  /**
   * An argument that comes after the positional marker.
   */
  afterMarker,
  /**
   * A cluster argument.
   */
  cluster,
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Parses command-line arguments into option values.
 * @param options The option definitions
 * @param cmdLine The command line or arguments
 * @param flags The parsing flags
 * @returns The options' values
 */
export async function parse<T extends Options>(
  options: T,
  cmdLine?: CommandLine,
  flags?: ParsingFlags,
): Promise<OptionValues<T>> {
  const values = valuesFor(options);
  await parseInto(options, values, cmdLine, flags);
  return values;
}

/**
 * Parses command-line arguments into option values.
 * @param options The option definitions
 * @param values The options' values to parse into
 * @param cmdLine The command line or arguments
 * @param flags The parsing flags
 * @returns The parsing result
 */
export async function parseInto<T extends Options>(
  options: T,
  values: OptionValues<T>,
  cmdLine: CommandLine = getCmdLine(),
  flags: ParsingFlags = {},
): Promise<ParsingResult> {
  const registry = new OptionRegistry(options);
  const compIndex = flags?.compIndex ?? getCompIndex();
  const args = isString(cmdLine) ? getArgs(cmdLine, compIndex) : cmdLine;
  const context = createContext(registry, values, args, !!compIndex, flags);
  await parseArgs(context);
  const warning = context[5];
  return warning.length ? { warning } : {};
}

/**
 * Initializes the command-line arguments for parsing.
 * @param registry The option registry
 * @param values The option values
 * @param args The command-line arguments
 * @param completing True if performing completion
 * @param flags The parsing flags
 * @returns The parsing context
 */
function createContext(
  registry: OptionRegistry,
  values: OpaqueOptionValues,
  args: Array<string>,
  completing: boolean,
  flags: ParsingFlags,
): ParseContext {
  if (flags.progName === undefined) {
    flags.progName = process?.argv[1]?.split(regex.pathSep).at(-1);
  }
  if (!completing && flags.progName && process?.title) {
    process.title += ' ' + flags.progName;
  }
  for (const [key, option] of getEntries(registry.options)) {
    if (!(key in values) && (!isMessage(option.type) || option.saveMessage)) {
      values[key] = undefined;
    }
  }
  const specifiedKeys = new Set<string>();
  const warning = new WarnMessage();
  return [registry, values, args, specifiedKeys, completing, warning, flags];
}

//--------------------------------------------------------------------------------------------------
// Argument parsing
//--------------------------------------------------------------------------------------------------
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
    const option = registry.options[key];
    const name = option.names?.find((name): name is string => name !== null);
    return [key, option, name];
  }
  let i = index;
  const [registry, , args, , completing, , flags] = context;
  const prefix = flags.clusterPrefix;
  const cluster = args[i++];
  if (prefix === undefined || !cluster.startsWith(prefix) || cluster.length === prefix.length) {
    return false;
  }
  const letters = registry.letters;
  const rest = cluster.slice(prefix.length);
  const unknownIndex = [...rest].findIndex((letter) => !letters.has(letter));
  if (unknownIndex === 0) {
    return false; // do not consider it a cluster
  }
  if (unknownIndex > 0) {
    const name = getOpt(rest[0])[2];
    args.splice(index, 1, (name !== undefined ? name + '=' : '') + rest.slice(1));
    return true; // treat it as an inline parameter
  }
  for (let j = 0; j < rest.length && (!completing || i < args.length); ++j) {
    const letter = rest[j];
    const [, option, name] = getOpt(letter);
    const [min, max] = getParamCount(option);
    if (j < rest.length - 1 && (isCommand(option.type) || min < max)) {
      throw ErrorMessage.create(ErrorItem.invalidClusterOption, {}, letter);
    }
    if (name !== undefined) {
      args.splice(i++, 0, name);
    }
    i += min;
  }
  args.splice(index, 1); // remove cluster argument (to account for parameter count verification)
  return true;
}

/**
 * Parses the command-line arguments.
 * @param context The parsing context
 */
async function parseArgs(context: ParseContext) {
  const [registry, values, args, specifiedKeys, completing, warning] = context;
  let prev: ParseEntry = [-1];
  let min = 0; // param count
  let max = 0; // param count
  let suggestNames = false;
  for (let i = 0, k = 0; i < args.length; i = prev[0]) {
    const next = findNext(context, prev);
    const [j, info, value, comp, isMarker, isNew, isPositional] = next;
    if (isNew || !info) {
      if (prev[1]) {
        // process the previous sequence
        await tryParseParams(context, prev[1], i, args.slice(k, j)); // should return false
      }
      if (!info) {
        break; // finished
      }
      prev = next;
      const [key, option, name] = info;
      [min, max] = getParamCount(option);
      const hasValue = value !== undefined;
      if (!max || (!isPositional && (isMarker || checkInline(option, name) === false))) {
        if (comp) {
          throw new TextMessage();
        }
        if (hasValue) {
          if (completing) {
            // ignore disallowed inline parameters while completing
            prev[1] = undefined;
            prev[4] = false;
            continue;
          }
          const [alt, name2] = isMarker ? [1, `${option.positional}`] : [0, name];
          throw ErrorMessage.create(ErrorItem.disallowedInlineParameter, { alt }, getSymbol(name2));
        }
      }
      if (!completing && !specifiedKeys.has(key)) {
        if (option.deprecated !== undefined) {
          warning.add(ErrorItem.deprecatedOption, {}, getSymbol(name));
        }
        specifiedKeys.add(key);
      }
      if (!max) {
        // comp === false
        if (await handleNiladic(context, info, j, args.slice(j + 1))) {
          return; // skip requirements
        }
        prev[0] += Math.max(0, option.skipCount ?? 0);
        prev[1] = undefined;
        continue; // fetch more
      }
      if (!comp) {
        if (isMarker || isPositional || !hasValue) {
          // positional marker, first positional parameter or option name
          k = hasValue ? j : j + 1;
        } else {
          // option name with inline parameter
          await tryParseParams(context, info, j, [value]); // should return false
          prev[1] = undefined;
        }
        continue; // fetch more
      }
      // perform completion of first positional or inline parameter
      suggestNames = !!isPositional;
      k = j;
    }
    if (!info) {
      break; // finished
    }
    // comp === true
    const words = await completeParameter(values, info, i, args.slice(k, j), value);
    if (suggestNames || (j > i && j - k >= min)) {
      words.push(...completeName(registry, value));
    }
    throw new TextMessage(...words);
  }
  await checkRequired(context);
}

/**
 * Finds the start of the next sequence in the command-line arguments, or a word to complete.
 * If a sequence is found, it is a new option specification (but the option can be the same).
 * @param context The parsing context
 * @param prev The previous parse entry
 * @returns The new parse entry
 */
function findNext(context: ParseContext, prev: ParseEntry): ParseEntry {
  const [registry, , args, , completing, , flags] = context;
  const [prevIndex, , prevVal, , prevMarker] = prev;
  let [, prevInfo] = prev;
  const { names, positional, options } = registry;
  const inc = prevVal !== undefined ? 1 : 0;
  const prefix = flags.optionPrefix;
  const [min, max] = prevInfo ? getParamCount(prevInfo[1]) : [0, 0];
  for (let i = prevIndex + 1; i < args.length; ++i) {
    const arg = args[i];
    const comp = completing && i + 1 === args.length;
    const [name, value] = arg.split(regex.valSep, 2);
    const optionKey = names.get(name);
    const isForcedName = prefix && name.startsWith(prefix); // matches whole word as well
    const isParam = prevInfo && (prevMarker || i - prevIndex + inc <= min);
    const argType = isParam
      ? !isForcedName || prevMarker
        ? prevMarker && i - prevIndex + inc > max
          ? ArgType.afterMarker
          : ArgType.parameter
        : !optionKey
          ? ArgType.unknownOption
          : !completing
            ? ArgType.missingParameter
            : ArgType.optionName
      : optionKey
        ? ArgType.optionName
        : parseCluster(context, i)
          ? ArgType.cluster
          : prevInfo && i - prevIndex + inc <= max
            ? ArgType.parameter
            : positional && !isForcedName
              ? ArgType.positional
              : ArgType.unknownOption;
    switch (argType) {
      case ArgType.optionName: {
        if (comp && value === undefined) {
          throw new TextMessage(name);
        }
        const isMarker = name === positional?.[1].positional;
        const newInfo: OptionInfo | undefined = optionKey
          ? isMarker
            ? positional
            : [optionKey, options[optionKey], name]
          : undefined;
        return [i, newInfo, value, comp, isMarker, true, false];
      }
      case ArgType.cluster:
        if (comp) {
          throw new TextMessage();
        }
        i--; // the cluster argument was removed
        break; // the cluster argument was canonicalized
      case ArgType.unknownOption:
        if (comp) {
          throw new TextMessage(...completeName(registry, arg));
        }
        if (!completing) {
          reportUnknownName(context, name);
        }
        break; // ignore unknown options during completion
      case ArgType.positional:
        return [i, positional, arg, comp, false, true, true];
      case ArgType.afterMarker:
        return [i, prevInfo, arg, comp, prevMarker, true, true];
      case ArgType.parameter: {
        const [, option, name] = prevInfo!;
        if (checkInline(option, name) === 'always') {
          if (!completing) {
            // ignore required inline parameters while completing
            throw ErrorMessage.create(ErrorItem.missingInlineParameter, {}, getSymbol(name));
          }
          prevInfo = undefined;
          i--; // reprocess the current argument
        } else if (comp) {
          return [i, prevInfo, arg, comp, prevMarker, false];
        }
        break; // continue looking for parameters or option names
      }
      case ArgType.missingParameter:
        reportMissingParameter(min, max, prevInfo![2]);
    }
  }
  return [args.length];
}

/**
 * Reports a missing parameter to a non-niladic option.
 * @param min The minimum parameter count
 * @param max The maximum parameter count
 * @param name The unknown option name
 */
function reportMissingParameter(min: number, max: number, name: string): never {
  const [alt, val] = min === max ? [0, min] : isFinite(max) ? [2, [min, max]] : [1, min];
  const sep = config.connectives.and;
  const flags = { alt, sep, open: '', close: '', mergePrev: false };
  throw ErrorMessage.create(ErrorItem.missingParameter, flags, getSymbol(name), val);
}

/**
 * Reports an error of unknown option name.
 * @param context The parsing context
 * @param name The unknown option name
 */
function reportUnknownName(context: ParseContext, name: string): never {
  const similar = findSimilar(name, context[0].names.keys(), 0.6);
  const alt = similar.length ? 1 : 0;
  const sep = config.connectives.optionSep;
  throw ErrorMessage.create(
    ErrorItem.unknownOption,
    { alt, sep, open: '', close: '' },
    getSymbol(name),
    similar.map(getSymbol),
  );
}

/**
 * Completes an option name.
 * @param registry The option registry
 * @param prefix The name prefix, if any
 * @returns The completion words
 */
function completeName(registry: OptionRegistry, prefix?: string): Array<string> {
  const names = [...registry.names.keys()];
  return prefix ? names.filter((name) => name.startsWith(prefix)) : names;
}

/**
 * Completes an option parameter.
 * @param values The option values
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param prev The preceding parameters, if any
 * @param comp The word being completed
 * @returns The completion words
 */
async function completeParameter(
  values: OpaqueOptionValues,
  info: OptionInfo,
  index: number,
  prev: Array<string>,
  comp = '',
): Promise<Array<string>> {
  const [, option, name] = info;
  let words: Array<string>;
  if (option.complete) {
    try {
      // do not destructure `complete`, because the callback might need to use `this`
      words = (await option.complete(comp, { values, index, name, prev })) ?? [];
    } catch (_err) {
      // do not propagate errors during completion
      words = [];
    }
  } else {
    const { choices, normalize } = option;
    words = choices?.slice() ?? [];
    if (comp) {
      comp = normalize?.(comp) ?? comp;
      words = words.filter((word) => word.startsWith(comp));
    }
  }
  return words;
}

//--------------------------------------------------------------------------------------------------
// Parameter handling
//--------------------------------------------------------------------------------------------------
/**
 * Handles a non-niladic option, ignoring parsing errors when performing word completion.
 * @param context The parsing context
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param params The option parameters, if any
 * @returns True if the parsing loop should be broken
 */
async function tryParseParams(
  context: ParseContext,
  info: OptionInfo,
  index: number,
  params: Array<string>,
): Promise<boolean> {
  try {
    // use await here instead of return, in order to catch errors
    return await parseParams(context, info, index, params);
  } catch (err) {
    // do not propagate parsing errors during completion
    if (!context[4] || err instanceof TextMessage) {
      throw err;
    }
    return false;
  }
}

/**
 * Handles a non-niladic option.
 * @param context The parsing context
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param params The option parameter(s)
 * @returns True if the parsing loop should be broken
 */
async function parseParams(
  context: ParseContext,
  info: OptionInfo,
  index: number,
  params: Array<string>,
): Promise<boolean> {
  /** @ignore */
  function error(kind: ErrorItem, flags: FormattingFlags, ...args: Args) {
    return ErrorMessage.create(kind, flags, getSymbol(name), ...args);
  }
  /** @ignore */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parse1(param: any, def = param): unknown {
    // do not destructure `parse`, because the callback might need to use `this`
    return option.parse ? option.parse(param, seq) : def;
  }
  /** @ignore */
  function parse2(param: string): unknown {
    return mapping && param in mapping ? mapping[param] : parse1(param);
  }
  const [, values, , , comp] = context;
  const [key, option, name] = info;
  const breakLoop = !!option.break && !comp;
  const seq = { values, index, name, comp };
  const { type, regex, separator, append, choices, mapping, normalize } = option;

  // if index is NaN, we are in the middle of requirements checking (data comes from environment)
  if (index >= 0 && breakLoop) {
    await checkRequired(context);
  }
  if (type === 'flag') {
    values[key] = await parse1('', true);
    return breakLoop;
  }
  if (separator) {
    // only available for array options
    params = params.flatMap((param) => param.split(separator));
  }
  if (index >= 0) {
    const [min, max] = getParamCount(option);
    if (max > 0 && params.length < min) {
      // may happen when parsing the positional marker or when reaching the end of the command line
      // comp === false, otherwise completion would have taken place by now
      // params.length <= max, due to how the `findNext` function works
      reportMissingParameter(min, max, name);
    }
  }
  if (type === 'function') {
    values[key] = await parse1(params);
    return breakLoop;
  }
  if (normalize) {
    params = params.map(normalize);
  }
  if (regex) {
    const mismatch = params.find((param) => !regex.test(param));
    if (mismatch) {
      throw error(ErrorItem.regexConstraintViolation, {}, mismatch, regex);
    }
  }
  if (choices) {
    const mismatch = params.find((param) => !choices.includes(param));
    if (mismatch) {
      throw error(ErrorItem.choiceConstraintViolation, { open: '', close: '' }, mismatch, choices);
    }
  }
  if (type === 'single') {
    values[key] = await parse2(params[0]);
  } else {
    const prev = (append && (values[key] as Array<unknown>)) ?? [];
    // do not use `map` with `Promise.all`, because the promises need to be chained
    for (const param of params) {
      prev.push(await parse2(param));
    }
    values[key] = normalizeArray(option, name, prev);
  }
  return breakLoop;
}

/**
 * Normalizes the value of an array-valued option and checks the validity of its element count.
 * @template T The type of the array element
 * @param option The option definition
 * @param name The option name
 * @param value The option value
 * @returns The normalized array
 * @throws On value not satisfying the specified limit constraint
 */
function normalizeArray<T>(option: OpaqueOption, name: string, value: Array<T>): Array<T> {
  const { unique, limit } = option;
  if (unique) {
    const unique = new Set(value);
    value.length = 0; // reuse the same array
    value.push(...unique);
  }
  if (limit !== undefined && value.length > limit) {
    throw ErrorMessage.create(
      ErrorItem.limitConstraintViolation,
      {},
      getSymbol(name),
      value.length,
      limit,
    );
  }
  return value;
}

//--------------------------------------------------------------------------------------------------
// Niladic option handling
//--------------------------------------------------------------------------------------------------
/**
 * Handles a niladic option.
 * @param context The parsing context
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param rest The remaining command-line arguments
 * @returns True if the parsing loop should be broken
 */
async function handleNiladic(
  context: ParseContext,
  info: OptionInfo,
  index: number,
  rest: Array<string>,
): Promise<boolean> {
  const comp = context[4];
  switch (info[1].type) {
    case 'help':
    case 'version':
      // skip message-valued options during completion
      if (!comp) {
        await handleMessage(context, info, rest);
      }
      return !comp;
    case 'command':
      // skip requirements checking during completion
      if (!comp) {
        await checkRequired(context);
      }
      await handleCommand(context, info, index, rest);
      return true;
    default:
      // flag or function option: reuse non-niladic handling
      return await tryParseParams(context, info, index, rest);
  }
}

/**
 * Handles a command option.
 * @param context The parsing context
 * @param info The option information
 * @param index The starting index of the argument sequence
 * @param rest The remaining command-line arguments
 * @returns The result of parsing the command arguments
 */
async function handleCommand(
  context: ParseContext,
  info: OptionInfo,
  index: number,
  rest: Array<string>,
) {
  const [, values, , , comp, warning, flags] = context;
  const [key, option, name] = info;
  const { clusterPrefix, optionPrefix } = option;
  const cmdOptions = await getNestedOptions(option, flags.resolve);
  const cmdRegistry = new OptionRegistry(cmdOptions);
  const param: OpaqueOptionValues = {};
  const progName = flags.progName && flags.progName + ' ' + name;
  const cmdFlags: ParsingFlags = { progName, clusterPrefix, optionPrefix };
  const cmdContext = createContext(cmdRegistry, param, rest, comp, cmdFlags);
  await parseArgs(cmdContext);
  warning.push(...cmdContext[5]);
  const seq = { values, index, name, comp };
  // comp === false, otherwise completion will have taken place by now
  // do not destructure `parse`, because the callback might need to use `this`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values[key] = option.parse ? await option.parse(param as any, seq) : param;
}

/**
 * Handles a message-valued option.
 * @param context The parsing context
 * @param info The option information
 * @param rest The remaining command-line arguments
 * @throws The help or version message
 */
async function handleMessage(context: ParseContext, info: OptionInfo, rest: Array<string>) {
  const [, values] = context;
  const [key, option] = info;
  const message =
    option.type === 'help'
      ? await handleHelp(context, option, rest)
      : await handleVersion(context, option);
  if (option.saveMessage) {
    values[key] = message;
  } else {
    throw message;
  }
}

/**
 * Handles a help option.
 * @param context The parsing context
 * @param option The option definition
 * @param rest The remaining command-line arguments
 * @returns The help message
 */
async function handleHelp(
  context: ParseContext,
  option: OpaqueOption,
  rest: Array<string>,
): Promise<AnsiMessage> {
  let registry = context[0];
  let { progName } = context[6];
  if (option.useCommand && rest.length) {
    const cmdOpt = findValue(
      registry.options,
      (opt) => isCommand(opt.type) && !!opt.names?.includes(rest[0]),
    );
    if (cmdOpt?.options) {
      const cmdOptions = await getNestedOptions(cmdOpt, context[6].resolve);
      const helpOpt = findValue(cmdOptions, (opt) => opt.type === 'help');
      if (helpOpt) {
        registry = new OptionRegistry(cmdOptions);
        option = helpOpt;
        progName &&= progName + ' ' + rest.splice(0, 1)[0];
      }
    }
  }
  return format(registry.options, option.sections, option.useFilter && rest, progName);
}

/**
 * Resolve the version string of a version option.
 * @param context The parsing context
 * @param option The version option
 * @returns The version string
 */
async function handleVersion(context: ParseContext, option: OpaqueOption): Promise<string> {
  const { version } = option;
  if (!version?.endsWith('.json')) {
    return version ?? '';
  }
  const { resolve } = context[6];
  if (!resolve) {
    throw ErrorMessage.create(ErrorItem.missingResolveCallback);
  }
  const path = new URL(resolve(version));
  const data = await readFile(path);
  if (data !== undefined) {
    return JSON.parse(data).version;
  }
  throw ErrorMessage.create(ErrorItem.versionFileNotFound);
}

//--------------------------------------------------------------------------------------------------
// Requirements handling
//--------------------------------------------------------------------------------------------------
/**
 * Checks if required options were correctly specified.
 * This should only be called when completion is not in effect.
 * @param context The parsing context
 */
async function checkRequired(context: ParseContext) {
  const keys = getKeys(context[0].options);
  // TODO: we may need to serialize the following calls to avoid data races in client code
  await Promise.all(keys.map((key) => checkDefaultValue(context, key)));
  await Promise.all(keys.map((key) => checkRequiredOption(context, key)));
}

/**
 * Checks if there is an environment variable or default value for an option.
 * @param context The parsing context
 * @param key The option key
 * @returns A promise that must be awaited before continuing
 */
async function checkDefaultValue(context: ParseContext, key: string) {
  const [registry, values, , specifiedKeys] = context;
  if (specifiedKeys.has(key)) {
    return;
  }
  const option = registry.options[key];
  const { type, stdin, sources, preferredName, required } = option;
  const names: Array<0 | string | URL> = stdin ? [0] : [];
  names.push(...(sources ?? []));
  for (const name of names) {
    const param = isString(name) ? getEnv(name) : await readFile(name);
    if (param !== undefined) {
      await parseParams(context, [key, option, `${name}`], NaN, [param]);
      specifiedKeys.add(key);
      return;
    }
  }
  const name = preferredName ?? '';
  if (required) {
    throw ErrorMessage.create(ErrorItem.missingRequiredOption, {}, getSymbol(name));
  }
  if ('default' in option) {
    // do not destructure `default`, because the callback might need to use `this`
    const value = await (isFunction(option.default) ? option.default(values) : option.default);
    values[key] = type === 'array' && isArray(value) ? normalizeArray(option, name, value) : value;
  }
}

/**
 * Checks the requirements of an option.
 * @param context The parsing context
 * @param key The option key
 */
async function checkRequiredOption(context: ParseContext, key: string) {
  /** @ignore */
  function check(requires: Requires, negate: boolean, invert: boolean) {
    return checkRequires(context, option, requires, error, negate, invert);
  }
  const [registry, , , specifiedKeys] = context;
  const option = registry.options[key];
  const { preferredName, requires, requiredIf } = option;
  const specified = specifiedKeys.has(key);
  const error = new AnsiString();
  if (
    (specified && requires && !(await check(requires, false, false))) ||
    (!specified && requiredIf && !(await check(requiredIf, true, true)))
  ) {
    const name = preferredName ?? '';
    const kind = specified
      ? ErrorItem.unsatisfiedRequirement
      : ErrorItem.unsatisfiedCondRequirement;
    throw ErrorMessage.create(kind, {}, getSymbol(name), error);
  }
}

/**
 * Checks the requirements of an option that was specified.
 * @param context The parsing context
 * @param option The option definition
 * @param requires The option requirements
 * @param error The ANSI string error
 * @param negate True if the requirements should be negated
 * @param invert True if the requirements should be inverted
 * @returns True if the requirements were satisfied
 */
function checkRequires(
  context: ParseContext,
  option: OpaqueOption,
  requires: Requires,
  error: AnsiString,
  negate: boolean,
  invert: boolean,
): Promise<boolean> {
  /** @ignore */
  function checkItems<T>(items: Array<T>, checkFn: RequireItemFn<T>, and: boolean) {
    return checkRequireItems(context, option, items, checkFn, error, negate, invert, and);
  }
  return visitRequirements(
    requires,
    (req) =>
      Promise.resolve(checkRequiresEntry(context, option, [req, undefined], error, negate, invert)),
    (req) => checkRequires(context, option, req.item, error, !negate, invert),
    (req) => checkItems(req.items, checkRequires, !negate),
    (req) => checkItems(req.items, checkRequires, negate),
    (req) => checkItems(getEntries(req), checkRequiresEntry, !negate),
    (req) => checkRequirementCallback(context, option, req, error, negate, invert),
  );
}

/**
 * Checks if a required option was specified with correct values.
 * @param context The parsing context
 * @param _option The requiring option definition
 * @param entry The required option key and value
 * @param error The ANSI string error
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @returns True if the requirement was satisfied
 */
function checkRequiresEntry(
  context: ParseContext,
  _option: OpaqueOption,
  entry: RequiresEntry,
  error: AnsiString,
  negate: boolean,
  invert: boolean,
): boolean {
  const [registry, values, , specifiedKeys] = context;
  const [key, expected] = entry;
  const actual = values[key];
  const option = registry.options[key];
  const specified = specifiedKeys.has(key) || actual !== undefined; // consider default values
  const required = expected !== null;
  const name = option.preferredName ?? '';
  const { connectives } = config;
  if (!specified || !required || expected === undefined) {
    if ((specified === required) !== negate) {
      return true;
    }
    if (specified !== invert) {
      error.word(connectives.no);
    }
    fmt.m(Symbol.for(name), error, {});
    return false;
  }
  if (areEqual(actual, expected) !== negate) {
    return true;
  }
  const connective = negate !== invert ? connectives.notEquals : connectives.equals;
  fmt.m(Symbol.for(name), error, {});
  error.word(connective);
  fmt.v(expected, error, {});
  return false;
}

/**
 * Checks the items of a requirement expression or object.
 * @param context The parsing context
 * @param option The option definition
 * @param items The list of requirement items
 * @param itemFn The callback to execute on each item
 * @param error The ANSI string error
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @param and If true, return on the first error; else return on the first success
 * @returns True if the requirement was satisfied
 */
async function checkRequireItems<T>(
  context: ParseContext,
  option: OpaqueOption,
  items: Array<T>,
  itemFn: RequireItemFn<T>,
  error: AnsiString,
  negate: boolean,
  invert: boolean,
  and: boolean,
): Promise<boolean> {
  const { connectives } = config;
  const connective = invert ? connectives.and : connectives.or;
  if (!and && items.length > 1) {
    error.open(connectives.exprOpen);
  }
  let first = true;
  for (const item of items) {
    if (and || first) {
      first = false;
    } else {
      error.word(connective);
    }
    const success = await itemFn(context, option, item, error, negate, invert);
    if (success !== and) {
      return success;
    }
  }
  if (and) {
    return true;
  }
  if (items.length > 1) {
    error.close(connectives.exprClose);
  }
  return false;
}

/**
 * Checks the result of a requirement callback.
 * @param context The parsing context
 * @param option The option definition
 * @param callback The requirement callback
 * @param error The ANSI string error
 * @param negate True if the requirements should be negated
 * @param invert True if the requirements should be inverted
 * @returns True if the requirements were satisfied
 */
async function checkRequirementCallback(
  context: ParseContext,
  option: OpaqueOption,
  callback: RequirementCallback,
  error: AnsiString,
  negate: boolean,
  invert: boolean,
): Promise<boolean> {
  const [, values] = context;
  const result = await callback.bind(option)(values);
  if (result === negate) {
    if (negate !== invert) {
      error.word(config.connectives.not);
    }
    fmt.v(callback, error, {});
    return false;
  }
  return true;
}
