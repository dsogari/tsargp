//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  Options,
  OptionValues,
  InternalOptionValues,
  Requires,
  RequiresVal,
  CompleteCallback,
  ResolveCallback,
  Option,
} from './options';
import type { OptionInfo, ConcreteConfig, ValidatorConfig } from './validator';

import { ErrorItem } from './enums';
import { HelpFormatter } from './formatter';
import {
  RequiresAll,
  RequiresNot,
  RequiresOne,
  isArray,
  isVariadic,
  isNiladic,
  isValued,
  isString,
  isBoolean,
  isUnknown,
} from './options';
import {
  Message,
  ErrorMessage,
  WarnMessage,
  VersionMessage,
  CompletionMessage,
  TerminalString,
  FormatConfig,
} from './styles';
import { OptionValidator, defaultConfig } from './validator';
import { format } from './styles';
import { assert, checkRequiredArray, getArgs, isTrue } from './utils';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The kind of current argument in the parser loop.
 */
const enum ArgKind {
  marker,
  positional,
  inline,
  param,
}

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * The parse configuration.
 */
export type ParseConfig = {
  /**
   * The program name.
   */
  readonly progName?: string;
  /**
   * The completion index of a raw command line.
   */
  readonly compIndex?: number;
  /**
   * True if the first argument is expected to be an option cluster (i.e., short-option style).
   */
  readonly shortStyle?: true;
};

/**
 * The parse result.
 */
export type ParseResult = {
  /**
   * A list of promises that resolve the async callbacks. Can be ignored if empty.
   */
  readonly promises: Array<Promise<void>>;
  /**
   * A list of warnings generated by the parser. Can be ignored if empty.
   */
  readonly warnings: WarnMessage;
};

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
  constructor(options: T, config: ValidatorConfig = {}) {
    const concreteConfig: ConcreteConfig = {
      styles: Object.assign({}, defaultConfig.styles, config.styles),
      phrases: Object.assign({}, defaultConfig.phrases, config.phrases),
    };
    this.validator = new OptionValidator(options, concreteConfig);
  }

  /**
   * Validates the option definitions. This should only be called during development and in unit
   * tests, but should be skipped in production.
   * @returns A list of validation warnings
   */
  validate(): WarnMessage {
    return this.validator.validate();
  }

  /**
   * Convenience method to parse command-line arguments into option values.
   * @param command The raw command line or command-line arguments
   * @param config The parse configuration
   * @returns The options' values
   */
  parse(command?: string | Array<string>, config?: ParseConfig): OptionValues<T> {
    const values = {} as OptionValues<T>;
    this.doParse(values, command, config);
    return values;
  }

  /**
   * Async version. Use this if the option definitions contain async callbacks.
   * @param command The raw command line or command-line arguments
   * @param config The parse configuration
   * @returns A promise that resolves to the options' values
   */
  async parseAsync(
    command?: string | Array<string>,
    config?: ParseConfig,
  ): Promise<OptionValues<T>> {
    const values = {} as OptionValues<T>;
    await Promise.all(this.doParse(values, command, config).promises);
    return values;
  }

  /**
   * Parses command-line arguments into option values.
   * @param values The options' values to parse into
   * @param command The raw command line or command-line arguments
   * @param config The parse configuration
   * @returns A promise that can be awaited in order to resolve async callbacks
   */
  parseInto(
    values: OptionValues<T>,
    command?: string | Array<string>,
    config?: ParseConfig,
  ): Promise<Array<void>> {
    return Promise.all(this.doParse(values, command, config).promises);
  }

  /**
   * Parses command-line arguments into option values.
   * @param values The options' values to parse into
   * @param command The raw command line or command-line arguments
   * @param config The parse configuration
   * @returns The parse result
   */
  doParse(
    values: OptionValues<T>,
    command?: string | Array<string>,
    config?: ParseConfig,
  ): ParseResult {
    const { promises, warnings } = createLoop(this.validator, values, command, config).loop();
    return { promises, warnings };
  }

  /**
   * Tries to parse command-line arguments into option values.
   * @param values The options' values to parse into
   * @param command The raw command line or command-line arguments
   * @param config The parse configuration
   * @returns The parse error or message, if any
   */
  async tryParse(
    values: OptionValues<T>,
    command?: string | Array<string>,
    config?: ParseConfig,
  ): Promise<Error | Message | null> {
    try {
      const { promises, warnings } = this.doParse(values, command, config);
      await Promise.all(promises);
      return warnings.length ? warnings : null;
    } catch (err) {
      return err as Error | Message;
    }
  }
}

/**
 * Implements the parsing loop.
 */
class ParserLoop {
  private readonly specifiedKeys = new Set<string>();
  readonly promises = new Array<Promise<void>>();
  readonly warnings = new WarnMessage();

  /**
   * Creates a parser loop.
   * @param validator The option validator
   * @param values The option values
   * @param args The command-line arguments
   * @param completing True if performing completion
   * @param progName The program name, if any
   * @param shortStyle True if the first argument is expected to be an option cluster
   */
  constructor(
    private readonly validator: OptionValidator,
    private readonly values: InternalOptionValues,
    private readonly args: Array<string>,
    private readonly completing: boolean,
    private readonly progName?: string,
    shortStyle = false,
  ) {
    if (!completing && progName && process?.title) {
      process.title += ' ' + progName;
    }
    for (const key in validator.options) {
      if (!(key in values)) {
        const option = validator.options[key];
        if (isValued(option)) {
          values[key] = undefined;
        }
      }
    }
    if (shortStyle) {
      parseCluster(validator, args);
    }
  }

  /**
   * Loops through the command-line arguments.
   * @returns The parser loop instance
   */
  loop(): this {
    /** @ignore */
    function suggestName(option: Option): boolean {
      return (
        argKind === ArgKind.positional ||
        (argKind === ArgKind.param && isArray(option) && isVariadic(option))
      );
    }

    let argKind: ArgKind | undefined;
    let singleParam = false;
    let value: string | undefined;
    let current: OptionInfo | undefined;

    for (let i = 0; i < this.args.length; ++i) {
      const [arg, comp] = this.args[i].split('\0', 2);
      if (argKind === ArgKind.marker || singleParam) {
        value = arg;
      } else {
        [argKind, current, value] = parseOption(this.validator, arg, comp !== undefined, current);
        if (argKind !== ArgKind.param) {
          if (!this.specifiedKeys.has(current.key)) {
            if (current.option.deprecated) {
              const warning = this.validator.format(ErrorItem.deprecatedOption, {
                o: current.name,
              });
              this.warnings.push(warning);
            }
            this.specifiedKeys.add(current.key);
          }
          if (isArray(current.option)) {
            resetValue(this.values, current.key, current.option);
          }
        }
      }
      assert(current);
      const { key, name, option } = current;
      if (isNiladic(option)) {
        if (comp !== undefined) {
          // assert(value !== undefined);
          throw new CompletionMessage();
        } else if (!this.completing && value !== undefined) {
          throw this.validator.error(ErrorItem.disallowedInlineValue, { o: name }, { alt: 0 });
        } else if (this.handleNiladic(key, option, name, i)) {
          return this;
        }
        current = undefined;
      } else if (comp !== undefined) {
        if (option.complete) {
          this.handleComplete(option.complete, i, value);
          return this;
        }
        handleCompletion(option, value);
        if (suggestName(option)) {
          handleNameCompletion(this.validator, value);
        }
        throw new CompletionMessage();
      } else if (value !== undefined) {
        try {
          parseValue(this.validator, this.values, key, option, name, value);
        } catch (err) {
          // do not propagate errors during completion
          if (!this.completing) {
            if (err instanceof ErrorMessage && suggestName(option)) {
              handleUnknown(this.validator, value, err);
            }
            throw err;
          }
        }
        if (singleParam) {
          singleParam = false;
          current = undefined;
        }
      } else if (isArray(option) && isVariadic(option)) {
        continue;
      } else if (i + 1 == this.args.length) {
        throw this.validator.error(ErrorItem.missingParameter, { o: name });
      } else if (argKind !== ArgKind.marker) {
        singleParam = true;
      }
    }
    // assert(!this.completing);
    this.checkRequired();
    return this;
  }

  /**
   * Handles a niladic option.
   * @param key The option key
   * @param option The option definition
   * @param name The option name (as specified in the command-line)
   * @param index The current argument index
   * @returns True if the parsing loop should be broken
   */
  private handleNiladic(key: string, option: Option, name: string, index: number): boolean {
    switch (option.type) {
      case 'flag':
        this.values[key] = !option.negationNames?.includes(name);
        return false;
      case 'function':
        return this.handleFunction(key, option, index);
      case 'command':
        return this.handleCommand(key, option, name, index);
      default:
        return this.handleSpecial(option, index);
    }
  }

  /**
   * Handles a function option.
   * @param key The option key
   * @param option The option definition
   * @param index The current argument index
   * @returns True if the parsing loop should be broken
   */
  private handleFunction(key: string, option: Option, index: number): boolean {
    const result = !!option.break && !this.completing;
    if (result) {
      this.checkRequired();
    }
    try {
      const result = option.exec(this.values, this.completing, this.args.slice(index + 1));
      if (!this.completing && option.skipCount) {
        this.args.splice(index + 1, Math.max(0, option.skipCount));
      }
      if (result instanceof Promise) {
        this.promises.push(
          result.then(
            (val) => {
              this.values[key] = val;
            },
            (err) => {
              // do not propagate errors during completion
              if (!this.completing) {
                throw err;
              }
            },
          ),
        );
      } else {
        this.values[key] = result;
      }
    } catch (err) {
      // do not propagate errors during completion
      if (!this.completing) {
        throw err;
      }
    }
    return result;
  }

  /**
   * Handles a command option.
   * @param key The option key
   * @param option The option definition
   * @param name The option name (as specified in the command-line)
   * @param index The current argument index
   * @returns True to break parsing loop (always)
   */
  private handleCommand(key: string, option: Option, name: string, index: number): true {
    if (!this.completing) {
      this.checkRequired();
    }
    const values: InternalOptionValues = {};
    const options = typeof option.options === 'function' ? option.options() : option.options;
    const validator = new OptionValidator(options, this.validator.config);
    const loop = new ParserLoop(
      validator,
      values,
      this.args.slice(index + 1),
      this.completing,
      name,
      option.shortStyle,
    ).loop();
    this.promises.push(...loop.promises);
    if (!this.completing) {
      const result = option.cmd(this.values, values);
      if (result instanceof Promise) {
        this.promises.push(
          result.then((val) => {
            this.values[key] = val;
          }),
        );
      } else {
        this.values[key] = result;
      }
    }
    return true;
  }

  /**
   * Handles a special option.
   * @param option The option definition
   * @param index The current argument index
   * @returns True if the parsing loop should be broken
   */
  private handleSpecial(option: Option, index: number): boolean {
    if (this.completing) {
      return false; // skip special options during completion
    }
    if (option.type === 'help') {
      const filters =
        option.useFilters && this.args.slice(index + 1).map((arg) => RegExp(arg, 'i'));
      const formatter = new HelpFormatter(this.validator, option.format, filters);
      const sections = option.sections ?? [
        { type: 'usage', title: 'Usage:', indent: 2 },
        { type: 'groups', title: 'Options', phrase: '%s:' },
      ];
      throw formatter.formatSections(sections, this.progName);
    } else if (option.version) {
      throw new VersionMessage(option.version);
    } else if (option.resolve) {
      const promise = resolveVersion(this.validator, option.resolve);
      this.promises.push(promise);
    }
    return true;
  }

  /**
   * Handles the completion of an option that has a completion callback.
   * @param complete The completion callback
   * @param index The current argument index
   * @param param The option parameter, if any
   */
  private handleComplete(complete: CompleteCallback, index: number, param: string = '') {
    let result;
    try {
      result = complete(this.values, param, this.args.slice(index + 1));
    } catch (err) {
      // do not propagate errors during completion
      throw new CompletionMessage();
    }
    if (Array.isArray(result)) {
      throw new CompletionMessage(...result);
    }
    const promise = result.then(
      (words) => {
        throw new CompletionMessage(...words);
      },
      () => {
        // do not propagate errors during completion
        throw new CompletionMessage();
      },
    );
    this.promises.push(promise);
  }

  /**
   * Checks if required options were correctly specified.
   * Sets option values to their env. var. or default value, if not previously set.
   * This should only be called when completion is not in effect.
   */
  private checkRequired() {
    for (const key in this.validator.options) {
      if (!this.specifiedKeys.has(key)) {
        const option = this.validator.options[key];
        if (checkEnvVar(this.validator, this.values, option, key)) {
          this.specifiedKeys.add(key); // need this for checking requirements in the second loop
          continue;
        }
        const name = option.preferredName ?? '';
        if (option.required) {
          throw this.validator.error(ErrorItem.missingRequiredOption, { o: name });
        }
        if (option.requiredIf) {
          const error = new TerminalString();
          if (!this.checkRequires(option.requiredIf, error, true, true)) {
            throw this.validator.error(ErrorItem.unsatisfiedCondRequirement, { o: name, p: error });
          }
        }
        if ('default' in option) {
          setDefaultValue(this.validator, this.values, key, option);
        }
      }
    }
    for (const key of this.specifiedKeys) {
      const option = this.validator.options[key];
      if (option.requires) {
        const error = new TerminalString();
        if (!this.checkRequires(option.requires, error, false, false)) {
          const name = option.preferredName ?? '';
          throw this.validator.error(ErrorItem.unsatisfiedRequirement, { o: name, p: error });
        }
      }
    }
  }

  /**
   * Checks the requirements of an option that was specified.
   * @param requires The option requirements
   * @param error The terminal string error
   * @param negate True if the requirements should be negated
   * @param invert True if the requirements should be inverted
   * @returns True if the requirements were satisfied
   */
  private checkRequires(
    requires: Requires,
    error: TerminalString,
    negate: boolean,
    invert: boolean,
  ): boolean {
    if (typeof requires === 'string') {
      return this.checkRequirement([requires, undefined], error, negate, invert);
    }
    if (requires instanceof RequiresNot) {
      return this.checkRequires(requires.item, error, !negate, invert);
    }
    if (requires instanceof RequiresAll || requires instanceof RequiresOne) {
      const and = requires instanceof RequiresAll !== negate;
      const itemFn = this.checkRequires.bind(this);
      return checkRequireItems(requires.items, itemFn, error, negate, invert, and);
    }
    if (typeof requires === 'object') {
      const entries = Object.entries(requires);
      const itemFn = this.checkRequirement.bind(this);
      return checkRequireItems(entries, itemFn, error, negate, invert, !negate);
    }
    if (requires(this.values) == negate) {
      if (negate != invert) {
        error.addWord('not');
      }
      const styles = this.validator.config.styles;
      format.v(requires, styles, error);
      return false;
    }
    return true;
  }

  /**
   * Checks if a required option was specified with correct values.
   * @param kvp The required option key and value
   * @param error The terminal string error
   * @param negate True if the requirement should be negated
   * @param invert True if the requirements should be inverted
   * @returns True if the requirement was satisfied
   */
  private checkRequirement(
    kvp: [key: string, value: RequiresVal[string]],
    error: TerminalString,
    negate: boolean,
    invert: boolean,
  ): boolean {
    const [key, value] = kvp;
    const option = this.validator.options[key];
    const specified = this.specifiedKeys.has(key);
    const required = value !== null;
    if (isUnknown(option) || !specified || !required || value === undefined) {
      if ((specified == required) != negate) {
        return true;
      }
      if (specified != invert) {
        error.addWord('no');
      }
      const name = option.preferredName ?? '';
      const styles = this.validator.config.styles;
      format.o(name, styles, error);
      return false;
    }
    return checkRequiredValue(
      this.validator,
      this.values,
      option,
      negate,
      invert,
      key,
      value,
      error,
    );
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Parses the first argument which is expected to be an option cluster.
 * @param validator The option validator
 * @param args The command-line arguments
 */
function parseCluster(validator: OptionValidator, args: Array<string>) {
  const cluster = args.shift();
  if (!cluster) {
    return;
  }
  for (let j = 0, i = 0; j < cluster.length; ++j) {
    const letter = cluster[j];
    if (letter === '-' && j == 0) {
      continue; // skip the first dash in the cluster
    }
    if (letter === '\0') {
      throw new CompletionMessage();
    }
    const key = validator.letters.get(letter);
    if (!key) {
      throw validator.error(ErrorItem.unknownOption, { o1: letter }, { alt: 0 });
    }
    const option = validator.options[key];
    if (
      j < cluster.length - 1 &&
      (option.type === 'command' || (isArray(option) && isVariadic(option)))
    ) {
      throw validator.error(ErrorItem.invalidClusterOption, { o: letter });
    }
    const name = option.names?.find((name) => name);
    if (!name) {
      continue; // skip options with no names
    }
    args.splice(i, 0, name);
    i += isNiladic(option) ? 1 : 2;
  }
}

/**
 * Checks if the environment variable of an option is present, and reads its value.
 * @param validator The option validator
 * @param values The options' values to parse into
 * @param option The option definition
 * @param key The option key
 * @returns True if the environment variable was found
 */
function checkEnvVar(
  validator: OptionValidator,
  values: InternalOptionValues,
  option: Option,
  key: string,
): boolean {
  if (option.envVar) {
    const value = process?.env[option.envVar];
    if (value) {
      if (option.type === 'flag') {
        values[key] = isTrue(value);
      } else {
        if (isArray(option)) {
          resetValue(values, key, option);
        }
        parseValue(validator, values, key, option, option.envVar, value);
      }
      return true;
    }
  }
  return false;
}

/**
 * Creates a parser loop.
 * @param validator The option validator
 * @param values The options' values to parse into
 * @param command The raw command line or command-line arguments
 * @param config The parse configuration
 * @returns The parser loop instance
 */
function createLoop(
  validator: OptionValidator,
  values: InternalOptionValues,
  command = process?.env['COMP_LINE'] ?? process?.argv.slice(2) ?? [],
  config: ParseConfig = { compIndex: Number(process?.env['COMP_POINT']) },
): ParserLoop {
  let args, progName;
  if (typeof command === 'string') {
    [progName, ...args] = getArgs(command, config.compIndex);
  } else {
    [progName, args] = [config.progName, command];
    if (progName === undefined) {
      progName = process?.argv[1].split(/[\\/]/).at(-1);
    }
  }
  const completing = (config.compIndex ?? -1) >= 0;
  return new ParserLoop(validator, values, args, completing, progName, config.shortStyle);
}

/**
 * Parses an option from a command-line argument.
 * @param validator The option validator
 * @param arg The current argument
 * @param comp True if completing at the current iteration
 * @param current The current option information, if any
 * @returns A tuple of [ArgKind, current, value]
 */
function parseOption(
  validator: OptionValidator,
  arg: string,
  comp: boolean,
  current?: OptionInfo,
): [ArgKind, OptionInfo, string | undefined] {
  const [name, value] = arg.split(/=(.*)/, 2);
  const key = validator.names.get(name);
  if (key) {
    if (comp && value === undefined) {
      throw new CompletionMessage(name);
    }
    if (validator.positional && name === validator.positional.marker) {
      if (comp) {
        throw new CompletionMessage();
      }
      if (value !== undefined) {
        throw validator.error(ErrorItem.disallowedInlineValue, { o: name }, { alt: 1 });
      }
      return [ArgKind.marker, validator.positional, undefined];
    }
    current = { key, name, option: validator.options[key] };
    return [ArgKind.inline, current, value];
  }
  if (!current) {
    if (!validator.positional) {
      if (comp) {
        handleNameCompletion(validator, arg);
      }
      handleUnknown(validator, name);
    }
    return [ArgKind.positional, validator.positional, arg];
  }
  return [ArgKind.param, current, arg];
}

/**
 * Resolve a package version using a module-resolve function.
 * @param validator The option validator
 * @param resolve The resolve callback
 */
async function resolveVersion(
  validator: OptionValidator,
  resolve: ResolveCallback,
): Promise<never> {
  const { promises } = await import('fs');
  for (
    let path = './package.json', lastResolved = '', resolved = resolve(path);
    resolved != lastResolved;
    path = '../' + path, lastResolved = resolved, resolved = resolve(path)
  ) {
    try {
      const jsonData = await promises.readFile(new URL(resolved));
      const { version } = JSON.parse(jsonData.toString());
      throw new VersionMessage(version);
    } catch (err) {
      if ((err as ErrnoException).code != 'ENOENT') {
        throw err;
      }
    }
  }
  throw validator.error(ErrorItem.missingPackageJson);
}

/**
 * Handles the completion of an option with a parameter.
 * @param option The option definition
 * @param param The option parameter
 */
function handleCompletion(option: Option, param?: string) {
  let words =
    option.type === 'boolean'
      ? ['true', 'false']
      : option.enums
        ? option.enums.map((val) => `${val}`)
        : [];
  if (words.length && param) {
    words = words.filter((word) => word.startsWith(param));
  }
  if (words.length) {
    throw new CompletionMessage(...words);
  }
}

/**
 * Handles an unknown option.
 * @param validator The option validator
 * @param name The unknown option name
 * @param err The previous error message, if any
 */
function handleUnknown(validator: OptionValidator, name: string, err?: ErrorMessage): never {
  const similar = validator.findSimilarNames(name, 0.6);
  const [args, alt] = similar.length ? [{ o1: name, o2: similar }, 1] : [{ o1: name }, 0];
  const config: FormatConfig = { alt, brackets: ['[', ']'], sep: ',' };
  if (err) {
    err.msg.push(validator.format(ErrorItem.parseError, args, config));
  } else {
    err = validator.error(ErrorItem.unknownOption, args, config);
  }
  throw err;
}

/**
 * Handles the completion of an option name.
 * @param validator The option validator
 * @param prefix The name prefix, if any
 */
function handleNameCompletion(validator: OptionValidator, prefix?: string): never {
  const names = [...validator.names.keys()];
  const prefixedNames = prefix ? names.filter((name) => name.startsWith(prefix)) : names;
  throw new CompletionMessage(...prefixedNames);
}

/**
 * Checks the items of a requirement expression or object.
 * @param items The list of requirement items
 * @param itemFn The callback to execute on each item
 * @param error The terminal string error
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @param and If true, return on the first error; else return on the first success
 * @returns True if the requirement was satisfied
 */
function checkRequireItems<T>(
  items: Array<T>,
  itemFn: (item: T, error: TerminalString, negate: boolean, invert: boolean) => boolean,
  error: TerminalString,
  negate: boolean,
  invert: boolean,
  and: boolean,
): boolean {
  if (!and && items.length > 1) {
    error.addOpening('(');
  }
  let first = true;
  for (const item of items) {
    if (and || first) {
      first = false;
    } else {
      error.addWord(invert ? 'and' : 'or');
    }
    const success = itemFn(item, error, negate, invert);
    if (success !== and) {
      return success;
    }
  }
  if (and) {
    return true;
  }
  if (items.length > 1) {
    error.addClosing(')');
  }
  return false;
}

/**
 * Parses the value of an array option parameter.
 * @template T The type of the option value
 * @param validator The option validator
 * @param values The option values
 * @param key The option key
 * @param option The option definition
 * @param name The option name (as specified on the command-line)
 * @param value The parameter value
 * @param convertFn The function to convert from string
 */
function parseArray<T extends string | number>(
  validator: OptionValidator,
  values: InternalOptionValues,
  key: string,
  option: Option,
  name: string,
  value: string,
  convertFn: (value: string) => T,
) {
  /** @ignore */
  function norm<T>(val: T) {
    return validator.normalize(option, name, val);
  }
  /** @ignore */
  function append(vals: Array<T>) {
    return function (prev: Array<T>) {
      prev.push(...vals.map(norm));
      return validator.normalize(option, name, prev);
    };
  }
  let result: Array<T> | Promise<Array<T>>;
  let previous = values[key] as typeof result;
  const vals = option.separator ? value.split(option.separator) : [value];
  if (option.parse) {
    let prevSync: Array<T> = [];
    for (const val of vals) {
      const res = option.parse(values, name, val);
      if (res instanceof Promise) {
        const copy = prevSync; // save the reference for the closure
        const prev = previous; // save the reference for the closure
        previous = res.then(async (val) => append([...copy, val as T])(await prev));
        prevSync = []; // reset for incoming values
      } else {
        prevSync.push(res as T);
      }
    }
    result =
      previous instanceof Promise
        ? prevSync.length
          ? previous.then(append(prevSync))
          : previous
        : prevSync;
  } else {
    result = vals.map(convertFn);
  }
  values[key] =
    result instanceof Promise
      ? result
      : previous instanceof Promise
        ? previous.then(append(result))
        : append(result)(previous);
}

/**
 * Parses the value of a single-valued option parameter.
 * @template T The type of the option value
 * @param validator The option validator
 * @param values The option values
 * @param key The option key
 * @param option The option definition
 * @param name The option name (as specified on the command-line)
 * @param value The parameter value
 * @param convertFn The function to convert from string
 */
function parseSingle<T extends boolean | string | number>(
  validator: OptionValidator,
  values: InternalOptionValues,
  key: string,
  option: Option,
  name: string,
  value: string,
  convertFn: (value: string) => T,
) {
  const result = option.parse ? option.parse(values, name, value) : convertFn(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSingle(validator, values, key, option, name, result as any);
}

/**
 * Gets the value of a single-valued option parameter.
 * @template T The type of the option value
 * @param validator The option validator
 * @param values The option values
 * @param key The option key
 * @param option The option definition
 * @param name The option name (as specified on the command-line)
 * @param value The parameter value
 */
function setSingle<T extends boolean | string | number>(
  validator: OptionValidator,
  values: InternalOptionValues,
  key: string,
  option: Option,
  name: string,
  value: T | Promise<T>,
) {
  values[key] =
    value instanceof Promise
      ? value.then((val) => validator.normalize(option, name, val))
      : validator.normalize(option, name, value);
}

/**
 * Gets the value of an array-valued option parameter.
 * @template T The type of the option value
 * @param validator The option validator
 * @param values The option values
 * @param key The option key
 * @param option The option definition
 * @param name The option name (as specified on the command-line)
 * @param value The parameter value
 */
function setArray<T extends string | number>(
  validator: OptionValidator,
  values: InternalOptionValues,
  key: string,
  option: Option,
  name: string,
  value: ReadonlyArray<T> | Promise<ReadonlyArray<T>>,
) {
  /** @ignore */
  function norm<T>(val: T) {
    return validator.normalize(option, name, val);
  }
  values[key] =
    value instanceof Promise ? value.then((vals) => norm(vals.map(norm))) : norm(value.map(norm));
}

/**
 * Parses the value of an option parameter.
 * @param validator The option validator
 * @param values The option values
 * @param key The option key
 * @param option The option definition
 * @param name The option name (as specified on the command-line)
 * @param value The parameter value
 */
function parseValue(
  validator: OptionValidator,
  values: InternalOptionValues,
  key: string,
  option: Option,
  name: string,
  value: string,
) {
  const parseFn = isArray(option) ? parseArray : parseSingle;
  const convertFn =
    option.type === 'boolean'
      ? isTrue
      : option.type === 'string' || option.type === 'strings'
        ? (str: string) => str
        : Number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (parseFn as any)(validator, values, key, option, name, value, convertFn);
}

/**
 * Resets the value of an array option.
 * @param values The option values
 * @param key The option key
 * @param option The option definition
 */
function resetValue(values: InternalOptionValues, key: string, option: Option) {
  if (!option.append || values[key] === undefined) {
    values[key] = [];
  }
}

/**
 * Checks the required value of a single-parameter option against a specified value.
 * @template T The type of the option value
 * @param validator The option validator
 * @param values The option values
 * @param option The option definition
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @param key The required option key
 * @param value The required value
 * @param error The terminal string error
 * @param spec The formatting specification
 * @returns True if the requirement was satisfied
 */
function checkSingle<T extends boolean | string | number>(
  validator: OptionValidator,
  values: InternalOptionValues,
  option: Option,
  negate: boolean,
  invert: boolean,
  key: string,
  value: T,
  error: TerminalString,
  spec: string,
): boolean {
  const actual = values[key] as T | Promise<T>;
  if (actual instanceof Promise) {
    return true; // ignore promises during requirement checking
  }
  const name = option.preferredName ?? '';
  const expected = validator.normalize(option, name, value);
  if ((actual === expected) !== negate) {
    return true;
  }
  const styles = validator.config.styles;
  format.o(name, styles, error);
  error.addWord(negate != invert ? '!=' : '=');
  error.formatArgs(styles, `%${spec}`, { [spec]: expected });
  return false;
}

/**
 * Checks the required value of an array option against a specified value.
 * @template T The type of the option value
 * @param validator The option validator
 * @param values The option values
 * @param option The option definition
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @param key The required option key
 * @param value The required value
 * @param error The terminal string error
 * @param spec The formatting specification
 * @returns True if the requirement was satisfied
 */
function checkArray<T extends string | number>(
  validator: OptionValidator,
  values: InternalOptionValues,
  option: Option,
  negate: boolean,
  invert: boolean,
  key: string,
  value: ReadonlyArray<T>,
  error: TerminalString,
  spec: string,
): boolean {
  const actual = values[key] as Array<T> | Promise<Array<T>>;
  if (actual instanceof Promise) {
    return true; // ignore promises during requirement checking
  }
  const name = option.preferredName ?? '';
  const expected = value.map((val) => validator.normalize(option, name, val));
  if (checkRequiredArray(actual, expected, negate, option.unique === true)) {
    return true;
  }
  const styles = validator.config.styles;
  format.o(name, styles, error);
  error.addWord(negate != invert ? '!=' : '=');
  error.formatArgs(styles, `%${spec}`, { [spec]: expected });
  return false;
}

/**
 * Checks an option's required value against a specified value.
 * @param validator The option validator
 * @param values The option values
 * @param option The option definition
 * @param negate True if the requirement should be negated
 * @param invert True if the requirements should be inverted
 * @param key The required option key (to get the specified value)
 * @param value The required value
 * @param error The terminal string error
 * @returns True if the requirement was satisfied
 */
function checkRequiredValue(
  validator: OptionValidator,
  values: InternalOptionValues,
  option: Option,
  negate: boolean,
  invert: boolean,
  key: string,
  value: Exclude<RequiresVal[string], undefined | null>,
  error: TerminalString,
): boolean {
  const checkFn = isArray(option) ? checkArray : checkSingle;
  const spec = isBoolean(option) ? 'b' : isString(option) ? 's' : 'n';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (checkFn as any)(validator, values, option, negate, invert, key, value, error, spec);
}

/**
 * Sets the normalized default value of an option.
 * @param validator The option validator
 * @param values The option values
 * @param key The option key
 * @param option The option definition
 */
function setDefaultValue(
  validator: OptionValidator,
  values: InternalOptionValues,
  key: string,
  option: Option,
) {
  if (option.default === undefined) {
    values[key] = undefined;
  } else {
    const value = typeof option.default === 'function' ? option.default(values) : option.default;
    if (option.type === 'flag' || option.type === 'boolean') {
      values[key] = value;
    } else {
      const setFn = isArray(option) ? setArray : setSingle;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (setFn as any)(validator, values, key, option, key, value);
    }
  }
}
