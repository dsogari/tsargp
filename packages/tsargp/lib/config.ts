//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { Style } from './styles.js';
import type { PartialWithDepth } from './utils.js';

import { style } from './styles.js';
import { fg, ConnectiveWord, HelpItem, ParsingError, ValidationError } from './enums.js';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The default message configuration.
 */
export const defaultMessageConfig: MessageConfig = {
  styles: {
    boolean: style(fg.blue),
    string: style(fg.green),
    number: style(fg.yellow),
    regex: style(fg.red),
    symbol: style(fg.magenta),
    value: style(fg.brightBlack),
    url: style(fg.cyan),
    text: '',
  },
  connectives: {
    [ConnectiveWord.and]: 'and',
    [ConnectiveWord.or]: 'or',
    [ConnectiveWord.not]: 'not',
    [ConnectiveWord.no]: 'no',
    [ConnectiveWord.equals]: '==',
    [ConnectiveWord.notEquals]: '!=',
    [ConnectiveWord.optionAlt]: '|',
    [ConnectiveWord.optionSep]: ',',
    [ConnectiveWord.stringQuote]: `'`,
    [ConnectiveWord.arraySep]: ',',
    [ConnectiveWord.arrayOpen]: '[',
    [ConnectiveWord.arrayClose]: ']',
    [ConnectiveWord.objectSep]: ',',
    [ConnectiveWord.objectOpen]: '{',
    [ConnectiveWord.objectClose]: '}',
    [ConnectiveWord.valueSep]: ':',
    [ConnectiveWord.valueOpen]: '<',
    [ConnectiveWord.valueClose]: '>',
    [ConnectiveWord.exprOpen]: '(',
    [ConnectiveWord.exprClose]: ')',
  },
} as const;

/**
 * The default configuration used by the parser.
 */
export const defaultParserConfig: ParserConfig = {
  ...defaultMessageConfig,
  phrases: {
    [ParsingError.unknownOption]: 'Unknown option #0.(| Similar names are: #1.)',
    [ParsingError.unsatisfiedRequirement]: 'Option #0 requires #1.',
    [ParsingError.missingRequiredOption]: 'Option #0 is required.',
    [ParsingError.mismatchedParamCount]:
      'Wrong number of parameters to option #0: requires (exactly|at least|at most|between) #1.',
    [ParsingError.missingPackageJson]: 'Could not find a "package.json" file.',
    [ParsingError.disallowedInlineParameter]:
      '(Option|Positional marker) #0 does not accept inline parameters.',
    [ParsingError.choiceConstraintViolation]:
      'Invalid parameter to #0: #1. Value must be one of: #2.',
    [ParsingError.regexConstraintViolation]:
      'Invalid parameter to #0: #1. Value must match the regex #2.',
    [ParsingError.limitConstraintViolation]:
      'Option #0 has too many values: #1. Should have at most #2.',
    [ParsingError.deprecatedOption]:
      'Option #0 is deprecated and may be removed in future releases.',
    [ParsingError.unsatisfiedCondRequirement]: 'Option #0 is required if #1.',
    [ParsingError.invalidClusterOption]: 'Option letter #0 must be the last in a cluster.',
    [ParsingError.missingInlineParameter]: 'Option #0 requires an inline parameter.',
  },
};

/**
 * The default configuration used by the validator.
 */
export const defaultValidatorConfig: ValidatorConfig = {
  ...defaultMessageConfig,
  phrases: {
    [ValidationError.invalidOptionName]: 'Option #0 has invalid name #1.',
    [ValidationError.invalidSelfRequirement]: 'Option #0 requires itself.',
    [ValidationError.unknownRequiredOption]: 'Unknown option #0 in requirement.',
    [ValidationError.invalidRequiredOption]: 'Invalid option #0 in requirement.',
    [ValidationError.invalidRequiredValue]:
      'Invalid required value for option #0. Option is always required or has a default value.',
    [ValidationError.duplicateOptionName]: 'Option #0 has duplicate name #1.',
    [ValidationError.duplicatePositionalOption]: 'Duplicate positional option #0: previous was #1.',
    [ValidationError.duplicateChoiceValue]: 'Option #0 has duplicate choice #1.',
    [ValidationError.duplicateClusterLetter]: 'Option #0 has duplicate cluster letter #1.',
    [ValidationError.invalidClusterLetter]: 'Option #0 has invalid cluster letter #1.',
    [ValidationError.tooSimilarOptionNames]: '#0: Option name #1 has too similar names: #2.',
    [ValidationError.mixedNamingConvention]: '#0: Name slot #1 has mixed naming conventions: #2.',
    [ValidationError.invalidParamCount]: 'Option #0 has invalid parameter count #1.',
    [ValidationError.variadicWithClusterLetter]:
      'Variadic option #0 may only appear as the last option in a cluster.',
    [ValidationError.invalidInlineConstraint]: 'Option #0 has invalid inline constraint.',
  },
};

/**
 * The default column configuration.
 */
const defaultColumn: WithColumn = {
  align: 'left',
  indent: 2,
  breaks: 0,
  hidden: false,
};

/**
 * The default configuration used by the formatter.
 */
export const defaultFormatterConfig: FormatterConfig = {
  ...defaultMessageConfig,
  names: defaultColumn,
  param: { ...defaultColumn, absolute: false },
  descr: { ...defaultColumn, absolute: false },
  phrases: {
    [HelpItem.synopsis]: '#0',
    [HelpItem.separator]: 'Values can be delimited with #0.',
    [HelpItem.paramCount]: 'Accepts (multiple|#0|at most #0|at least #0|between #0) parameters.',
    [HelpItem.positional]: 'Accepts positional arguments(| that may be preceded by #0).',
    [HelpItem.append]: 'Can be specified multiple times.',
    [HelpItem.choices]: 'Values must be one of #0.',
    [HelpItem.regex]: 'Values must match the regex #0.',
    [HelpItem.unique]: 'Duplicate values will be removed.',
    [HelpItem.limit]: 'Element count is limited to #0.',
    [HelpItem.requires]: 'Requires #0.',
    [HelpItem.required]: 'Always required.',
    [HelpItem.default]: 'Defaults to #0.',
    [HelpItem.deprecated]: 'Deprecated for #0.',
    [HelpItem.link]: 'Refer to #0 for details.',
    [HelpItem.stdin]: 'Reads data from standard input.',
    [HelpItem.sources]: 'Reads environment data from #0.',
    [HelpItem.requiredIf]: 'Required if #0.',
    [HelpItem.cluster]: 'Can be clustered with #0.',
    [HelpItem.useCommand]: 'Uses the next argument as the name of a subcommand.',
    [HelpItem.useFilter]: 'Uses the remaining arguments as option filter.',
    [HelpItem.inline]: '(Disallows|Requires) inline parameters.',
  },
  items: [
    HelpItem.synopsis,
    HelpItem.cluster,
    HelpItem.separator,
    HelpItem.paramCount,
    HelpItem.positional,
    HelpItem.inline,
    HelpItem.append,
    HelpItem.choices,
    HelpItem.regex,
    HelpItem.unique,
    HelpItem.limit,
    HelpItem.stdin,
    HelpItem.sources,
    HelpItem.requires,
    HelpItem.required,
    HelpItem.requiredIf,
    HelpItem.default,
    HelpItem.useCommand,
    HelpItem.useFilter,
    HelpItem.deprecated,
    HelpItem.link,
  ],
  filter: [],
};

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A partial help configuration.
 */
export type PartialHelpConfig = PartialWithDepth<HelpConfig>;

/**
 * A formatter configuration.
 */
export type FormatterConfig = MessageConfig & HelpConfig;

/**
 * A partial parser configuration.
 */
export type PartialParserConfig = PartialWithDepth<ParserConfig>;

/**
 * A partial validator configuration.
 */
export type PartialValidatorConfig = PartialWithDepth<ValidatorConfig>;

/**
 * A partial formatter configuration.
 */
export type PartialFormatterConfig = PartialWithDepth<FormatterConfig>;

/**
 * The configuration for messages.
 */
export type MessageConfig = {
  /**
   * The messages styles.
   */
  readonly styles: MessageStyles;
  /**
   * The connective words.
   */
  readonly connectives: Readonly<Record<ConnectiveWord, string>>;
};

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * A set of styles for error/warning/help messages.
 */
type MessageStyles = {
  /**
   * The style of boolean values.
   */
  readonly boolean: Style;
  /**
   * The style of string values.
   */
  readonly string: Style;
  /**
   * The style of number values.
   */
  readonly number: Style;
  /**
   * The style of regular expressions.
   */
  readonly regex: Style;
  /**
   * The style of symbols (e.g., option names).
   */
  readonly symbol: Style;
  /**
   * The style of unknown values.
   */
  readonly value: Style;
  /**
   * The style of URLs.
   */
  readonly url: Style;
  /**
   * The style of general text.
   */
  readonly text: Style;
};

/**
 * The configuration for error/warning messages.
 */
type ParserConfig = MessageConfig & {
  /**
   * The parse error/warning phrases.
   */
  readonly phrases: Readonly<Record<ParsingError, string>>;
};

/**
 * The configuration for error/warning messages.
 */
type ValidatorConfig = MessageConfig & {
  /**
   * The parse error/warning phrases.
   */
  readonly phrases: Readonly<Record<ValidationError, string>>;
};

/**
 * A text alignment setting.
 */
type Alignment = 'left' | 'right';

/**
 * Defines attributes common to all help columns.
 * @template A The type of text alignment
 */
type WithColumn<A extends string = Alignment> = {
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
type WithAbsolute = {
  /**
   * Whether the indentation level should be relative to the beginning of the line instead of the
   * end of the previous column. (Defaults to false)
   */
  readonly absolute: boolean;
};

/**
 * The help configuration.
 */
type HelpConfig = {
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
