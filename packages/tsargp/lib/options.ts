//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import type { HelpItem } from './enums.js';
import type { AnsiMessage, Style } from './styles.js';
import type { PartialWithDepth, Promissory, Resolve } from './utils.js';

import { ErrorItem } from './enums.js';
import { ErrorMessage } from './styles.js';
import { getEntries, getSymbol, isFunction, isObject, isString } from './utils.js';

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * A base requirement expression that holds multiple requirement items.
 */
abstract class RequiresMany {
  /**
   * Creates a requirement expression with requirement items.
   * @param items The requirement items
   */
  constructor(readonly items: Array<Requires>) {}
}

/**
 * A requirement expression that is satisfied when all items are satisfied.
 * If it contains zero items, it always evaluates to true.
 */
export class RequiresAll extends RequiresMany {}

/**
 * A requirement expression that is satisfied when at least one item is satisfied.
 * If it contains zero items, it always evaluates to false.
 */
export class RequiresOne extends RequiresMany {}

/**
 * A requirement expression that is satisfied when the item is not satisfied.
 */
export class RequiresNot {
  /**
   * Creates a requirement expression with a requirement item.
   * @param item The requirement item
   */
  constructor(readonly item: Requires) {}
}

/**
 * Implements a registry of option definitions.
 */
export class OptionRegistry {
  readonly names: Map<string, string> = new Map<string, string>();
  readonly letters: Map<string, string> = new Map<string, string>();
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
// Constants
//--------------------------------------------------------------------------------------------------
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
 * A text alignment setting.
 */
export type Alignment = 'left' | 'right';

/**
 * Defines layout attributes common to all help columns.
 * @template A The type of text alignment
 */
export type WithColumnLayout<A extends string = Alignment> = {
  /**
   * The text alignment for the column. (Defaults to 'left')
   */
  readonly align: A;
  /**
   * The indentation level for the column. (Defaults to 2)
   */
  readonly indent: number;
  /**
   * The number of leading line feeds for the column. (Defaults to 0)
   */
  readonly breaks: number;
  /**
   * Whether the column should be hidden. (Defaults to false)
   */
  readonly hidden: boolean;
};

/**
 * Defines layout attributes for columns that may be preceded by other columns.
 */
export type WithAbsoluteLayout = {
  /**
   * Whether the indentation level should be relative to the beginning of the line instead of the
   * end of the previous column. (Defaults to false)
   */
  readonly absolute: boolean;
};

/**
 * The help columns layout.
 */
export type HelpColumnsLayout = {
  /**
   * The settings for the names column.
   */
  readonly names: WithColumnLayout<Alignment | 'slot'>;
  /**
   * The settings for the parameter column.
   */
  readonly param: WithColumnLayout<Alignment | 'merge'> & WithAbsoluteLayout;
  /**
   * The settings for the description column.
   */
  readonly descr: WithColumnLayout<Alignment | 'merge'> & WithAbsoluteLayout;
};

/**
 * Defines attributes for a help text block.
 */
export type HelpTextBlock = {
  /**
   * The text. May contain inline styles. (Defaults to none)
   */
  readonly text?: string;
  /**
   * The fallback style. (Defaults to none)
   */
  readonly style?: Style;
  /**
   * The text alignment. (Defaults to 'left')
   */
  readonly align?: Alignment;
  /**
   * The indentation level. (Defaults to 0)
   */
  readonly indent?: number;
  /**
   * The number of leading line feeds. (Defaults to 0)
   */
  readonly breaks?: number;
  /**
   * Whether to disable text splitting. (Defaults to false)
   */
  readonly noSplit?: true;
  /**
   * Whether to avoid line feeds at the beginning of the message.
   */
  readonly noBreakFirst?: true;
};

/**
 * Defines attributes common to all help sections.
 */
export type WithSectionKind<T extends string> = {
  /**
   * The kind of section.
   */
  readonly type: T;
  /**
   * The section heading.
   */
  readonly heading?: HelpTextBlock;
  /**
   * The section content.
   */
  readonly content?: HelpTextBlock;
};

/**
 * Defines attributes for a help section with filter.
 */
export type WithSectionFilter = {
  /**
   * A list of option keys or group names to include or exclude.
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
export type WithSectionUsage = {
  /**
   * A list of option keys that should be considered required.
   */
  readonly required?: ReadonlyArray<string>;
  /**
   * A mapping of option keys to required option keys.
   */
  readonly requires?: Readonly<Record<string, string>>;
  /**
   * A commentary to append to the usage.
   */
  readonly comment?: string;
};

/**
 * Defines additional attributes for the groups section.
 */
export type WithSectionGroups = {
  /**
   * The help columns layout.
   */
  readonly layout?: PartialWithDepth<HelpColumnsLayout>;
  /**
   * The order of items display in option descriptions.
   */
  readonly items?: ReadonlyArray<HelpItem>;
  /**
   * Whether option names should be replaced by environment variable names.
   */
  readonly useEnv?: true;
};

/**
 * A help text section.
 */
export type HelpTextSection = WithSectionKind<'text'>;

/**
 * A help usage section.
 */
export type HelpUsageSection = WithSectionKind<'usage'> & WithSectionFilter & WithSectionUsage;

/**
 * A help groups section.
 */
export type HelpGroupsSection = WithSectionKind<'groups'> & WithSectionFilter & WithSectionGroups;

/**
 * A help section.
 */
export type HelpSection = HelpTextSection | HelpUsageSection | HelpGroupsSection;

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
 * A requirement expression.
 */
export type RequiresExp = RequiresNot | RequiresAll | RequiresOne;

/**
 * A mapping of option keys to required values.
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
 * - a mapping of option keys to required values;
 * - a requirement expression; or
 * - a requirement callback
 */
export type Requires = string | RequiresVal | RequiresExp | RequirementCallback;

/**
 * A callback to check option requirements.
 * @param values The option values
 * @returns True if the requirements were satisfied
 */
export type RequirementCallback = (values: OpaqueOptionValues) => Promissory<boolean>;

/**
 * A JavaScript module resolution function.
 * To be used in non-browser environments only.
 * @param specifier The module specifier
 * @returns The resolved path
 */
export type ModuleResolutionCallback = (specifier: string) => string;

/**
 * A callback for default values.
 * @param values The parsed values
 * @returns The default value
 */
export type DefaultValueCallback = (values: OpaqueOptionValues) => unknown;

/**
 * A normalization function applied to parameters before they get validated and/or parsed.
 * @param param The option parameter
 * @returns The normalized parameter
 */
export type NormalizationCallback = (param: string) => string;

/**
 * A callback for custom parsing or custom completion.
 * @template P The parameter data type
 * @template I The type of argument information
 * @template R The return type
 * @param param The option parameter(s)
 * @param info The argument information
 * @returns The return value
 */
export type CustomCallback<P, I, R> = (param: P, info: I) => R;

/**
 * A callback for custom parsing.
 * @template P The parameter data type
 * @template R The result data type
 */
export type ParsingCallback<P, R = unknown> = CustomCallback<P, WithArgInfo & WithCompInfo, R>;

/**
 * A callback for custom word completion.
 * @template I The type of argument information
 */
export type CompletionCallback<I> = CustomCallback<string, I, Promissory<Array<string>>>;

/**
 * The type of nested options for a subcommand.
 */
export type NestedOptions = string | Promissory<Options> | (() => Promissory<Options>);

/**
 * The type of inline constraint.
 */
export type InlineConstraint = false | 'always' | Readonly<Record<string, false | 'always'>>;

/**
 * A known value used in default values and parameter examples.
 */
export type KnownValue = boolean | string | number | object;

/**
 * Information about the current argument sequence in the parsing loop.
 */
export type WithArgInfo = {
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
   * The option name as specified on the command-line, or the environment data source.
   * It will be the preferred name if the sequence comes from positional arguments.
   * It will be the string '0' if the sequence comes from the standard input.
   */
  name: string;
};

/**
 * Information about word completion, to be used by custom parsing callbacks.
 */
export type WithCompInfo = {
  /**
   * Whether word completion is in effect.
   */
  comp: boolean;
};

/**
 * Information about word completion, to be used by completion callbacks.
 */
export type WithPrevInfo = {
  /**
   * The parameters preceding the word being completed, if any.
   */
  prev: Array<string>;
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
   * The option synopsis. May contain inline styles.
   */
  readonly synopsis?: string;
  /**
   * The option deprecation notice. May contain inline styles.
   */
  readonly deprecated?: string;
  /**
   * The option group in the help message.
   * Use null to hide it from the help message.
   */
  readonly group?: string | null;
  /**
   * The option display styles.
   */
  readonly styles?: OptionStyles;
  /**
   * A hyperlink to an external resource.
   */
  readonly link?: URL;
};

/**
 * Defines attributes for options that throw messages.
 */
export type WithMessage = {
  /**
   * Whether to save the message in the option value instead of throwing it.
   */
  readonly saveMessage?: true;
};

/**
 * Defines attributes common to options that have values.
 * @template P The type of parse parameter
 */
export type WithValue<P> = {
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
  readonly default?: KnownValue | DefaultValueCallback;
  /**
   * A custom callback for parsing the option parameter(s).
   */
  readonly parse?: ParsingCallback<P>;
};

/**
 * Defines attributes for options that may read data from the environment.
 */
export type WithEnv = {
  /**
   * True to read data from the standard input, if the option is not specified in the command-line.
   * This has precedence over {@link WithEnv.sources}.
   */
  readonly stdin?: true;
  /**
   * The names of environment data sources to try reading from (in that order), if the option is
   * specified neither on the command-line nor in the standard input. A string means an environment
   * variable, while a URL means a local file.
   */
  readonly sources?: ReadonlyArray<string | URL>;
  /**
   * True to break the parsing loop after parsing the option.
   */
  readonly break?: true;
};

/**
 * Defines attributes for options that may have parameters.
 * @template I The type of argument information for completion callbacks
 */
export type WithParam<I> = {
  /**
   * The option example value. Replaces the option type in the help message parameter column.
   */
  readonly example?: KnownValue;
  /**
   * The option parameter name. Replaces the option type in the help message parameter column.
   * It should not contain inline styles or line feeds.
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
   * Can be `false` to disallow or `'always'` to always require.
   *
   * It can also be a mapping of option names to one of the above, indicating whether the
   * corresponding name disallows or requires inline parameters.
   */
  readonly inline?: InlineConstraint;
  /**
   * A custom callback for word completion.
   */
  readonly complete?: CompletionCallback<I>;
};

/**
 * Defines attributes for options that may have parameter selection constraints.
 */
export type WithSelection = {
  /**
   * The regular expression that parameters should match.
   */
  readonly regex?: RegExp;
  /**
   * The allowed parameter values.
   */
  readonly choices?: ReadonlyArray<string>;
  /**
   * The mapping of parameter values to option values.
   */
  readonly mapping?: Readonly<Record<string, unknown>>;
  /**
   * A normalization function applied to parameters before they get validated and/or parsed.
   */
  readonly normalize?: NormalizationCallback;
};

/**
 * Defines attributes for the help option.
 */
export type WithHelp = {
  /**
   * The help sections to be rendered.
   */
  readonly sections?: HelpSections;
  /**
   * Whether to use the next argument as the name of a subcommand.
   * Has precedence over {@link WithHelp.useFilter}.
   */
  readonly useCommand?: true;
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
   * The version information as plain text (e.g., 0.1.0).
   * It is not validated, but should not be empty or contain inline styles.
   */
  readonly version?: string;
};

/**
 * Defines attributes for the command option.
 */
export type WithCommand = {
  /**
   * The subcommand's options.
   * It can also be a module path or a callback that returns the options.
   */
  readonly options?: NestedOptions;
  /**
   * The prefix of cluster arguments.
   * If set, then eligible arguments that have this prefix will be considered a cluster.
   * Has precedence over {@link WithCommand.optionPrefix}.
   */
  readonly clusterPrefix?: string;
  /**
   * The prefix of option names.
   * If set, then arguments that have this prefix will always be considered an option name.
   */
  readonly optionPrefix?: string;
};

/**
 * Defines attributes for the flag option.
 */
export type WithFlag = unknown; // disappears in type intersection

/**
 * Defines attributes common to single-valued options.
 */
export type WithSingle = unknown; // disappears in type intersection

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
 * Defines attributes for the function option.
 */
export type WithFunction = {
  /**
   * The function's parameter count.
   *
   * If unspecified or negative, the option accepts unlimited parameters.
   * If zero, the option accepts unknown number of parameters (use with {@link WithFunction.skipCount}).
   * If positive, then the option expects exactly this number of parameters.
   * If a range, then the option expects between `min` and `max` parameters.
   */
  readonly paramCount?: number | Range;
  /**
   * The number of remaining arguments to skip.
   * It is meant to be changed by the callback. (The parser does not alter this value.)
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
export type VersionOption = WithType<'version'> & WithVersion & WithBasic & WithMessage;

/**
 * An option that executes a command.
 */
export type CommandOption = WithType<'command'> &
  WithCommand &
  WithBasic &
  WithValue<OpaqueOptionValues> &
  (WithDefault | WithRequired);

/**
 * An option that has a value, but is niladic.
 */
export type FlagOption = WithType<'flag'> &
  WithFlag &
  WithBasic &
  WithValue<''> &
  WithEnv &
  (WithDefault | WithRequired);

/**
 * An option that has a single value and requires a single parameter.
 */
export type SingleOption = WithType<'single'> &
  WithSingle &
  WithBasic &
  WithValue<string> &
  WithEnv &
  WithParam<WithArgInfo> &
  WithSelection &
  (WithDefault | WithRequired) &
  (WithExample | WithParamName) &
  (WithChoices | WithRegex);

/**
 * An option that has an array value and accepts zero or more parameters.
 */
export type ArrayOption = WithType<'array'> &
  WithArray &
  WithBasic &
  WithValue<string> &
  WithEnv &
  WithParam<WithArgInfo & WithPrevInfo> &
  WithSelection &
  (WithDefault | WithRequired) &
  (WithExample | WithParamName) &
  (WithChoices | WithRegex);

/**
 * An option that has any value and can be configured with a parameter count.
 */
export type FunctionOption = WithType<'function'> &
  WithFunction &
  WithBasic &
  WithValue<Array<string>> &
  WithEnv &
  WithParam<WithArgInfo & WithPrevInfo> &
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
  WithValue<'' & string & Array<string> & OpaqueOptionValues> &
  WithEnv &
  WithParam<WithArgInfo & WithPrevInfo> &
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
   * @deprecated mutually exclusive with {@link WithParam.example}
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
   * @deprecated mutually exclusive with {@link WithSelection.choices}
   */
  readonly regex?: never;
};

/**
 * Removes mutually exclusive attributes from an option with a `regex` constraint.
 */
type WithRegex = {
  /**
   * @deprecated mutually exclusive with {@link WithSelection.regex}
   */
  readonly choices?: never;
};

/**
 * The data type of an option that may have a default value.
 * @template T The option definition type
 */
type DefaultDataType<T extends Option> = T extends { required: true }
  ? never
  : T extends { default: infer D }
    ? D extends (...args: any) => infer R // eslint-disable-line @typescript-eslint/no-explicit-any
      ? Awaited<R>
      : Awaited<D>
    : undefined;

/**
 * The data type of an option that may have nested options.
 * @template T The option definition type
 */
type OptionsDataType<T extends Option> = T extends { options: infer O }
  ? O extends string
    ? Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    : O extends (() => infer R extends Promissory<Options>)
      ? OptionValues<Awaited<R>>
      : O extends Promissory<Options>
        ? OptionValues<Awaited<O>>
        : never
  : Record<never, never>;

/**
 * The data type of an option that may have a parsing callback.
 * @template T The option definition type
 * @template F The fallback data type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParseDataType<T extends Option, F> = T extends { parse: (...args: any) => infer R }
  ? Awaited<R>
  : F;

/**
 * The data type of an option that may have choices.
 * @template T The option definition type
 */
type ChoiceDataType<T extends Option> = T extends { choices: ReadonlyArray<infer K> } ? K : string;

/**
 * The data type of an option that may have selection constraints.
 * @template T The option definition type
 */
type SelectionDataType<T extends Option, K = ChoiceDataType<T>> = T extends { mapping: infer M }
  ? ParseDataType<T, Exclude<K, keyof M>> | M[K & keyof M]
  : ParseDataType<T, K>;

/**
 * The data type of an option that may have a value.
 * @template T The option definition type
 */
type ValueDataType<T extends Option> =
  T extends WithType<'command'>
    ? ParseDataType<T, OptionsDataType<T>>
    : T extends WithType<'flag'>
      ? ParseDataType<T, true>
      : T extends WithType<'single'>
        ? SelectionDataType<T>
        : T extends WithType<'array'>
          ? Array<SelectionDataType<T>>
          : ParseDataType<T, Array<string>>;

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
    ? MessageDataType<T, AnsiMessage>
    : T extends WithType<'version'>
      ? MessageDataType<T, string>
      : ValueDataType<T> | DefaultDataType<T>;

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
 * Gets a list of environment variables for an option.
 * @param option The option definition
 * @returns The variable names
 */
export function getOptionEnvVars(option: OpaqueOption): Array<string> {
  return option.sources?.filter(isString) ?? [];
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
 * Tests if an option type is that of a niladic option.
 * @param type The option type
 * @returns True if the option type is niladic
 */
export function isNiladic(type: OptionType): type is NiladicOptionType {
  return niladicOptionTypes.includes(type as NiladicOptionType);
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
export function getParamCount(option: OpaqueOption): Range {
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
export function notOf(item: Requires): RequiresNot {
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
 * Create a parsing callback for numbers that should be within a range.
 * @param range The numeric range
 * @param phrase The custom error phrase
 * @returns The parsing callback
 */
export function numberInRange(range: Range, phrase: string): ParsingCallback<string, number> {
  const [min, max] = range;
  return function (param, info) {
    if (info.comp) {
      return 0; // the result does not matter when completion is in effect
    }
    const num = Number(param);
    if (min <= num && num <= max) {
      return num; // handles NaN
    }
    throw ErrorMessage.createCustom(phrase, {}, getSymbol(info.name), param, range);
  };
}

/**
 * Resolves the nested options of a subcommand.
 * @param option The option definition
 * @param resolve The module resolution callback
 * @returns The nested options
 */
export async function getNestedOptions(
  option: OpaqueOption,
  resolve?: ModuleResolutionCallback,
): Promise<OpaqueOptions> {
  if (isString(option.options)) {
    if (!resolve) {
      throw ErrorMessage.create(ErrorItem.missingResolveCallback);
    }
    return (await import(resolve(option.options))).default;
  }
  // do not destructure `options`, because the callback might need to use `this`
  return await (isFunction(option.options) ? option.options() : (option.options ?? {}));
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
