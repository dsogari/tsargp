//--------------------------------------------------------------------------------------------------
// Exports
//--------------------------------------------------------------------------------------------------
export { ControlSequence as cs, TypeFace as tf, ForegroundColor as fg, BackgroundColor as bg };

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The kind of error/warning raised by the parser.
 */
export const enum ParsingError {
  /**
   * Error raised when an option name is not found, with possible name suggestions.
   */
  unknownOption,
  /**
   * Error raised when an option's forward requirement is not satisfied.
   */
  unsatisfiedRequirement,
  /**
   * Error raised when an option that is always required was not specified.
   */
  missingRequiredOption,
  /**
   * Error raised when an option is specified with the wrong number of parameters.
   */
  mismatchedParamCount,
  /**
   * Error raised when it fails to find a "package.json" file when resolving the package version.
   */
  missingPackageJson,
  /**
   * Error raised when an option is specified with an inline parameter, despite it being disallowed.
   */
  disallowedInlineParameter,
  /**
   * Error raised when an option parameter fails to satisfy a choice constraint.
   */
  choiceConstraintViolation,
  /**
   * Error raised when an option parameter fails to satisfy a regex constraint.
   */
  regexConstraintViolation,
  /**
   * Error raised when an option value fails to satisfy a count limit constraint.
   */
  limitConstraintViolation,
  /**
   * Warning produced when a deprecated option is specified on the command-line.
   */
  deprecatedOption,
  /**
   * Error raised when an option's conditional requirement is not satisfied.
   */
  unsatisfiedCondRequirement,
  /**
   * Error raised when either a variadic option or a command option is specified in the middle of a
   * cluster argument.
   */
  invalidClusterOption,
  /**
   * Error raised when an option is specified with no inline parameter, despite it being required.
   */
  missingInlineParameter,
}

/**
 * The kind of error/warning raised by the validator.
 */
export const enum ValidationError {
  /**
   * Error raised when an option has an invalid name.
   */
  invalidOptionName,
  /**
   * Error raised when an option references itself in a requirement.
   */
  invalidSelfRequirement,
  /**
   * Error raised when an option references an unknown option in a requirement.
   */
  unknownRequiredOption,
  /**
   * Error raised when an option references a non-valued option in a requirement.
   */
  invalidRequiredOption,
  /**
   * Error raised when an option uses a nullish value in a requirement referencing an option that is
   * either always required or has a default value.
   */
  invalidRequiredValue,
  /**
   * Error raised when there are two identical option names.
   */
  duplicateOptionName,
  /**
   * Error raised when there are two or more positional options.
   */
  duplicatePositionalOption,
  /**
   * Error raised produced when a choices constraint has a duplicate value.
   */
  duplicateChoiceValue,
  /**
   * Error raised when there are two identical cluster letters.
   */
  duplicateClusterLetter,
  /**
   * Error raised when an option has an invalid cluster letter.
   */
  invalidClusterLetter,
  /**
   * Warning produced when an option name is too similar to other names.
   */
  tooSimilarOptionNames,
  /**
   * Warning produced when a name slot contains names with different naming conventions.
   */
  mixedNamingConvention,
  /**
   * Error raised when a function option has an invalid parameter count.
   */
  invalidParamCount,
  /**
   * Warning produced when a variadic option declares cluster letters.
   */
  variadicWithClusterLetter,
  /**
   * Raised when a variadic option declares an inline constraint.
   */
  invalidInlineConstraint,
}

/**
 * The kind of items that can be shown in the option description.
 */
export const enum HelpItem {
  /**
   * The option's synopsis.
   */
  synopsis,
  /**
   * The parameter delimiter of a non-niladic option.
   */
  separator,
  /**
   * The parameter count of a variadic or polyadic option.
   */
  paramCount,
  /**
   * Whether the option accepts positional arguments.
   */
  positional,
  /**
   * Whether an array-valued option can be specified multiple times.
   */
  append,
  /**
   * The option's parameter choices.
   */
  choices,
  /**
   * The regular expression that parameters should match.
   */
  regex,
  /**
   * Whether duplicate elements will be removed from an array-valued option value.
   */
  unique,
  /**
   * The element count limit of an array-valued option.
   */
  limit,
  /**
   * The option's forward requirements.
   */
  requires,
  /**
   * Whether the option is always required.
   */
  required,
  /**
   * The option's default value.
   */
  default,
  /**
   * The option's deprecation notice.
   */
  deprecated,
  /**
   * The option's external resource hyperlink.
   */
  link,
  /**
   * Whether the option accepts data from standard input.
   */
  stdin,
  /**
   * The option's environment data sources.
   */
  sources,
  /**
   * The option's conditional requirements.
   */
  requiredIf,
  /**
   * The option's cluster letters.
   */
  cluster,
  /**
   * Whether a help option uses the next argument as the name of a nested command.
   */
  useNested,
  /**
   * Whether a help option uses the next argument as the name of a help format.
   */
  useFormat,
  /**
   * Whether a help option uses the remaining arguments as option filter.
   */
  useFilter,
  /**
   * The option's treatment of inline parameters.
   */
  inline,
  /**
   * The available help formats of a help option.
   */
  formats,
}

/**
 * The kind of connective words used in option requirements.
 * Inline styles and line breaks are not supported in connective words.
 */
export const enum ConnectiveWord {
  /**
   * The word used to connect two logical expressions in conjunction.
   */
  and,
  /**
   * The word used to connect two logical expressions in disjunction.
   */
  or,
  /**
   * The word used to connect a logical expression in negation.
   */
  not,
  /**
   * The word used to connect a logical expression in non-existence.
   */
  no,
  /**
   * The word used to connect two expressions in equality comparison.
   */
  equals,
  /**
   * The word used to connect two expressions in non-equality comparison.
   */
  notEquals,
  /**
   * The word used to connect two option names in alternation.
   */
  optionAlt,
  /**
   * The word used to connect two option names in succession.
   */
  optionSep,
  /**
   * The quote character used to enclose a string value.
   */
  stringQuote,
  /**
   * The word used to connect two array elements in succession.
   */
  arraySep,
  /**
   * The bracket character used to open an array value.
   */
  arrayOpen,
  /**
   * The bracket character used to close an array value.
   */
  arrayClose,
  /**
   * The word used to connect two object entries in succession.
   */
  objectSep,
  /**
   * The bracket character used to open an object value.
   */
  objectOpen,
  /**
   * The bracket character used to close an object value.
   */
  objectClose,
  /**
   * The word used to connect an object key with its value.
   */
  valueSep,
  /**
   * The bracket character used to open an unknown value.
   */
  valueOpen,
  /**
   * The bracket character used to close an unknown value.
   */
  valueClose,
  /**
   * The bracket character used to open an expression.
   */
  exprOpen,
  /**
   * The bracket character used to close an expression.
   */
  exprClose,
}

/**
 * A control sequence introducer command.
 * @see https://xtermjs.org/docs/api/vtfeatures/#csi
 */
const enum ControlSequence {
  /**
   * Cursor Up. Move cursor Ps times up (default=1).
   */
  cuu = 'A',
  /**
   * Cursor Down. Move cursor Ps times down (default=1).
   */
  cud = 'B',
  /**
   * Cursor Forward. Move cursor Ps times forward (default=1).
   */
  cuf = 'C',
  /**
   * Cursor Backward. Move cursor Ps times backward (default=1).
   */
  cub = 'D',
  /**
   * Cursor Next Line. Move cursor Ps times down (default=1) and to the first column.
   */
  cnl = 'E',
  /**
   * Cursor Previous Line. Move cursor Ps times up (default=1) and to the first column.
   */
  cpl = 'F',
  /**
   * Cursor Horizontal Absolute. Move cursor to Ps-th column of the active row (default=1).
   */
  cha = 'G',
  /**
   * Cursor Horizontal Tabulation. Move cursor Ps times tabs forward (default=1).
   */
  cht = 'I',
  /**
   * Cursor Backward Tabulation. Move cursor Ps tabs backward (default=1).
   */
  cbt = 'Z',
  /**
   * Vertical Position Absolute. Move cursor to Ps-th row (default=1).
   */
  vpa = 'd',
  /**
   * Vertical Position Relative. Move cursor Ps times down (default=1).
   */
  vpr = 'e',
  /**
   * Cursor Position. Set cursor to position [Ps, Ps] (default = [1, 1]).
   */
  cup = 'H',
  /**
   * Erase In Display. Erase various parts of the viewport.
   */
  ed = 'J',
  /**
   * Erase In Line. Erase various parts of the active row.
   */
  el = 'K',
  /**
   * Insert Lines. Insert Ps blank lines at active row (default=1).
   */
  il = 'L',
  /**
   * Delete Lines. Delete Ps lines at active row (default=1).
   */
  dl = 'M',
  /**
   * Insert Characters. Insert Ps (blank) characters (default = 1).
   */
  ich = '@',
  /**
   * Delete Characters. Delete Ps characters (default=1).
   */
  dch = 'P',
  /**
   * Erase Characters. Erase Ps characters from current cursor position to the right (default=1).
   */
  ech = 'X',
  /**
   * Repeat Preceding Character. Repeat preceding character Ps times (default=1).
   */
  rch = 'b',
  /**
   * Tab Clear. Clear tab stops at current position (0) or all (3) (default=0).
   */
  tbc = 'g',
  /**
   * Insert Columns. Insert Ps columns at cursor position.
   */
  icl = "'}",
  /**
   * Delete Columns. Delete Ps columns at cursor position.
   */
  dcl = "'~",
  /**
   * Scroll Left. Scroll viewport Ps times to the left.
   */
  sl = 'SP@',
  /**
   * Scroll Right. Scroll viewport Ps times to the right.
   */
  sr = 'SPA',
  /**
   * Scroll Up. Scroll Ps lines up (default=1).
   */
  su = 'S',
  /**
   * Scroll Down. Scroll Ps lines down (default=1).
   */
  sd = 'T',
  /**
   * Select Graphic Rendition. Set/Reset various text attributes.
   */
  sgr = 'm',
  /**
   * Set Top and Bottom Margins. Set top and bottom margins of the viewport [top;bottom] (default =
   * viewport size).
   */
  tbm = 'r',
  /**
   * Set Mode. Set various terminal modes.
   */
  sm = 'h',
  /**
   * Reset Mode. Reset various terminal attributes.
   */
  rm = 'l',
  /**
   * Device Status Report. Request cursor position (CPR) with Ps = 6.
   */
  dsr = 'n',
  /**
   * Soft Terminal Reset. Reset several terminal attributes to initial state.
   */
  str = '!p',
  /**
   * Set Cursor Style.
   */
  scs = 'SPq',
  /**
   * Save Cursor. Save cursor position, charmap and text attributes.
   */
  scp = 's',
  /**
   * Restore Cursor. Restore cursor position, charmap and text attributes.
   */
  rcp = 'u',
}

/**
 * A predefined text type face.
 */
const enum TypeFace {
  /**
   * Reset or normal. Resets any other preceding SGR attribute.
   */
  clear,
  /**
   * Bold or increased intensity.
   */
  bold,
  /**
   * Faint, decreased intensity, or dim.
   */
  faint,
  /**
   * Italic.
   */
  italic,
  /**
   * Underlined.
   */
  underlined,
  /**
   * Slowly blinking.
   */
  slowlyBlinking,
  /**
   * Rapidly blinking.
   */
  rapidlyBlinking,
  /**
   * Reverse video or inverse. Flips foreground and background color.
   */
  inverse,
  /**
   * Invisible, concealed or hidden.
   */
  invisible,
  /**
   * Crossed-out or strikethrough.
   */
  crossedOut,
  /**
   * Primary font.
   */
  primaryFont,
  /**
   * Alternative font 1.
   */
  alternative1,
  /**
   * Alternative font 2.
   */
  alternative2,
  /**
   * Alternative font 3.
   */
  alternative3,
  /**
   * Alternative font 4.
   */
  alternative4,
  /**
   * Alternative font 5.
   */
  alternative5,
  /**
   * Alternative font 6.
   */
  alternative6,
  /**
   * Alternative font 7.
   */
  alternative7,
  /**
   * Alternative font 8.
   */
  alternative8,
  /**
   * Alternative font 9.
   */
  alternative9,
  /**
   * Black-letter font.
   */
  fraktur,
  /**
   * Doubly underlined.
   */
  doublyUnderlined,
  /**
   * Normal intensity (neither bold nor faint).
   */
  notBoldOrFaint,
  /**
   * Regular face (neither italic nor black-letter).
   */
  notItalicNorFraktur,
  /**
   * Not underlined.
   */
  notUnderlined,
  /**
   * Steady (not blinking).
   */
  notBlinking,
  /**
   * Proportional spacing.
   */
  proportionalSpacing,
  /**
   * Positive (not inverse).
   */
  notInverse,
  /**
   * Visible (reveal, or not hidden).
   */
  notInvisible,
  /**
   * Not crossed out (no strikethrough).
   */
  notCrossedOut,
  /**
   * Disable proportional spacing.
   */
  notProportionalSpacing = 50,
  /**
   * Framed.
   */
  framed,
  /**
   * Encircled.
   */
  encircled,
  /**
   * Overlined
   */
  overlined,
  /**
   * Neither framed nor encircled
   */
  notFramedOrEncircled,
  /**
   * Not overlined.
   */
  notOverlined,
  /**
   * Ideogram underline or right side line.
   */
  ideogramUnderline = 60,
  /**
   * Ideogram double underline, or double line on the right side.
   */
  ideogramDoubleUnderline,
  /**
   * Ideogram overline or left side line.
   */
  ideogramOverline,
  /**
   * Ideogram double overline, or double line on the left side.
   */
  ideogramDoubleOverline,
  /**
   * Ideogram stress marking.
   */
  ideogramStressMarking,
  /**
   * No ideogram attributes.
   */
  noIdeogram,
  /**
   * Superscript.
   */
  superscript = 73,
  /**
   * Subscript.
   */
  subscript,
  /**
   * Neither superscript nor subscript.
   */
  notSuperscriptOrSubscript,
}

/**
 * A predefined text foreground color.
 */
const enum ForegroundColor {
  black = 30,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  default = 39,
  brightBlack = 90,
  brightRed,
  brightGreen,
  brightYellow,
  brightBlue,
  brightMagenta,
  brightCyan,
  brightWhite,
}

/**
 * A predefined text background color.
 */
const enum BackgroundColor {
  black = 40,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  default = 49,
  brightBlack = 100,
  brightRed,
  brightGreen,
  brightYellow,
  brightBlue,
  brightMagenta,
  brightCyan,
  brightWhite,
}
