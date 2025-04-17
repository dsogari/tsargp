//--------------------------------------------------------------------------------------------------
// Exports
//--------------------------------------------------------------------------------------------------
export {
  ControlSequence as cs,
  ResetStyle as rs,
  TypeFace as tf,
  ForegroundColor as fg,
  BackgroundColor as bg,
  UnderlineColor as ul,
};

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The kind of error/warning produced by the parser or validator.
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
   * Error raised when an option that is always required was not supplied.
   */
  missingRequiredOption,
  /**
   * Error raised when an option is supplied without one of its expected parameter(s).
   */
  missingParameter,
  /**
   * Error raised when an option is supplied with an inline parameter, despite it being disallowed.
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
   * Warning produced when a deprecated option is supplied on the command-line.
   */
  deprecatedOption,
  /**
   * Error raised when an option's conditional requirement is not satisfied.
   */
  unsatisfiedCondRequirement,
  /**
   * Error raised when a variadic option is supplied in the middle of a cluster argument.
   */
  invalidClusterOption,
  /**
   * Error raised when an option is supplied with no inline parameter, despite it being required.
   */
  missingInlineParameter,
  /**
   * Error raised when an option has an invalid name, cluster letter or environment variable.
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
   * Error raised when there are duplicate option names, cluster letters or environment variables.
   */
  duplicateOptionName,
  /**
   * Error raised when there are two or more options with a positional marker.
   */
  duplicatePositionalMarker,
  /**
   * Error raised when a choices constraint has a duplicate value.
   */
  duplicateParameterChoice,
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
   * Error raised when an option declares an invalid inline constraint.
   */
  invalidInlineConstraint,
  /**
   * Error raised for an option that is not suppliable.
   */
  invalidOption,
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
   * Whether an array-valued option can be supplied multiple times.
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
   * The option's environment data sources.
   */
  sources,
  /**
   * Whether the option reads data from the standard input.
   */
  stdin,
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
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.html
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
   * Cursor Position. Set cursor to position [Ps, Ps] (default = [1, 1]).
   */
  cup = 'H',
  /**
   * Cursor Horizontal Tabulation. Move cursor Ps times tabs forward (default=1).
   */
  cht = 'I',
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
   * Cursor Backward Tabulation. Move cursor Ps tabs backward (default=1).
   */
  cbt = 'Z',
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
}

/**
 * A resetting attribute.
 */
const enum ResetStyle {
  /**
   * Reset or normal. Resets any other preceding attribute.
   */
  clear,
  /**
   * Primary or default font.
   */
  primaryFont = 10,
  /**
   * Normal intensity (neither bold nor faint).
   */
  notBoldOrFaint = 22,
  /**
   * Regular type (neither italic nor black-letter).
   */
  notItalicOrFraktur,
  /**
   * Not underlined (nor doubly underlined).
   */
  notUnderlined,
  /**
   * Steady (not blinking).
   */
  notBlinking,
  /**
   * Positive (not inverse).
   */
  notInverse = 27,
  /**
   * Visible (reveal, or not hidden).
   */
  notInvisible,
  /**
   * Not crossed out (no strikethrough).
   */
  notCrossedOut,
  /**
   * Default foreground color.
   */
  defaultForeground = 39,
  /**
   * Default background color.
   */
  defaultBackground = 49,
  /**
   * Disable proportional spacing.
   */
  notProportionallySpaced = 50,
  /**
   * Neither framed nor encircled
   */
  notFramedOrEncircled = 54,
  /**
   * Not overlined.
   */
  notOverlined,
  /**
   * Default underline color.
   */
  defaultUnderline = 59,
  /**
   * No ideogram attributes.
   */
  noIdeogram = 65,
  /**
   * Neither superscript nor subscript.
   */
  notSuperscriptOrSubscript = 75,
}

/**
 * A predefined text typeface.
 */
const enum TypeFace {
  /**
   * Bold or increased intensity.
   */
  bold = 1,
  /**
   * Faint, decreased intensity, or dim (lower opacity).
   */
  faint,
  /**
   * Italic type.
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
   * Alternative font 1.
   */
  alternative1 = 11,
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
   * Enable proportional spacing.
   */
  proportionallySpaced = 26,
  /**
   * Framed.
   */
  framed = 51,
  /**
   * Encircled.
   */
  encircled,
  /**
   * Overlined
   */
  overlined,
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
   * Superscript.
   */
  superscript = 73,
  /**
   * Subscript.
   */
  subscript,
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
  /**
   * An extended foreground color. To be used with indexed or RGB colors.
   */
  extended,
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
  /**
   * An extended background color. To be used with indexed or RGB colors.
   */
  extended,
  brightBlack = 100,
  brightRed,
  brightGreen,
  brightYellow,
  brightBlue,
  brightMagenta,
  brightCyan,
  brightWhite,
}

/**
 * A predefined text underline color.
 */
const enum UnderlineColor {
  /**
   * An extended underline color. To be used with indexed or RGB colors.
   */
  extended = 58,
}
