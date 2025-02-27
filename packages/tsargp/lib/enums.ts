//--------------------------------------------------------------------------------------------------
// Exports
//--------------------------------------------------------------------------------------------------
export { ControlSequence as cs, TypeFace as tf, ForegroundColor as fg, BackgroundColor as bg };

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The kind of error/warning raised by the parser or validator.
 */
export const enum ErrorItem {
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
   * Error raised when an option is specified without one of its expected parameter(s).
   */
  missingParameter,
  /**
   * Error raised when the parser fails to find a version file when handling the version option.
   */
  versionFileNotFound,
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
   * Error raised when a variadic option is specified in the middle of a cluster argument.
   */
  invalidClusterOption,
  /**
   * Error raised when an option is specified with no inline parameter, despite it being required.
   */
  missingInlineParameter,
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
   * Error raised when a variadic option declares an inline constraint.
   */
  invalidInlineConstraint,
  /**
   * Error raised when a JavaScript module needs to be loaded, but a module resolution function was
   * not provided (either in the parsing flags or the validation flags).
   */
  missingResolveCallback,
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
   * The option's cluster letters.
   */
  cluster,
  /**
   * The parameter count of a variadic or polyadic option.
   */
  paramCount,
  /**
   * The parameter delimiter of an array-valued option.
   */
  separator,
  /**
   * Whether the option accepts positional arguments.
   */
  positional,
  /**
   * The option's treatment of inline parameters.
   */
  inline,
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
   * Whether the option accepts data from standard input.
   */
  stdin,
  /**
   * The option's environment data sources.
   */
  sources,
  /**
   * The option's forward requirements.
   */
  requires,
  /**
   * Whether the option is always required.
   */
  required,
  /**
   * The option's conditional requirements.
   */
  requiredIf,
  /**
   * The option's default value.
   */
  default,
  /**
   * Whether a help option uses the next argument as the name of a subcommand.
   */
  useCommand,
  /**
   * Whether a help option uses the remaining arguments as option filter.
   */
  useFilter,
  /**
   * The option's deprecation notice.
   */
  deprecated,
  /**
   * The option's external resource hyperlink.
   */
  link,
  /**
   * The number of help items (for internal use only).
   * New enumerators should be added in their intended position.
   */
  _count,
}

/**
 * A control sequence introducer command.
 * @see https://xtermjs.org/docs/api/vtfeatures/#csi
 */
const enum ControlSequence {
  /**
   * Insert Characters. Insert Ps (blank) characters (default = 1).
   */
  ich = '@',
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
   * Delete Characters. Delete Ps characters (default=1).
   */
  dch = 'P',
  /**
   * Scroll Up. Scroll Ps lines up (default=1).
   */
  su = 'S',
  /**
   * Scroll Down. Scroll Ps lines down (default=1).
   */
  sd = 'T',
  /**
   * Erase Characters. Erase Ps characters from current cursor position to the right (default=1).
   */
  ech = 'X',
  /**
   * Horizontal Position Absolute. Same as {@link ControlSequence.cha}.
   */
  hpa = '`',
  /**
   * Horizontal Position Relative. Same as {@link ControlSequence.cuf}.
   */
  hpr = 'a',
  /**
   * Repeat Preceding Character. Repeat preceding character Ps times (default=1).
   */
  rch = 'b',
  /**
   * Vertical Position Absolute. Move cursor to Ps-th row (default=1).
   */
  vpa = 'd',
  /**
   * Vertical Position Relative. Move cursor Ps times down (default=1).
   */
  vpr = 'e',
  /**
   * Horizontal and Vertical Position. Same as {@link ControlSequence.cup}.
   */
  hvp = 'f',
  /**
   * Tab Clear. Clear tab stops at current position (0) or all (3) (default=0).
   */
  tbc = 'g',
  /**
   * Set Mode. Set various terminal modes.
   */
  sm = 'h',
  /**
   * AUX Port mode. (4=disable; 5=enable)
   */
  aux = 'i',
  /**
   * Reset Mode. Reset various terminal attributes.
   */
  rm = 'l',
  /**
   * Select Graphic Rendition. Set/Reset various text attributes.
   */
  sgr = 'm',
  /**
   * Device Status Report. Request cursor position (CPR) with Ps = 6.
   */
  dsr = 'n',
  /**
   * Request Mode. Request mode state.
   */
  rqm = '$p',
  /**
   * Soft Terminal Reset. Reset several terminal attributes to initial state.
   */
  str = '!p',
  /**
   * Set Top and Bottom Margins.
   * Set top and bottom margins of the viewport [top;bottom] (default = viewport size).
   */
  tbm = 'r',
  /**
   * Save Cursor. Save cursor position, charmap and text attributes.
   */
  scp = 's',
  /**
   * Restore Cursor. Restore cursor position, charmap and text attributes.
   */
  rcp = 'u',
  /**
   * Insert Columns. Insert Ps columns at cursor position.
   */
  icl = "'}",
  /**
   * Delete Columns. Delete Ps columns at cursor position.
   */
  dcl = "'~",
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
