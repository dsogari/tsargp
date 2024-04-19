//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import type { HelpMessage, ErrorFormatter, MessageConfig, Style } from './styles.js';
import type { PartialWithDepth, Promissory, Resolve, URL } from './utils.js';

import { HelpItem } from './enums.js';
import { getEntries } from './utils.js';

export { requirementExpressions as req };

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * A helper object to create option requirement expressions.
 */
const requirementExpressions = {
  /**
   * Creates a requirement expression that is satisfied only when all items are satisfied.
   * If it contains zero items, it always evaluates to true.
   * @param items The requirement items
   * @returns The requirement expression
   */
  all(...items: Array<Requires>): RequiresAll {
    return new RequiresAll(items);
  },

  /**
   * Creates a requirement expression that is satisfied when at least one item is satisfied.
   * If it contains zero items, it always evaluates to false.
   * @param items The requirement items
   * @returns The requirement expression
   */
  one(...items: Array<Requires>): RequiresOne {
    return new RequiresOne(items);
  },

  /**
   * Creates a requirement expression that is satisfied when the item is not satisfied.
   * @param item The requirement item
   * @returns The requirement expression
   */
  not(item: Requires): RequiresNot {
    return new RequiresNot(item);
  },
} as const;

/**
 * The types of options that throw messages.
 */
const messageOptionTypes = ['help', 'version'] as const;

/**
 * The types of options that accept no parameter.
 */
const niladicOptionTypes = [...messageOptionTypes, 'command', 'flag'] as const;

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A (closed) numeric range.
 *
 * In a valid range, the minimum should be strictly less than the maximum.
 */
export type Range = readonly [min: number, max: number];

/**
 * Implements formatting of help messages for a set of option definitions.
 */
export interface HelpFormatter {
  /**
   * Formats a help message with sections.
   * Options are rendered in the same order as was declared in the option definitions.
   * @param sections The help sections
   * @param progName The program name, if any
   * @returns The formatted help message
   */
  sections(sections: HelpSections, progName?: string): HelpMessage;
}

/**
 * The constructor of a help formatter.
 * @param registry The registry instance
 * @param msgConfig The error configuration
 * @param fmtConfig The help configuration
 * @returns The formatter instance
 */
export type HelpFormatterClass = new (
  registry: OptionRegistry,
  msgConfig: MessageConfig,
  fmtConfig?: HelpConfig,
) => HelpFormatter;

/**
 * A text alignment setting.
 */
export type Alignment = 'left' | 'right';

/**
 * Defines attributes common to all help columns.
 * @template A The type of text alignment
 */
export type WithColumn<A extends string = Alignment> = {
  /**
   * The text alignment for this column. (Defaults to 'left')
   */
  readonly align: A;
  /**
   * The indentation level for this column. (Defaults to 2)
   */
  readonly indent: number;
  /**
   * The number of line breaks to insert before each entry in this column. (Defaults to 0)
   */
  readonly breaks: number;
  /**
   * Whether the column should be hidden. (Defaults to false)
   */
  readonly hidden: boolean;
};

/**
 * Defines attributes for columns that may be preceded by other columns.
 */
export type WithAbsolute = {
  /**
   * Whether the indentation level should be relative to the beginning of the line instead of the
   * end of the previous column. (Defaults to false)
   */
  readonly absolute: boolean;
};

/**
 * The formatter configuration.
 */
export type FormatterConfig = {
  /**
   * The settings for the names column.
   */
  readonly names: WithColumn<Alignment | 'slot'>;
  /**
   * The settings for the parameter column.
   */
  readonly param: WithColumn<Alignment | 'merge'> & WithAbsolute;
  /**
   * The settings for the description column.
   */
  readonly descr: WithColumn<Alignment | 'merge'> & WithAbsolute;
  /**
   * The phrases to be used for each kind of help item.
   */
  readonly phrases: Readonly<Record<HelpItem, string>>;
  /**
   * The order of items to be shown in the option description.
   */
  readonly items: ReadonlyArray<HelpItem>;
  /**
   * A list of patterns to filter options.
   */
  filter: ReadonlyArray<string>;
};

/**
 * A partial formatter configuration.
 */
export type HelpConfig = PartialWithDepth<FormatterConfig>;

/**
 * Defines attributes common to all help sections.
 */
export type WithKind<T extends string> = {
  /**
   * The kind of section.
   */
  readonly type: T;
};

/**
 * Defines attributes for a help section with wrapping.
 */
export type WithTitle = {
  /**
   * The section heading or default group heading. May contain inline styles.
   */
  readonly title?: string;
  /**
   * The style of the section heading or option group headings. (Defaults to tf.bold)
   */
  readonly style?: Style;
  /**
   * The number of line breaks to insert before the section.
   * (Defaults to 0 for the first section, else 2)
   */
  readonly breaks?: number;
  /**
   * True to disable wrapping of the provided text or headings.
   */
  readonly noWrap?: true;
};

/**
 * Defines attributes for a help section with text content.
 */
export type WithText = {
  /**
   * The section content. May contain inline styles.
   */
  readonly text?: string;
};

/**
 * Defines attributes for a help section with indentation.
 */
export type WithIndent = {
  /**
   * The indentation level of the section content. (Defaults to 0)
   */
  readonly indent?: number;
};

/**
 * Defines attributes for a help section with filter.
 */
export type WithFilter = {
  /**
   * A list of options keys or group names to include or exclude.
   */
  readonly filter?: ReadonlyArray<string>;
  /**
   * True if the filter should exclude.
   */
  readonly exclude?: true;
};

/**
 * Defines additional attributes for the usage section.
 */
export type WithUsage = {
  /**
   * A list of options that should be considered required in the usage.
   */
  readonly required?: ReadonlyArray<string>;
  /**
   * A map of option keys to required options.
   */
  readonly requires?: Readonly<Record<string, string>>;
  /**
   * A commentary to append to the usage.
   */
  readonly comment?: string;
};

/**
 * A help text section.
 */
export type HelpText = WithKind<'text'> & WithTitle & WithText & WithIndent;

/**
 * A help usage section.
 */
export type HelpUsage = WithKind<'usage'> & WithTitle & WithUsage & WithIndent & WithFilter;

/**
 * A help groups section.
 */
export type HelpGroups = WithKind<'groups'> & WithTitle & WithFilter;

/**
 * A help section.
 */
export type HelpSection = HelpText | HelpUsage | HelpGroups;

/**
 * A list of help sections.
 */
export type HelpSections = ReadonlyArray<HelpSection>;

/**
 * A set of styles for displaying an option on the terminal.
 */
export type OptionStyles = {
  /**
   * The style of the option names.
   */
  readonly names?: Style;
  /**
   * The style of the option parameter.
   */
  readonly param?: Style;
  /**
   * The style of the option description.
   */
  readonly descr?: Style;
};

/**
 * A requirement expression that is satisfied only when all items are satisfied.
 */
export class RequiresAll {
  constructor(readonly items: Array<Requires>) {}
}

/**
 * A requirement expression that is satisfied when at least one item is satisfied.
 */
export class RequiresOne {
  constructor(readonly items: Array<Requires>) {}
}

/**
 * A requirement expression that is satisfied when the item is not satisfied.
 */
export class RequiresNot {
  constructor(readonly item: Requires) {}
}

/**
 * A requirement expression.
 */
export type RequiresExp = RequiresNot | RequiresAll | RequiresOne;

/**
 * An object that maps option keys to required values.
 */
export type RequiresVal = { readonly [key: string]: unknown };

/**
 * An entry from the required values object.
 */
export type RequiresEntry = readonly [key: string, value: unknown];

/**
 * An option requirement can be either:
 *
 * - an option key;
 * - an object that maps option keys to required values;
 * - a requirement expression; or
 * - a requirement callback
 */
export type Requires = string | RequiresVal | RequiresExp | RequiresCallback;

/**
 * A callback to check option requirements.
 * @param values The option values
 * @returns True if the requirements were satisfied
 */
export type RequiresCallback = (values: OpaqueOptionValues) => Promissory<boolean>;

/**
 * A module-relative resolution function (i.e., scoped to a module).
 * To be used in non-browser environments only.
 * @param specifier The path specifier
 * @returns The resolved path
 */
export type ResolveCallback = (specifier: string) => string;

/**
 * A callback for default values.
 * @param values The parsed values
 * @returns The default value
 */
export type DefaultCallback = (values: OpaqueOptionValues) => unknown;

/**
 * A callback for custom parsing or word completion.
 * @template P The parameter data type
 * @template I The type of sequence information
 * @template R The return type
 * @param param The option parameter(s)
 * @param info The sequence information
 * @returns The return value
 */
export type CustomCallback<P, I, R> = (param: P, info: I) => R;

/**
 * A known value used in default values and parameter examples.
 */
export type KnownValue = boolean | string | number | object;

/**
 * Information about the current argument sequence in the parsing loop.
 */
export type WithValues = {
  /**
   * The previously parsed values.
   * It is an opaque type that should be cast to {@link OptionValues}`<typeof your_options>`.
   */
  values: OpaqueOptionValues;
  /**
   * The index of the occurrence of the option name, or of the first option parameter.
   * It will be NaN if the sequence comes from environment data.
   */
  index: number;
  /**
   * The option name as specified on the command-line, or the environment variable name.
   * It will be the option's preferred name if the sequence comes from positional arguments.
   */
  name: string;
};

/**
 * Information about word completion, to be used by custom callbacks.
 */
export type WithComp = {
  /**
   * Whether word completion is in effect.
   */
  comp: boolean;
};

/**
 * Information about word completion, to be used by a complete callbacks.
 */
export type WithPrev = {
  /**
   * The parameters preceding the word being completed, if any.
   */
  prev: Array<string>;
};

/**
 * A utility to format terminal strings, to be used by custom callbacks.
 */
export type WithFormat = {
  /**
   * Creates a formatted message.
   */
  format: ErrorFormatter<0>['format'];
};

/**
 * Defines the type of an option.
 * @template T The option type
 */
export type WithType<T extends string> = {
  /**
   * The option type.
   */
  readonly type: T;
};

/**
 * Defines attributes common to all options.
 */
export type WithBasic = {
  /**
   * The option names, as they appear on the command-line (e.g. `-h` or `--help`).
   *
   * Names cannot contain whitespace or the equals sign `=` (since it may act as option-parameter
   * separator). Empty names or `null`s can be specified in order to skip the respective "slot" in
   * the help message names column.
   */
  readonly names?: ReadonlyArray<string | null>;
  /**
   * A name to be displayed in error and help messages in cases where one is not available (e.g.,
   * when evaluating option requirements or processing positional arguments). It is not validated
   * and can be anything.
   *
   * If not specified, the first name in the {@link WithBasic.names} array will be used.
   */
  preferredName?: string;
  /**
   * The option synopsis. It may contain inline styles.
   */
  readonly synopsis?: string;
  /**
   * The option deprecation notice. It may contain inline styles.
   */
  readonly deprecated?: string;
  /**
   * The option group in the help message.
   */
  readonly group?: string;
  /**
   * True if the option should be hidden from the help message.
   */
  readonly hide?: true;
  /**
   * The option display styles.
   */
  readonly styles?: OptionStyles;
  /**
   * A reference to an external resource.
   */
  readonly link?: URL;
};

/**
 * Defines attributes common to valued options.
 */
export type WithValue = {
  /**
   * The letters used for clustering in short-option style (e.g., 'fF').
   */
  readonly cluster?: string;
  /**
   * True if the option is always required.
   */
  readonly required?: true;
  /**
   * The forward requirements.
   */
  readonly requires?: Requires;
  /**
   * The conditional requirements.
   */
  readonly requiredIf?: Requires;
  /**
   * Te default value or a callback that returns the default value.
   *
   * The default value is set at the end of the parsing loop if the option was specified neither on
   * the command-line nor as an environment variable. You may use a callback to inspect parsed
   * values and determine the default value based on those values.
   */
  readonly default?: KnownValue | DefaultCallback;
};

/**
 * Defines attributes for options that may have custom parsing.
 * @template P The type of parse parameter
 * @template T The type of ???
 */
export type WithParse<P, T = WithComp> = {
  /**
   * A custom callback for parsing option parameter(s).
   */
  readonly parse?: CustomCallback<P, WithValues & WithFormat & T, unknown>;
};

/**
 * Defines attributes for options that ???.
 */
export type WithBreak = {
  /**
   * True to break the parsing loop after parsing the option.
   */
  readonly break?: true;
  /**
   * True to read data from the standard input, if the option is not specified in the command-line.
   * This has precedence over {@link WithBreak.env}.
   */
  readonly stdin?: true;
  /**
   * The name of environment data sources to try reading from (in order), if the option is specified
   * neither on the command-line nor in the standard input. A string means an environment variable,
   * while a URL means a local file.
   */
  readonly env?: ReadonlyArray<string | URL>;
};

/**
 * Defines attributes for options that may have parameters.
 */
export type WithParam = {
  /**
   * The option example value. Replaces the option type in the help message parameter column.
   */
  readonly example?: KnownValue;
  /**
   * The option parameter name. Replaces the option type in the help message parameter column.
   */
  readonly paramName?: string;
  /**
   * Whether the option accepts positional arguments.
   * There may be at most one option with this setting.
   *
   * If set, then any argument not recognized as an option name will be considered positional.
   * Additionally, if a string is specified as positional marker, then all arguments beyond this
   * marker will be considered positional.
   *
   * We recommend also setting {@link WithBasic.preferredName} to some explanatory name.
   */
  readonly positional?: true | string;
  /**
   * Whether inline parameters should be disallowed or required for this option.
   */
  readonly inline?: false | 'always';
  /**
   * The regular expression that parameters should match.
   */
  readonly regex?: RegExp;
  /**
   * A custom callback for word completion.
   */
  readonly complete?: CustomCallback<string, WithValues & WithPrev, Promissory<Array<string>>>;
};

/**
 * Defines attributes for options that may have parameter choices.
 */
export type WithSelection = {
  /**
   * The choices of parameter values, or a mapping of parameter values to option values.
   */
  readonly choices?: ReadonlyArray<string> | Readonly<Record<string, unknown>>;
};

/**
 * Defines attributes common to array-valued options.
 */
export type WithArray = {
  /**
   * The parameter value separator.
   */
  readonly separator?: string | RegExp;
  /**
   * True if duplicate elements should be removed.
   */
  readonly unique?: true;
  /**
   * Allows appending elements if specified multiple times.
   */
  readonly append?: true;
  /**
   * The maximum allowed number of elements.
   */
  readonly limit?: number;
};

/**
 * Defines attributes common to the help and version options.
 */
export type WithMessage = {
  /**
   * Whether to save the message in the option value instead of throwing it.
   */
  readonly saveMessage?: true;
};

/**
 * Defines attributes for the help option.
 */
export type WithHelp = {
  /**
   * The formatter configuration.
   */
  readonly config?: HelpConfig;
  /**
   * The help sections to be rendered.
   */
  readonly sections?: HelpSections;
  /**
   * The available help formats.
   * Each entry maps a format to a help formatter class.
   */
  readonly formats?: Record<string, HelpFormatterClass>;
  /**
   * Whether to use the next argument as the name of a nested command.
   * Has precedence over {@link WithHelp.useFormat}.
   */
  readonly useNested?: true;
  /**
   * Whether to use the next argument as the name of a help format.
   * Has precedence over {@link WithHelp.useFilter}.
   */
  readonly useFormat?: true;
  /**
   * Whether to use the remaining arguments as option filter.
   */
  readonly useFilter?: true;
};

/**
 * Defines attributes for the version option.
 */
export type WithVersion = {
  /**
   * The semantic version (e.g., 0.1.0) or version information. It is not validated, but cannot be
   * empty. It may contain inline styles.
   */
  readonly version?: string;
  /**
   * A resolution function scoped to the module where a `package.json` file should be searched. Use
   * `import.meta.resolve`. Use in non-browser environments only.
   */
  readonly resolve?: ResolveCallback;
};

/**
 * Defines attributes for the command option.
 */
export type WithCommand = {
  /**
   * The command's options.
   * It can be a callback that returns the options (for use with recursive commands).
   */
  readonly options?: Options | (() => Promissory<Options>);
  /**
   * The prefix of cluster arguments.
   * If set, then eligible arguments that have this prefix will be considered a cluster.
   */
  readonly clusterPrefix?: string;
};

/**
 * Defines attributes for the function option.
 */
export type WithFunction = {
  /**
   * The function's parameter count.
   *
   * If negative, then the option accepts unlimited parameters.
   * If non-negative, then the option expects exactly this number of parameters.
   * If a range, then the option expects between `min` and `max` parameters.
   */
  readonly paramCount?: number | Range;
};

/**
 * Defines attributes for the flag option.
 */
export type WithFlag = {
  /**
   * The number of remaining arguments to skip.
   * You may change this value inside the callback. The parser does not alter this value.
   */
  skipCount?: number;
};

/**
 * An option that throws a help message.
 */
export type HelpOption = WithType<'help'> & WithBasic & WithHelp & WithMessage;

/**
 * An option that throws a version information.
 */
export type VersionOption = WithType<'version'> &
  WithBasic &
  WithVersion &
  WithMessage &
  (WithVerInfo | WithResolve);

/**
 * An option that executes a command.
 */
export type CommandOption = WithType<'command'> &
  WithBasic &
  WithValue &
  WithCommand &
  WithParse<OpaqueOptionValues, unknown> &
  (WithDefault | WithRequired);

/**
 * An option that has a value, but is niladic.
 */
export type FlagOption = WithType<'flag'> &
  WithBasic &
  WithValue &
  WithFlag &
  WithParse<Array<string>> &
  WithBreak &
  (WithDefault | WithRequired) &
  (WithExample | WithParamName);

/**
 * An option that has a single value and requires a single parameter.
 */
export type SingleOption = WithType<'single'> &
  WithBasic &
  WithValue &
  WithParse<string> &
  WithBreak &
  WithParam &
  WithSelection &
  (WithDefault | WithRequired) &
  (WithExample | WithParamName) &
  (WithChoices | WithRegex);

/**
 * An option that has an array value and accepts zero or more parameters.
 */
export type ArrayOption = WithType<'array'> &
  WithBasic &
  WithValue &
  WithParse<string> &
  WithBreak &
  WithParam &
  WithSelection &
  WithArray &
  (WithDefault | WithRequired) &
  (WithExample | WithParamName) &
  (WithChoices | WithRegex);

/**
 * An option that has any value and can be configured with a parameter count.
 */
export type FunctionOption = WithType<'function'> &
  WithBasic &
  WithValue &
  WithFunction &
  WithParse<Array<string>> &
  WithBreak &
  WithParam &
  (WithDefault | WithRequired) &
  (WithExample | WithParamName);

/**
 * The public option types.
 */
export type Option =
  | HelpOption
  | VersionOption
  | CommandOption
  | FlagOption
  | SingleOption
  | ArrayOption
  | FunctionOption;

/**
 * A collection of public option definitions.
 */
export type Options = Readonly<Record<string, Option>>;

/**
 * A collection of option values.
 * @template T The type of the option definitions
 */
export type OptionValues<T extends Options = Options> = Resolve<{
  -readonly [key in keyof T]: OptionDataType<T[key]>;
}>;

/**
 * The option types.
 */
export type OptionType = NiladicOptionType | 'single' | 'array' | 'function';

/**
 * An opaque option definition.
 */
export type OpaqueOption = WithType<OptionType> &
  WithBasic &
  WithHelp &
  WithVersion &
  WithCommand &
  WithFlag &
  WithFunction &
  WithMessage &
  WithValue &
  (WithParse<string> | WithParse<Array<string>> | WithParse<OpaqueOptionValues, unknown>) &
  WithBreak &
  WithParam &
  WithSelection &
  WithArray;

/**
 * A collection of opaque option definitions.
 */
export type OpaqueOptions = Readonly<Record<string, OpaqueOption>>;

/**
 * A collection of opaque option values.
 */
export type OpaqueOptionValues = Record<string, unknown>;

/**
 * Information regarding an option.
 */
export type OptionInfo = [key: string, option: OpaqueOption, name: string];

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * The message option types.
 */
type MessageOptionType = (typeof messageOptionTypes)[number];

/**
 * The niladic option types.
 */
type NiladicOptionType = (typeof niladicOptionTypes)[number];

/**
 * Removes mutually exclusive attributes from an option that is always `required`.
 */
type WithRequired = {
  /**
   * @deprecated mutually exclusive with {@link WithValue.required}
   */
  readonly default?: never;
  /**
   * @deprecated mutually exclusive with {@link WithValue.required}
   */
  readonly requiredIf?: never;
};

/**
 * Removes mutually exclusive attributes from an option with a `default` value.
 */
type WithDefault = {
  /**
   * @deprecated mutually exclusive with {@link WithValue.default} and {@link WithValue.requiredIf}
   */
  readonly required?: never;
};

/**
 * Removes mutually exclusive attributes from an option with an `example` value.
 */
type WithExample = {
  /**
   * @deprecated mutually exclusive with {@link WithKnownValue.example}
   */
  readonly paramName?: never;
};

/**
 * Removes mutually exclusive attributes from an option with a parameter name.
 */
type WithParamName = {
  /**
   * @deprecated mutually exclusive with {@link WithParam.paramName}
   */
  readonly example?: never;
};

/**
 * Removes mutually exclusive attributes from an option with a `choices` constraint.
 */
type WithChoices = {
  /**
   * @deprecated mutually exclusive with {@link WithParam.choices}
   */
  readonly regex?: never;
};

/**
 * Removes mutually exclusive attributes from an option with a `regex` constraint.
 */
type WithRegex = {
  /**
   * @deprecated mutually exclusive with {@link WithParam.regex}
   */
  readonly choices?: never;
};

/**
 * Removes mutually exclusive attributes from an option with a `version` information.
 */
type WithVerInfo = {
  /**
   * @deprecated mutually exclusive with {@link WithVersion.version}
   */
  readonly resolve?: never;
};

/**
 * Removes mutually exclusive attributes from an option with a `resolve` callback.
 */
type WithResolve = {
  /**
   * @deprecated mutually exclusive with {@link WithVersion.resolve}
   */
  readonly version?: never;
};

/**
 * The data type of an option that may have a default value.
 * @template T The option definition type
 */
type DefaultDataType<T extends Option> = T extends { required: true }
  ? never
  : T extends { default: infer D }
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      D extends (...args: any) => infer R
      ? R extends Promise<infer V>
        ? V
        : R
      : D
    : undefined;

/**
 * The data type of an option that may have a parse callback.
 * @template T The option definition type
 * @template C The choices data type
 * @template F The fallback data type
 */
type ParseDataType<T extends Option, C, F> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { parse: (...args: any) => infer R }
    ? R extends Promise<infer D>
      ? ElementDataType<T, D | C>
      : ElementDataType<T, R | C>
    : T extends WithType<'command'>
      ? OpaqueOptionValues
      : T extends WithType<'flag'>
        ? true
        : T extends WithType<'function'>
          ? null
          : ElementDataType<T, F>;

/**
 * The data type of an option that may have choices.
 * @template T The option definition type
 */
type ChoiceDataType<T extends Option> = T extends { choices: infer C }
  ? C extends ReadonlyArray<infer K>
    ? ParseDataType<T, never, K>
    : C extends Readonly<Record<string, infer V>>
      ? V extends Promise<infer D>
        ? ParseDataType<T, D, D>
        : ParseDataType<T, V, V>
      : ParseDataType<T, never, string>
  : ParseDataType<T, never, string>;

/**
 * The data type of a single-valued option or the array element of an array-valued option.
 * @template T The option definition type
 * @template E The element data type
 */
type ElementDataType<T extends Option, E> = T extends WithType<'array'> ? Array<E> : E;

/**
 * The data type of an option that throws a message.
 * @template T The option definition type
 * @template M The message data type
 */
type MessageDataType<T extends Option, M> = T extends { saveMessage: true } ? M | undefined : never;

/**
 * The data type of an option value.
 * @template T The option definition type
 */
type OptionDataType<T extends Option> =
  T extends WithType<'help'>
    ? MessageDataType<T, HelpMessage>
    : T extends WithType<'version'>
      ? MessageDataType<T, string>
      : ChoiceDataType<T> | DefaultDataType<T>;

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements a registry of option definitions.
 */
export class OptionRegistry {
  readonly names = new Map<string, string>();
  readonly letters = new Map<string, string>();
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
  const names = option.names?.slice() ?? [];
  if (typeof option.positional === 'string') {
    names.push(option.positional);
  }
  return names.filter((name): name is string => name !== null);
}

/**
 * Tests if an option type is that of a message-valued option.
 * @param type The option type
 * @returns True if the option type is message
 */
export function isMessage(type: OptionType): type is MessageOptionType {
  return messageOptionTypes.includes(type as MessageOptionType);
}

/**
 * Tests if an option is that of a niladic option.
 * @param type The option type
 * @returns True if the option type is niladic
 */
export function isNiladic(type: OptionType): type is NiladicOptionType {
  return niladicOptionTypes.includes(type as NiladicOptionType);
}

/**
 * Gets the parameter count of an option as a numeric range.
 * @param option The option definition
 * @returns The count range
 */
export function getParamCount(option: OpaqueOption): Range {
  if (isNiladic(option.type)) {
    return [0, 0];
  }
  const count = option.paramCount;
  return option.type === 'function'
    ? typeof count === 'object'
      ? count
      : count
        ? [count, count]
        : [0, Infinity]
    : option.type === 'array'
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
  cbkFn: (req: RequiresCallback) => T,
): T {
  return typeof requires === 'string'
    ? keyFn(requires)
    : requires instanceof RequiresNot
      ? notFn(requires)
      : requires instanceof RequiresAll
        ? allFn(requires)
        : requires instanceof RequiresOne
          ? oneFn(requires)
          : typeof requires === 'object'
            ? valFn(requires)
            : cbkFn(requires);
}

/**
 * Creates an object to hold the option values.
 * @template T The type of the option definitions
 * @param _options The option definitions
 * @returns The option values
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function valuesFor<T extends Options>(_options: T): OptionValues<T> {
  return {} as OptionValues<T>;
}
