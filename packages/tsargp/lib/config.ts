//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { Style } from './styles.js';
import type { PartialWithDepth } from './utils.js';

import { style } from './styles.js';
import { fg, ConnectiveWord, ErrorItem, HelpItem } from './enums.js';

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
  errorPhrases: {
    [ErrorItem.unknownOption]: 'Unknown option #0.(| Similar names are: #1.)',
    [ErrorItem.unsatisfiedRequirement]: 'Option #0 requires #1.',
    [ErrorItem.missingRequiredOption]: 'Option #0 is required.',
    [ErrorItem.mismatchedParamCount]:
      'Wrong number of parameters to option #0: requires (exactly|at least|at most|between) #1.',
    [ErrorItem.missingPackageJson]: 'Could not find a "package.json" file.',
    [ErrorItem.disallowedInlineParameter]:
      '(Option|Positional marker) #0 does not accept inline parameters.',
    [ErrorItem.choiceConstraintViolation]: 'Invalid parameter to #0: #1. Value must be one of: #2.',
    [ErrorItem.regexConstraintViolation]:
      'Invalid parameter to #0: #1. Value must match the regex #2.',
    [ErrorItem.limitConstraintViolation]:
      'Option #0 has too many values: #1. Should have at most #2.',
    [ErrorItem.deprecatedOption]: 'Option #0 is deprecated and may be removed in future releases.',
    [ErrorItem.unsatisfiedCondRequirement]: 'Option #0 is required if #1.',
    [ErrorItem.invalidClusterOption]: 'Option letter #0 must be the last in a cluster.',
    [ErrorItem.missingInlineParameter]: 'Option #0 requires an inline parameter.',
    [ErrorItem.invalidOptionName]: 'Option #0 has invalid name #1.',
    [ErrorItem.invalidSelfRequirement]: 'Option #0 requires itself.',
    [ErrorItem.unknownRequiredOption]: 'Unknown option #0 in requirement.',
    [ErrorItem.invalidRequiredOption]: 'Invalid option #0 in requirement.',
    [ErrorItem.invalidRequiredValue]:
      'Invalid required value for option #0. Option is always required or has a default value.',
    [ErrorItem.duplicateOptionName]: 'Option #0 has duplicate name #1.',
    [ErrorItem.duplicatePositionalOption]: 'Duplicate positional option #0: previous was #1.',
    [ErrorItem.duplicateChoiceValue]: 'Option #0 has duplicate choice #1.',
    [ErrorItem.duplicateClusterLetter]: 'Option #0 has duplicate cluster letter #1.',
    [ErrorItem.invalidClusterLetter]: 'Option #0 has invalid cluster letter #1.',
    [ErrorItem.tooSimilarOptionNames]: '#0: Option name #1 has too similar names: #2.',
    [ErrorItem.mixedNamingConvention]: '#0: Name slot #1 has mixed naming conventions: #2.',
    [ErrorItem.invalidParamCount]: 'Option #0 has invalid parameter count #1.',
    [ErrorItem.variadicWithClusterLetter]:
      'Variadic option #0 may only appear as the last option in a cluster.',
    [ErrorItem.invalidInlineConstraint]: 'Option #0 has invalid inline constraint.',
  },
  helpPhrases: {
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
};

/**
 * The default help column layout.
 */
const defaultHelpColumn: WithColumnLayout = {
  align: 'left',
  indent: 2,
  breaks: 0,
  hidden: false,
};

/**
 * The default help layout.
 */
export const defaultHelpLayout: HelpLayout = {
  names: defaultHelpColumn,
  param: { ...defaultHelpColumn, absolute: false },
  descr: { ...defaultHelpColumn, absolute: false },
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
};

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * The message configuration.
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
  /**
   * The custom error phrases.
   */
  readonly errorPhrases: Readonly<Record<ErrorItem, string>>;
  /**
   * The custom help phrases.
   */
  readonly helpPhrases: Readonly<Record<HelpItem, string>>;
};

/**
 * A partial message configuration.
 */
export type PartialMessageConfig = PartialWithDepth<MessageConfig>;

/**
 * A partial help layout.
 */
export type PartialHelpLayout = PartialWithDepth<HelpLayout>;

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
 * A text alignment setting.
 */
type Alignment = 'left' | 'right';

/**
 * Defines layout attributes common to all help columns.
 * @template A The type of text alignment
 */
type WithColumnLayout<A extends string = Alignment> = {
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
 * Defines layout attributes for columns that may be preceded by other columns.
 */
type WithAbsoluteLayout = {
  /**
   * Whether the indentation level should be relative to the beginning of the line instead of the
   * end of the previous column. (Defaults to false)
   */
  readonly absolute: boolean;
};

/**
 * The help layout.
 */
export type HelpLayout = {
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
  /**
   * The order of items to be shown in the option description.
   */
  readonly items: ReadonlyArray<HelpItem>;
};
