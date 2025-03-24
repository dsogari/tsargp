//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { HelpItem } from './enums.js';
import type { AnsiMessage, AnsiString, Style } from './styles.js';
import type { PartialWithDepth, Promissory, Resolve } from './utils.js';

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

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A closed numeric range with positive length.
 *
 * In a valid range, the minimum should be strictly less than the maximum.
 */
export type NumericRange = readonly [min: number, max: number];

/**
 * A text alignment setting.
 */
export type TextAlignment = 'left' | 'right';

/**
 * A column alignment setting.
 */
export type ColumnAlignment = TextAlignment | 'slot' | 'merge';

/**
 * Defines layout attributes common to all help columns.
 * @template T The type of text alignment
 */
export type WithColumnLayout<T extends ColumnAlignment = TextAlignment> = {
  /**
   * The text alignment for the column. (Defaults to 'left')
   */
  readonly align: T;
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
  readonly names: WithColumnLayout<TextAlignment | 'slot'>;
  /**
   * The settings for the parameter column.
   */
  readonly param: WithColumnLayout<TextAlignment | 'merge'> & WithAbsoluteLayout;
  /**
   * The settings for the description column.
   */
  readonly descr: WithColumnLayout<TextAlignment | 'merge'> & WithAbsoluteLayout;
};

/**
 * A string that may contain inline styles.
 */
export type StyledString = string | AnsiString;

/**
 * Defines attributes for a help text block.
 */
export type HelpTextBlock = {
  /**
   * The text. (Defaults to none)
   */
  readonly text?: StyledString;
  /**
   * The fallback style. (Defaults to none)
   */
  readonly style?: Style;
  /**
   * The text alignment. (Defaults to 'left')
   */
  readonly align?: TextAlignment;
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
export type WithSection<T extends HelpSectionType> = {
  /**
   * The type of section.
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
   * A list of option keys or group names to include or exclude. Matches exactly.
   */
  readonly filter?: ReadonlyArray<string>;
  /**
   * True if the filter should exclude, or what to exclude.
   * Has precedence over {@link WithSectionFilter.filter}.
   */
  readonly exclude?: true | ReadonlyArray<string>;
};

/**
 * A record that maps option keys to depended option keys.
 */
export type OptionDependencies = Readonly<Record<string, string | ReadonlyArray<string>>>;

/**
 * Defines additional attributes for the usage section.
 */
export type WithSectionUsage = {
  /**
   * A list of option keys that should be considered always required.
   */
  readonly required?: ReadonlyArray<string>;
  /**
   * A record that maps option keys to required option keys.
   * @deprecated use {@link WithSectionUsage.inclusive} instead.
   */
  readonly requires?: Readonly<Record<string, string>>;
  /**
   * A record that specifies inclusive option dependencies.
   */
  readonly inclusive?: OptionDependencies;
  /**
   * Reserved for mutually exclusive option dependencies.
   */
  readonly exclusive?: never;
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
 * The help section types.
 */
export type HelpSectionType = 'text' | 'usage' | 'groups';

/**
 * A help text section.
 */
export type HelpTextSection = WithSection<'text'>;

/**
 * A help usage section.
 */
export type HelpUsageSection = WithSection<'usage'> & WithSectionFilter & WithSectionUsage;

/**
 * A help groups section.
 */
export type HelpGroupsSection = WithSection<'groups'> & WithSectionFilter & WithSectionGroups;

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
 * A record that maps option keys to required values.
 */
export type RequiresVal = { readonly [key: string]: unknown };

/**
 * An option requirement can be either:
 *
 * - an option key;
 * - a record that maps option keys to required values;
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
export type ParsingCallback<P, R = unknown> = CustomCallback<
  P,
  WithArgumentInfo & WithCompletionInfo,
  R
>;

/**
 * A callback for custom word completion.
 */
export type CompletionCallback = CustomCallback<
  string,
  WithArgumentInfo & WithPreviousInfo,
  Promissory<Array<string | ICompletionSuggestion>>
>;

/**
 * The type of nested options for a subcommand.
 */
export type NestedOptions = Promissory<Options> | (() => Promissory<Options>);

/**
 * The type of inline constraint.
 */
export type InlineConstraint = false | 'always' | Readonly<Record<string, false | 'always'>>;

/**
 * A non-callable value used in default values and parameter examples.
 */
export type NonCallable = boolean | string | number | object | null;

/**
 * Information about the current argument sequence in the parsing loop.
 */
export type WithArgumentInfo = {
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
   * The option name as supplied on the command-line, or the environment data source.
   * It will be the preferred name if the sequence comes from positional arguments.
   * It will be the string '0' if the sequence comes from the standard input.
   */
  name: string;
};

/**
 * Information about word completion, to be used by custom parsing callbacks.
 */
export type WithCompletionInfo = {
  /**
   * Whether word completion is in effect.
   */
  comp: boolean;
};

/**
 * Extra information about word completion, to be used by completion callbacks.
 */
export type WithPreviousInfo = {
  /**
   * The parameters preceding the word being completed, if any.
   */
  prev: Array<string>;
};

/**
 * A completion suggestion.
 *
 * It will be injected with additional properties by the parser:
 * - `type` - `'parameter'`
 * - `synopsis` - the option synopsis, if any
 * - `displayName` - the supplied option name
 *
 * We recommend also extending the `Suggestion` type from `@withfig/autocomplete-types`.
 */
export interface ICompletionSuggestion {
  /**
   * The suggestion name (or the value used for traditional shell completion).
   */
  name: string;
}

/**
 * Defines the type of an option.
 * @template T The option type
 */
export type WithOptionType<T extends OptionType> = {
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
   * Names cannot contain the equals sign `=`, since it may be used as option-parameter separator.
   * `null`s can be specified in order to skip the respective "slot" in the help message names column.
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
   * The option synopsis.
   */
  readonly synopsis?: StyledString;
  /**
   * The option deprecation notice.
   */
  readonly deprecated?: StyledString;
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
 * @template T The type of parse parameter
 */
export type WithOptionValue<T> = {
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
   * The default value is set at the end of the parsing loop if the option was not supplied. You may
   * use a callback to inspect parsed values and determine the default value based on those values.
   */
  readonly default?: NonCallable | DefaultValueCallback;
  /**
   * A custom callback for parsing the option parameter(s).
   */
  readonly parse?: ParsingCallback<T>;
};

/**
 * Defines attributes for options that may read data from the environment.
 */
export type WithEnvironment = {
  /**
   * The names of data sources to try reading from (in that order), if the option was not supplied
   * on the command line. A string means an environment variable, while a URL means a local file.
   *
   * This has precedence over {@link WithEnvironment.stdin}.
   */
  readonly sources?: ReadonlyArray<string | URL>;
  /**
   * True to read data from the standard input, if the option was not supplied.
   *
   * Warning: this may block the application if {@link WithOptionValue.required} is set and the
   * terminal is interactive.
   */
  readonly stdin?: true;
  /**
   * True to break the parsing loop after parsing the option.
   */
  readonly break?: true;
};

/**
 * Defines attributes for options that may have a template to be displayed in place of option
 * parameter(s) in help messages.
 */
export type WithTemplate = {
  /**
   * The example value to display in the parameter column or in usage statements.
   */
  readonly example?: NonCallable;
  /**
   * The parameter name to display in the parameter column or in usage statements.
   * Overrides {@link WithTemplate.example} in usage statements.
   */
  readonly paramName?: StyledString;
  /**
   * The parameter name to display in usage statements.
   * Overrides {@link WithTemplate.paramName} in usage statements.
   */
  readonly usageParamName?: StyledString;
};

/**
 * Defines attributes for options that may have parameters.
 */
export type WithParameter = {
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
   * It can also be a record that maps option names to one of the above, indicating whether the
   * corresponding name disallows or requires inline parameters.
   */
  readonly inline?: InlineConstraint;
  /**
   * A custom callback for word completion.
   */
  readonly complete?: CompletionCallback;
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
   * A record that maps parameter values to option values.
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
   * The version information (e.g., a semantic version).
   */
  readonly version?: StyledString;
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
   * Allows appending elements if supplied multiple times.
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
  readonly paramCount?: number | NumericRange;
  /**
   * The number of remaining arguments to skip.
   * It is meant to be changed by the callback. (The parser does not alter this value.)
   */
  skipCount?: number;
};

/**
 * An option that throws a help message.
 */
export type HelpOption = WithOptionType<'help'> & WithBasic & WithHelp & WithMessage;

/**
 * An option that throws a version message.
 */
export type VersionOption = WithOptionType<'version'> & WithVersion & WithBasic & WithMessage;

/**
 * An option that executes a command.
 */
export type CommandOption = WithOptionType<'command'> &
  WithCommand &
  WithBasic &
  WithOptionValue<OpaqueOptionValues> &
  WithTemplate &
  (WithDefault | WithRequired) &
  (WithExample | WithUsageParamName);

/**
 * An option that has a value, but is niladic.
 */
export type FlagOption = WithOptionType<'flag'> &
  WithFlag &
  WithBasic &
  WithOptionValue<null> &
  WithEnvironment &
  (WithDefault | WithRequired);

/**
 * An option that has a single value and requires a single parameter.
 */
export type SingleOption = WithOptionType<'single'> &
  WithSingle &
  WithBasic &
  WithOptionValue<string> &
  WithEnvironment &
  WithTemplate &
  WithParameter &
  WithSelection &
  (WithDefault | WithRequired) &
  (WithExample | WithUsageParamName) &
  (WithChoices | WithRegex);

/**
 * An option that has an array value and accepts zero or more parameters.
 */
export type ArrayOption = WithOptionType<'array'> &
  WithArray &
  WithBasic &
  WithOptionValue<string> &
  WithEnvironment &
  WithTemplate &
  WithParameter &
  WithSelection &
  (WithDefault | WithRequired) &
  (WithExample | WithUsageParamName) &
  (WithChoices | WithRegex);

/**
 * An option that has any value and can be configured with a parameter count.
 */
export type FunctionOption = WithOptionType<'function'> &
  WithFunction &
  WithBasic &
  WithOptionValue<Array<string>> &
  WithEnvironment &
  WithTemplate &
  WithParameter &
  (WithDefault | WithRequired) &
  (WithExample | WithUsageParamName);

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
export type OptionValues<T extends Options = Options> = Resolve<
  Readonly<{
    [key in keyof T as OptionKeyType<T[key], key>]: OptionDataType<T[key]>;
  }>
>;

/**
 * The message option types.
 */
export type MessageOptionType = 'help' | 'version';

/**
 * The niladic option types.
 */
export type NiladicOptionType = MessageOptionType | 'command' | 'flag';

/**
 * The option types.
 */
export type OptionType = NiladicOptionType | 'single' | 'array' | 'function';

/**
 * An opaque option definition.
 */
export type OpaqueOption = WithOptionType<OptionType> &
  WithBasic &
  WithHelp &
  WithVersion &
  WithCommand &
  WithFlag &
  WithFunction &
  WithMessage &
  WithOptionValue<any> & // eslint-disable-line @typescript-eslint/no-explicit-any
  WithEnvironment &
  WithTemplate &
  WithParameter &
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

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * An entry from the required values object.
 */
export type RequiresEntry = readonly [key: string, value: unknown];

/**
 * Information regarding an option.
 */
export type OptionInfo = [key: string, option: OpaqueOption, name: string];

/**
 * Removes mutually exclusive attributes from an option with the `required` attribute.
 */
type WithRequired = {
  /**
   * @deprecated mutually exclusive with {@link WithOptionValue.required}
   */
  readonly default?: never;
  /**
   * @deprecated mutually exclusive with {@link WithOptionValue.required}
   */
  readonly requiredIf?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `default` attribute.
 */
type WithDefault = {
  /**
   * @deprecated mutually exclusive with {@link WithOptionValue.default} and
   * {@link WithOptionValue.requiredIf}
   */
  readonly required?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `example` attribute.
 */
type WithExample = {
  /**
   * @deprecated mutually exclusive with {@link WithTemplate.example}.
   * Use {@link WithTemplate.paramName} in this case.
   */
  readonly usageParamName?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `usageParamName` attribute.
 */
type WithUsageParamName = {
  /**
   * @deprecated mutually exclusive with {@link WithTemplate.usageParamName}
   */
  readonly example?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `choices` attribute.
 */
type WithChoices = {
  /**
   * @deprecated mutually exclusive with {@link WithSelection.choices}
   */
  readonly regex?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `regex` attribute.
 */
type WithRegex = {
  /**
   * @deprecated mutually exclusive with {@link WithSelection.regex}
   */
  readonly choices?: never;
};

/**
 * The data type of a value that may have to be enforced to be an array.
 * @template T The option definition type
 * @template V The actual data type
 */
type ArrayDataType<T extends Option, V> =
  T extends WithOptionType<'array'> ? (V extends ReadonlyArray<infer _> ? V : readonly [V]) : V;

/**
 * The data type of a value that may be a function or promise.
 * @template T The actual data type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReturnDataType<T> = T extends (...args: any) => infer R ? Awaited<R> : Awaited<T>;

/**
 * The data type of an option that may have a default value.
 * @template T The option definition type
 */
type DefaultDataType<T extends Option> = T extends { required: true }
  ? never
  : T extends { default: infer D }
    ? ArrayDataType<T, ReturnDataType<D>>
    : undefined;

/**
 * The data type of a value that mey be a set of option definitions.
 * @template T The actual data type
 */
type OptionsDataType<T> = T extends Options ? T : never;

/**
 * The data type of an option that may have nested options.
 * @template T The option definition type
 */
type NestedOptionsDataType<T extends Option> = T extends { options: infer O }
  ? OptionValues<OptionsDataType<ReturnDataType<O>>>
  : Record<never, never>;

/**
 * The data type of an option that may have a parsing callback.
 * @template T The option definition type
 * @template F The fallback data type
 */
type ParseDataType<T extends Option, F> = T extends { parse: infer D } ? ReturnDataType<D> : F;

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
  T extends WithOptionType<'command'>
    ? ParseDataType<T, NestedOptionsDataType<T>>
    : T extends WithOptionType<'flag'>
      ? ParseDataType<T, true>
      : T extends WithOptionType<'single'>
        ? SelectionDataType<T>
        : T extends WithOptionType<'array'>
          ? ReadonlyArray<SelectionDataType<T>>
          : ParseDataType<T, ReadonlyArray<string>>;

/**
 * The data type of an option that throws a message.
 * @template T The option definition type
 */
type MessageDataType<T extends Option> = T extends { saveMessage: true }
  ? AnsiMessage | undefined
  : never;

/**
 * The data type of an option key.
 * @template T The option definition type
 * @template K The original key type
 */
type OptionKeyType<T extends Option, K> = T extends WithOptionType<MessageOptionType> & {
  saveMessage?: undefined;
}
  ? never
  : K;

/**
 * The data type of an option value.
 * @template T The option definition type
 */
type OptionDataType<T extends Option> =
  T extends WithOptionType<'help' | 'version'>
    ? MessageDataType<T>
    : ValueDataType<T> | DefaultDataType<T>;
