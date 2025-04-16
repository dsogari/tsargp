//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { Style } from './styles.js';

import { fg, ErrorItem, HelpItem } from './enums.js';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The default message configuration.
 */
export const config: MessageConfig = {
  styles: {
    boolean: [fg.blue],
    string: [fg.green],
    number: [fg.yellow],
    regex: [fg.red],
    symbol: [fg.magenta],
    value: [fg.brightBlack],
    url: [fg.cyan],
    error: [fg.brightRed],
    base: [],
  },
  connectives: {
    and: 'and',
    or: 'or',
    not: 'not',
    no: 'no',
    equals: '==',
    notEquals: '!=',
    optionAlt: '|',
    optionSep: ',',
    stringQuote: `'`,
    arraySep: ',',
    arrayOpen: '[',
    arrayClose: ']',
    objectSep: ',',
    objectOpen: '{',
    objectClose: '}',
    valueSep: ':',
    valueOpen: '<',
    valueClose: '>',
    exprOpen: '(',
    exprClose: ')',
    optionalOpen: '[',
    optionalClose: ']',
  },
  errorPhrases: {
    [ErrorItem.unknownOption]: 'Unknown option #0.(| Similar names are: #1.)',
    [ErrorItem.unsatisfiedRequirement]: 'Option #0 requires #1.',
    [ErrorItem.missingRequiredOption]: 'Option #0 is required.',
    [ErrorItem.missingParameter]:
      'Missing parameter(s) to option #0: requires (exactly|at least|between) #1.',
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
    [ErrorItem.duplicateParameterChoice]: 'Option #0 has duplicate choice #1.',
    [ErrorItem.tooSimilarOptionNames]: '#0: Option name #1 has too similar names: #2.',
    [ErrorItem.mixedNamingConvention]: '#0: Name slot #1 has mixed naming conventions: #2.',
    [ErrorItem.invalidParamCount]: 'Option #0 has invalid parameter count #1.',
    [ErrorItem.variadicWithClusterLetter]:
      'Variadic option #0 may only appear at the end of a cluster.',
    [ErrorItem.invalidInlineConstraint]: 'Option #0 has invalid inline constraint.',
    [ErrorItem.invalidOption]: 'Option #0 is not suppliable.',
  },
  helpPhrases: {
    [HelpItem.synopsis]: '#0',
    [HelpItem.separator]: 'Values can be delimited with #0.',
    [HelpItem.paramCount]: 'Accepts (multiple|#0|at most #0|at least #0|between #0) parameters.',
    [HelpItem.positional]: 'Accepts positional arguments(| that may be preceded by #0).',
    [HelpItem.append]: 'Can be supplied multiple times.',
    [HelpItem.choices]: 'Values must be one of #0.',
    [HelpItem.regex]: 'Values must match the regex #0.',
    [HelpItem.unique]: 'Duplicate values will be removed.',
    [HelpItem.limit]: 'Element count is limited to #0.',
    [HelpItem.requires]: 'Requires #0.',
    [HelpItem.required]: 'Always required.',
    [HelpItem.default]: 'Defaults to #0.',
    [HelpItem.deprecated]: 'Deprecated for #0.',
    [HelpItem.link]: 'Refer to #0 for details.',
    [HelpItem.stdin]: '(If not supplied, will|Will) be read from the standard input.',
    [HelpItem.sources]: 'If not supplied on the command line, will be read from #0.',
    [HelpItem.requiredIf]: 'Required if #0.',
    [HelpItem.cluster]: 'Can be clustered with #0.',
    [HelpItem.useCommand]: 'Uses the next argument as the name of a subcommand.',
    [HelpItem.useFilter]: 'Uses the remaining arguments as option filter.',
    [HelpItem.inline]: '(Disallows|Requires) inline parameters.',
    [HelpItem._count]: '', // to satisfy the compiler
  },
};

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A set of styles for error/warning/help messages.
 */
export type MessageStyles = {
  /**
   * The style of boolean values.
   */
  boolean: Style;
  /**
   * The style of string values.
   */
  string: Style;
  /**
   * The style of number values.
   */
  number: Style;
  /**
   * The style of regular expressions.
   */
  regex: Style;
  /**
   * The style of symbols (e.g., option names).
   */
  symbol: Style;
  /**
   * The style of unknown values.
   */
  value: Style;
  /**
   * The style of URLs.
   */
  url: Style;
  /**
   * The base style for error messages.
   */
  error: Style;
  /**
   * The base style for all text.
   */
  base: Style;
};

/**
 * The connective words used in option requirements and other places.
 * Inline styles and line breaks are not supported.
 */
export type ConnectiveWords = {
  /**
   * The word used to connect two logical expressions in conjunction.
   */
  and: string;
  /**
   * The word used to connect two logical expressions in disjunction.
   */
  or: string;
  /**
   * The word used to connect a logical expression in negation.
   */
  not: string;
  /**
   * The word used to connect a logical expression in non-existence.
   */
  no: string;
  /**
   * The word used to connect two expressions in equality comparison.
   */
  equals: string;
  /**
   * The word used to connect two expressions in non-equality comparison.
   */
  notEquals: string;
  /**
   * The word used to connect two option names in alternation.
   */
  optionAlt: string;
  /**
   * The word used to connect two option names in succession.
   */
  optionSep: string;
  /**
   * The quote character used to enclose a string value.
   */
  stringQuote: string;
  /**
   * The word used to connect two array elements in succession.
   */
  arraySep: string;
  /**
   * The bracket character used to open an array value.
   */
  arrayOpen: string;
  /**
   * The bracket character used to close an array value.
   */
  arrayClose: string;
  /**
   * The word used to connect two object entries in succession.
   */
  objectSep: string;
  /**
   * The bracket character used to open an object value.
   */
  objectOpen: string;
  /**
   * The bracket character used to close an object value.
   */
  objectClose: string;
  /**
   * The word used to connect an object key with its value.
   */
  valueSep: string;
  /**
   * The bracket character used to open an unknown value.
   */
  valueOpen: string;
  /**
   * The bracket character used to close an unknown value.
   */
  valueClose: string;
  /**
   * The bracket character used to open an expression.
   */
  exprOpen: string;
  /**
   * The bracket character used to close an expression.
   */
  exprClose: string;
  /**
   * The bracket character used to open an optional group.
   */
  optionalOpen: string;
  /**
   * The bracket character used to close an optional group.
   */
  optionalClose: string;
};

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
  readonly connectives: ConnectiveWords;
  /**
   * The error phrases.
   */
  readonly errorPhrases: Record<ErrorItem, string>;
  /**
   * The help phrases.
   */
  readonly helpPhrases: Record<HelpItem, string>;
};
