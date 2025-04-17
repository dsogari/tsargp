//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { HelpItem } from './enums.js';
import type { AnsiMessage, Style, StyledString, TextAlignment } from './styles.js';
import type { Promissory, Resolve } from './utils.js';

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
 * Defines layout attributes common to all help columns.
 */
export type WithBasicLayout = {
  /**
   * The type of text alignment.
   * @default 'left'
   */
  readonly align?: TextAlignment;
  /**
   * The column indentation level.
   * @default 2
   */
  readonly indent?: number;
  /**
   * The number of leading line feeds.
   * @default 0
   */
  readonly breaks?: number;
  /**
   * The maximum column or slot width.
   * @default Infinity
   */
  readonly maxWidth?: number;
  /**
   * @deprecated Mutually exclusive with {@link WithBasicLayout} properties.
   */
  readonly merge?: never;
};

/**
 * Defines layout attributes for columns that can be slotted.
 */
export type WithSlottedLayout = {
  /**
   * The slot indentation level, or zero or `NaN` to disable slots.
   * Does not apply to the first slot. Ignored if the column is merged.
   * @default 0
   */
  readonly slotIndent?: number;
};

/**
 * Defines layout attributes for columns that can be indented with absolute number.
 */
export type WithAbsoluteLayout = {
  /**
   * Whether the indentation level should be relative to the beginning of the line.
   * @default false
   */
  readonly absolute?: boolean;
};

/**
 * Defines layout attributes for columns that can be merged with previous columns.
 */
export type WithMergedLayout = {
  /**
   * True to merge the column with the previous one.
   * Text alignment and indentation will be that of the last previous non-merged column.
   * @default false
   */
  readonly merge: true;
  /**
   * The number of leading line feeds.
   * @default 0
   */
  readonly breaks?: number;
  /**
   * @deprecated Mutually exclusive with {@link WithMergedLayout.merge}.
   */
  readonly align?: never;
  /**
   * @deprecated Mutually exclusive with {@link WithMergedLayout.merge}.
   */
  readonly indent?: never;
  /**
   * @deprecated Mutually exclusive with {@link WithMergedLayout.merge}.
   */
  readonly maxWidth?: never;
  /**
   * @deprecated Mutually exclusive with {@link WithMergedLayout.merge}.
   */
  readonly slotIndent?: never;
  /**
   * @deprecated Mutually exclusive with {@link WithMergedLayout.merge}.
   */
  readonly absolute?: never;
};

/**
 * Defines attributes for a help text block.
 */
export type HelpTextBlock = {
  /**
   * The text.
   */
  readonly text?: StyledString;
  /**
   * The fallback style.
   */
  readonly style?: Style;
  /**
   * The text alignment.
   * @default 'left'
   */
  readonly align?: TextAlignment;
  /**
   * The indentation level.
   * @default 0
   */
  readonly indent?: number;
  /**
   * The number of leading line feeds.
   * @default 0
   */
  readonly breaks?: number;
  /**
   * Whether to disable text splitting. Ignored if the text is a ANSI string.
   * @default false
   */
  readonly noSplit?: boolean;
  /**
   * Whether to avoid line feeds at the beginning of the message.
   * @default false
   */
  readonly noBreakFirst?: boolean;
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
export type HelpSectionFilter = {
  /**
   * A list of option keys to include. Matches are exact.
   */
  readonly includeOptions?: ReadonlyArray<string>;
  /**
   * A list of group names to include. Matches are exact.
   */
  readonly includeGroups?: ReadonlyArray<string>;
  /**
   * A list of option keys to exclude. Matches are exact.
   * Has precedence over {@link HelpSectionFilter.includeOptions}.
   */
  readonly excludeOptions?: ReadonlyArray<string>;
  /**
   * A list of group names to exclude. Matches are exact.
   * Has precedence over {@link HelpSectionFilter.includeGroups}.
   */
  readonly excludeGroups?: ReadonlyArray<string>;
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
   * The section filter.
   */
  readonly filter?: HelpSectionFilter;
  /**
   * A list of option keys that should be considered always required.
   */
  readonly required?: ReadonlyArray<string>;
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
  readonly comment?: StyledString;
  /**
   * Whether to keep alternatives compact.
   * @default true
   */
  readonly compact?: boolean;
};

/**
 * The layout settings of a groups section.
 */
export type HelpLayout = {
  /**
   * The layout settings for the names column.
   * Use the value `null` to hide it from the help message.
   */
  readonly names?: (WithBasicLayout & WithSlottedLayout) | null;
  /**
   * The layout settings for the parameter column.
   * Use the value `null` to hide it from the help message.
   */
  readonly param?: (WithBasicLayout & WithAbsoluteLayout) | null | WithMergedLayout;
  /**
   * The layout settings for the description column.
   * Use the value `null` to hide it from the help message.
   */
  readonly descr?: (WithBasicLayout & WithAbsoluteLayout) | null | WithMergedLayout;
  /**
   * The (order of) items to display in option descriptions.
   */
  readonly items?: HelpItems;
  /**
   * Whether the layout is responsive (a.k.a, terminal-aware).
   * @default true
   */
  readonly responsive?: boolean;
};

/**
 * Defines additional attributes for the groups section.
 */
export type WithSectionGroups = {
  /**
   * The section filter.
   */
  readonly filter?: HelpSectionFilter;
  /**
   * The section layout settings.
   */
  readonly layout?: HelpLayout;
  /**
   * Whether option names should be replaced by environment variable names.
   * @default false
   */
  readonly useEnv?: boolean;
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
export type HelpUsageSection = WithSection<'usage'> & WithSectionUsage;

/**
 * A help groups section.
 */
export type HelpGroupsSection = WithSection<'groups'> & WithSectionGroups;

/**
 * A help section.
 */
export type HelpSection = HelpTextSection | HelpUsageSection | HelpGroupsSection;

/**
 * A list of help sections.
 */
export type HelpSections = ReadonlyArray<HelpSection>;

/**
 * A list of help items.
 */
export type HelpItems = ReadonlyArray<HelpItem>;

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
export type WithBasicAttributes = {
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
   * If not specified, the first name in the {@link WithBasicAttributes.names} array will be used.
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
   * Use the value `null` to hide it from the help message.
   */
  readonly group?: string | null;
  /**
   * The option display styles.
   */
  readonly styles?: OptionStyles;
  /**
   * The option-specific layout settings.
   */
  readonly layout?: HelpLayout;
  /**
   * A hyperlink to an external resource.
   */
  readonly link?: URL;
};

/**
 * Defines attributes for options that throw messages.
 */
export type WithMessageAttributes = {
  /**
   * Whether to save the message in the option value instead of throwing it.
   * @default false
   */
  readonly saveMessage?: boolean;
};

/**
 * Defines attributes common to options that have values.
 * @template T The type of parse parameter
 */
export type WithValueAttributes<T> = {
  /**
   * The letters used for clustering in short-option style (e.g., 'fF').
   */
  readonly cluster?: string;
  /**
   * True if the option is always required.
   * @default false
   */
  readonly required?: boolean;
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
export type WithEnvironmentAttributes = {
  /**
   * The names of data sources to try reading from (in that order), if the option was not supplied
   * on the command line. A string means an environment variable, while a URL means a local file.
   *
   * This has precedence over {@link WithEnvironmentAttributes.stdin}.
   */
  readonly sources?: ReadonlyArray<string | URL>;
  /**
   * True to read data from the standard input, if the option was not supplied.
   *
   * Warning: this may block the application if {@link WithValueAttributes.required} is set and the
   * terminal is interactive.
   * @default false
   */
  readonly stdin?: boolean;
  /**
   * True to break the parsing loop after parsing the option.
   * @default false
   */
  readonly break?: boolean;
};

/**
 * Defines attributes for options that may have a template to be displayed in place of option
 * parameter(s) in help messages.
 */
export type WithTemplateAttributes = {
  /**
   * The example value to display in the parameter column or in usage statements.
   */
  readonly example?: NonCallable;
  /**
   * The parameter name to display in the parameter column or in usage statements.
   * Overrides {@link WithTemplateAttributes.example} in usage statements.
   */
  readonly paramName?: StyledString;
  /**
   * The parameter name to display in usage statements.
   * Overrides {@link WithTemplateAttributes.example} and {@link WithTemplateAttributes.paramName}
   * in usage statements.
   */
  readonly usageParamName?: StyledString;
};

/**
 * Defines attributes for options that may have parameters.
 */
export type WithParameterAttributes = {
  /**
   * Whether the option accepts positional arguments. The following values may be used:
   *
   * - `true` - any argument not recognized as an option name will be considered positional
   * - `string` - all arguments beyond the positional marker will be considered positional
   *
   * If there are multiple positional options, their declaration order determines their relative
   * position in the command line. Variadic options will take up all remaining positional arguments
   * (up to the positional marker, if any). At most one option can have a positional marker.
   *
   * We recommend also setting {@link WithBasicAttributes.preferredName} to some explanatory name.
   * @default false
   */
  readonly positional?: boolean | string;
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
export type WithSelectionAttributes = {
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
export type WithHelpAttributes = {
  /**
   * The help sections to be rendered.
   */
  readonly sections?: HelpSections;
  /**
   * Whether to use the next argument as the name of a subcommand.
   * Has precedence over {@link WithHelpAttributes.useFilter}.
   * @default false
   */
  readonly useCommand?: boolean;
  /**
   * Whether to use the remaining arguments as option filter.
   * @default false
   */
  readonly useFilter?: boolean;
};

/**
 * Defines attributes for the version option.
 */
export type WithVersionAttributes = {
  /**
   * The version information (e.g., a semantic version).
   */
  readonly version?: StyledString;
};

/**
 * Defines attributes for the command option.
 */
export type WithCommandAttributes = {
  /**
   * The subcommand's options.
   * It can also be a module path or a callback that returns the options.
   */
  readonly options?: NestedOptions;
  /**
   * The prefix of cluster arguments.
   * If set, then eligible arguments that have this prefix will be considered a cluster.
   * Has precedence over {@link WithCommandAttributes.optionPrefix}.
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
export type WithFlagAttributes = unknown; // disappears in type intersection

/**
 * Defines attributes common to single-valued options.
 */
export type WithSingleAttributes = unknown; // disappears in type intersection

/**
 * Defines attributes common to array-valued options.
 */
export type WithArrayAttributes = {
  /**
   * The parameter value separator.
   */
  readonly separator?: string | RegExp;
  /**
   * True if duplicate elements should be removed.
   * @default false
   */
  readonly unique?: boolean;
  /**
   * Allows appending elements if supplied multiple times.
   * @default false
   */
  readonly append?: boolean;
  /**
   * The maximum allowed number of elements.
   * @default Infinity
   */
  readonly limit?: number;
};

/**
 * Defines attributes for the function option.
 */
export type WithFunctionAttributes = {
  /**
   * The function's parameter count:
   *
   * - If unspecified or `Infinity`, the option accepts unlimited parameters.
   * - If zero, the option accepts unknown number of parameters
   *   (use with {@link WithFunctionAttributes.skipCount}).
   * - If positive, then the option expects exactly this number of parameters.
   * - If a range, then the option expects between `min` and `max` parameters.
   * @default Infinity
   */
  readonly paramCount?: number | NumericRange;
  /**
   * The number of remaining arguments to skip.
   * It is meant to be changed by the callback. (The parser does not alter this value.)
   * @default 0
   */
  skipCount?: number;
};

/**
 * An option that throws a help message.
 */
export type HelpOption = WithOptionType<'help'> &
  WithBasicAttributes &
  WithHelpAttributes &
  WithMessageAttributes;

/**
 * An option that throws a version message.
 */
export type VersionOption = WithOptionType<'version'> &
  WithVersionAttributes &
  WithBasicAttributes &
  WithMessageAttributes;

/**
 * An option that executes a command.
 */
export type CommandOption = WithOptionType<'command'> &
  WithCommandAttributes &
  WithBasicAttributes &
  WithValueAttributes<OpaqueOptionValues> &
  WithTemplateAttributes &
  (WithDefault | WithRequired);

/**
 * An option that has a value, but is niladic.
 */
export type FlagOption = WithOptionType<'flag'> &
  WithFlagAttributes &
  WithBasicAttributes &
  WithValueAttributes<null> &
  WithEnvironmentAttributes &
  (WithDefault | WithRequired);

/**
 * An option that has a single value and requires a single parameter.
 */
export type SingleOption = WithOptionType<'single'> &
  WithSingleAttributes &
  WithBasicAttributes &
  WithValueAttributes<string> &
  WithEnvironmentAttributes &
  WithTemplateAttributes &
  WithParameterAttributes &
  WithSelectionAttributes &
  (WithDefault | WithRequired) &
  (WithChoices | WithRegex);

/**
 * An option that has an array value and accepts zero or more parameters.
 */
export type ArrayOption = WithOptionType<'array'> &
  WithArrayAttributes &
  WithBasicAttributes &
  WithValueAttributes<string> &
  WithEnvironmentAttributes &
  WithTemplateAttributes &
  WithParameterAttributes &
  WithSelectionAttributes &
  (WithDefault | WithRequired) &
  (WithChoices | WithRegex);

/**
 * An option that has any value and can be configured with a parameter count.
 */
export type FunctionOption = WithOptionType<'function'> &
  WithFunctionAttributes &
  WithBasicAttributes &
  WithValueAttributes<Array<string>> &
  WithEnvironmentAttributes &
  WithTemplateAttributes &
  WithParameterAttributes &
  (WithDefault | WithRequired);

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
  WithBasicAttributes &
  WithHelpAttributes &
  WithVersionAttributes &
  WithCommandAttributes &
  WithFlagAttributes &
  WithFunctionAttributes &
  WithMessageAttributes &
  WithValueAttributes<any> & // eslint-disable-line @typescript-eslint/no-explicit-any
  WithEnvironmentAttributes &
  WithTemplateAttributes &
  WithParameterAttributes &
  WithSelectionAttributes &
  WithArrayAttributes;

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
   * @deprecated mutually exclusive with {@link WithValueAttributes.required}
   */
  readonly default?: never;
  /**
   * @deprecated mutually exclusive with {@link WithValueAttributes.required}
   */
  readonly requiredIf?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `default` attribute.
 */
type WithDefault = {
  /**
   * @deprecated mutually exclusive with {@link WithValueAttributes.default} and
   * {@link WithValueAttributes.requiredIf}
   */
  readonly required?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `choices` attribute.
 */
type WithChoices = {
  /**
   * @deprecated mutually exclusive with {@link WithSelectionAttributes.choices}
   */
  readonly regex?: never;
};

/**
 * Removes mutually exclusive attributes from an option with the `regex` attribute.
 */
type WithRegex = {
  /**
   * @deprecated mutually exclusive with {@link WithSelectionAttributes.regex}
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
