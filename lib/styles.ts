//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
export type { Attr, Color, FgColor, BgColor, Style, DisplayAttr };

export { StyledString, sgr, fg, bg, isEscape };

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
type UpToFour = '0' | '1' | '2' | '3' | '4';
type UpToSeven = UpToFour | '5' | '6' | '7';
type Digit = UpToSeven | '8' | '9';

/**
 * A common display attribute.
 */
type Attr = Digit | `${Exclude<Digit, '0'>}${Digit}` | `10${UpToSeven}`;

/**
 * An 8-bit color.
 */
type Color =
  | Digit
  | `${Exclude<Digit, '0'>}${Digit}`
  | `1${Digit}${Digit}`
  | `2${UpToFour}${Digit}`
  | `25${UpToFour | '5'}`;

/**
 * An 8-bit foreground color.
 */
type FgColor = `38;5;${Color}`;

/**
 * An 8-bit background color.
 */
type BgColor = `48;5;${Color}`;

/**
 * A display attribute for use with SGR.
 */
type DisplayAttr = Attr | FgColor | BgColor;

/**
 * A style is an SGR control sequence.
 */
type Style = `\x1b[${string}m`;

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements concatenation of strings with styles.
 */
class StyledString {
  private lastStyle = '';

  /**
   * The list of strings that have been appended (styles and text).
   */
  readonly strings = new Array<string>();

  /**
   * @returns The concatenation of all strings, including styles.
   */
  get string(): string {
    return this.strings.join('');
  }

  /**
   * @returns The length of the concatenated string, excluding the lengths of styles.
   */
  get length(): number {
    return this.strings.reduce((sum, str) => sum + (isEscape(str) ? 0 : str.length), 0);
  }

  /**
   * Appends a style to the list of strings.
   * @param style The style string
   * @returns This
   */
  style(style: Style): this {
    if (style && style != this.lastStyle) {
      this.strings.push(style);
      this.lastStyle = style;
    }
    return this;
  }

  /**
   * Appends texts to the list of strings.
   * @param texts The texts to be appended. Should not contain any style.
   * @returns This
   */
  append(...texts: Array<string>): this {
    this.strings.push(...texts);
    return this;
  }

  /**
   * Appends a styled string to the list of strings.
   * @param str The styled string to be appended.
   * @returns This
   */
  appendStyled(str: StyledString): this {
    this.strings.push(...str.strings);
    this.lastStyle = str.lastStyle;
    return this;
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Tests if a string is an escape sequence.
 * @param text The text to be checked
 * @returns True if the text is an escape sequence
 */
function isEscape(text: string): boolean {
  return text.startsWith('\x1b');
}

/**
 * Gets a control sequence with SGR parameters.
 * @param attrs The display attributes
 * @returns The control sequence
 */
function sgr(...attrs: Array<DisplayAttr>): Style {
  return `\x1b[${attrs.join(';')}m`;
}

/**
 * Gets a foreground color from an 8-bit color.
 * @param color The 8-bit color
 * @returns The foreground color
 */
function fg(color: Color): FgColor {
  return `38;5;${color}`;
}

/**
 * Gets a background color from an 8-bit color.
 * @param color The 8-bit color
 * @returns The background color
 */
function bg(color: Color): BgColor {
  return `48;5;${color}`;
}
