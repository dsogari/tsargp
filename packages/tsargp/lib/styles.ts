//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import { cs, tf, fg, bg, ul } from './enums';
import type { Alias, Enumerate } from './utils';

export type { CSI, Decimal, FgColor, BgColor, UlColor, StyleAttr, Style, Sequence, FormatCallback };

export {
  TerminalString,
  ErrorMessage,
  HelpMessage,
  seq,
  style,
  foreground as fg8,
  background as bg8,
  underline as ul8,
};

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * A set of regular expressions for terminal strings.
 */
const regex = {
  para: /(?:[ \t]*\r?\n){2,}/,
  item: /^[ \t]*(-|\*|\d+\.) /m,
  punct: /[.,:;!?]$/,
  word: /\s+/,
  spec: /(%[a-z][0-9]?)/,
  // eslint-disable-next-line no-control-regex
  styles: /(?:\x9b[\d;]+m)+/g,
};

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * A control sequence introducer.
 * @template P The type of the sequence parameter
 * @template C The type of the sequence command
 */
type CSI<P extends string, C extends cs> = `\x9b${P}${C}`;

/**
 * A control sequence.
 */
type Sequence = CSI<string, cs> | '';

/**
 * A select graphics rendition sequence.
 */
type Style = CSI<string, cs.sgr> | '';

/**
 * An 8-bit decimal number.
 */
type Decimal = Alias<Enumerate<256>>;

/**
 * An 8-bit foreground color.
 */
type FgColor = [38, 5, Decimal];

/**
 * An 8-bit background color.
 */
type BgColor = [48, 5, Decimal];

/**
 * An 8-bit underline color.
 */
type UlColor = [58, 5, Decimal];

/**
 * A text styling attribute.
 */
type StyleAttr = tf | fg | bg | ul | FgColor | BgColor | UlColor;

/**
 * A callback that processes a format specifier when splitting text.
 * @param this The terminal string to append to
 * @param spec The format specifier (e.g., '%s')
 */
type FormatCallback = (this: TerminalString, spec: string) => void;

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements concatenation of strings that can be printed on a terminal.
 */
class TerminalString {
  private merge = false;

  /**
   * The list of strings that have been appended.
   */
  readonly strings = new Array<string>();

  /**
   * The lengths of the strings, ignoring control characters and sequences.
   */
  readonly lengths = new Array<number>();

  /**
   * @returns The sum of the lengths of all strings, ignoring control characters and sequences.
   */
  get length(): number {
    return this.lengths.reduce((acc, len) => acc + len, 0);
  }

  /**
   * Creates a terminal string.
   * @param start The starting column for this string
   */
  constructor(public start: number = 0) {}

  /**
   * Appends another terminal string to the strings.
   * @param other The other terminal string
   * @returns The terminal string instance
   */
  addOther(other: TerminalString): this {
    this.strings.push(...other.strings);
    this.lengths.push(...other.lengths);
    this.merge = other.merge;
    return this;
  }

  /**
   * Sets a flag to merge the next word to the last word.
   * @param value The flag value
   * @returns The terminal string instance
   */
  setMerge(value = true): this {
    this.merge = value;
    return this;
  }

  /**
   * Appends a word that will be merged with the next word.
   * @param word The opening word
   * @returns The terminal string instance
   */
  addOpening(word: string): this {
    return this.addWord(word).setMerge();
  }

  /**
   * Appends a word that is merged with the last word.
   * @param word The closing word
   * @returns The terminal string instance
   */
  addClosing(word: string): this {
    return this.setMerge().addWord(word);
  }

  /**
   * Appends a word with surrounding sequences.
   * @param seq The starting sequence
   * @param word The word to be appended
   * @param rev The ending sequence
   * @returns The terminal string instance
   */
  addAndRevert(seq: Sequence, word: string, rev: Sequence): this {
    return this.addText(seq + word + rev, word.length);
  }

  /**
   * Appends a word to the list of strings.
   * @param word The word to be appended. Should not contain control characters or sequences.
   * @returns The terminal string instance
   */
  addWord(word: string): this {
    return this.addText(word, word.length);
  }

  /**
   * Appends line breaks to the list of strings.
   * @param count The number of line breaks to insert
   * @returns The terminal string instance
   */
  addBreaks(count: number): this {
    return count > 0 ? this.addText('\n'.repeat(count), 0) : this;
  }

  /**
   * Appends a sequence to the list of strings.
   * @param seq The sequence to insert
   * @returns The terminal string instance
   */
  addSequence(seq: Sequence): this {
    return this.addText(seq, 0);
  }

  /**
   * Appends a text that may contain control characters or sequences to the list of strings.
   * @param text The text to be appended
   * @param length The length of the text without control characters or sequences
   * @returns The terminal string instance
   */
  private addText(text: string, length: number): this {
    if (text) {
      const count = this.strings.length;
      if (count && this.merge) {
        this.strings[count - 1] += text;
        this.lengths[count - 1] += length;
      } else {
        this.strings.push(text);
        this.lengths.push(length);
      }
    }
    this.merge = false;
    return this;
  }

  /**
   * Splits a text into words and style sequences, and appends them to the list of strings.
   * @param text The text to be split
   * @param format An optional callback to process format specifiers
   * @returns The terminal string instance
   */
  splitText(text: string, format?: FormatCallback): this {
    const paragraphs = text.split(regex.para);
    paragraphs.forEach((para, i) => {
      this.splitParagraph(para, format);
      if (i < paragraphs.length - 1) {
        this.addBreaks(2);
      }
    });
    return this;
  }

  /**
   * Splits a paragraph into words and style sequences, and appends them to the list of strings.
   * @param para The paragraph to be split
   * @param format An optional callback to process format specifiers
   */
  private splitParagraph(para: string, format?: FormatCallback) {
    const count = this.strings.length;
    para.split(regex.item).forEach((item, i) => {
      if (i % 2 == 0) {
        this.splitItem(item, format);
      } else {
        if (this.strings.length > count) {
          this.addBreaks(1);
        }
        this.addWord(item);
      }
    });
  }

  /**
   * Splits a list item into words and style sequences, and appends them to the list of strings.
   * @param item The list item to be split
   * @param format An optional callback to process format specifiers
   */
  private splitItem(item: string, format?: FormatCallback) {
    const boundFormat = format?.bind(this);
    const words = item.split(regex.word);
    for (const word of words) {
      if (!word) {
        continue;
      }
      if (boundFormat) {
        const parts = word.split(regex.spec);
        if (parts.length > 1) {
          this.addWord(parts[0]);
          for (let i = 1, merge = parts[0] !== ''; i < parts.length; i += 2, merge = true) {
            this.setMerge(merge);
            boundFormat(parts[i]);
            this.addClosing(parts[i + 1]);
          }
          continue;
        }
      }
      const styles = word.match(regex.styles) ?? [];
      const length = styles.reduce((acc, str) => acc + str.length, 0);
      this.addText(word, word.length - length);
    }
  }

  /**
   * Wraps the strings to fit in a terminal width.
   * @param result The resulting strings to append to
   * @param column The current terminal column
   * @param width The desired terminal width (or zero to avoid wrapping)
   * @param emitStyles True if styles should be emitted
   * @returns The updated terminal column
   */
  wrapToWidth(result: Array<string>, column: number, width: number, emitStyles: boolean): number {
    /** @ignore */
    function shortenLine() {
      while (result.length && column > start) {
        const last = result[result.length - 1];
        if (last.length > column - start) {
          result[result.length - 1] = last.slice(0, start - column);
          break;
        }
        column -= last.length;
        result.length--;
      }
    }
    if (!this.strings.length) {
      return column;
    }
    const firstIsBreak = this.strings[0].startsWith('\n');
    let indent = '';
    let start = this.start;
    if (!width) {
      indent = ' '.repeat(start);
      if (!firstIsBreak) {
        if (column < start) {
          result.push(' '.repeat(start - column));
        } else {
          shortenLine();
        }
      }
    } else if (start) {
      if (width >= start + Math.max(...this.lengths)) {
        indent = seq(cs.cha, start + 1);
        if (!firstIsBreak && column != start) {
          result.push(indent);
        }
      } else {
        if (!firstIsBreak && column) {
          result.push('\n');
        }
        start = 0;
      }
    } else if (!firstIsBreak && column) {
      result.push(seq(cs.cha, 1));
    }
    column = start;
    for (let i = 0; i < this.strings.length; ++i) {
      let str = this.strings[i];
      if (str.startsWith('\n')) {
        result.push(str);
        column = 0;
        continue;
      }
      if (!column && indent) {
        result.push(indent);
        column = start;
      }
      const len = this.lengths[i];
      if (!len) {
        if (emitStyles) {
          result.push(str);
        }
        continue;
      }
      if (!emitStyles) {
        str = str.replace(regex.styles, '');
      }
      if (column === start) {
        result.push(str);
        column += len;
      } else if (!width || column + 1 + len <= width) {
        result.push(' ' + str);
        column += 1 + len;
      } else {
        result.push('\n' + indent + str);
        column = start + len;
      }
    }
    return column;
  }
}

/**
 * An error message.
 */
class ErrorMessage extends Error {
  /**
   * Creates an error message
   * @param str The terminal string
   */
  constructor(readonly str: TerminalString) {
    super();
  }

  /**
   * @returns The message to be printed on a terminal
   */
  get message(): string {
    return this.wrap();
  }

  /**
   * Wraps the error message to a specified width.
   * @param width The terminal width (or zero to avoid wrapping)
   * @param emitStyles True if styles should be emitted
   * @returns The message to be printed on a terminal
   */
  wrap(width = process?.stderr?.columns ?? 0, emitStyles = !omitStyles(width)): string {
    const result = new Array<string>();
    this.str.wrapToWidth(result, 0, width, emitStyles);
    if (emitStyles) {
      result.push(style(tf.clear));
    }
    return result.join('');
  }
}

/**
 * A help message.
 */
class HelpMessage extends Array<TerminalString> {
  /**
   * @returns the message to be printed on a terminal
   */
  override toString(): string {
    return this.wrap();
  }

  /**
   * Wraps the help message to a specified width.
   * @param width The terminal width (or zero to avoid wrapping)
   * @param emitStyles True if styles should be emitted
   * @returns The message to be printed on a terminal
   */
  wrap(width = process?.stdout?.columns ?? 0, emitStyles = !omitStyles(width)): string {
    const result = new Array<string>();
    let column = 0;
    for (const str of this) {
      column = str.wrapToWidth(result, column, width, emitStyles);
    }
    if (emitStyles) {
      result.push(style(tf.clear));
    }
    return result.join('');
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * @param width The terminal width (in number of columns)
 * @returns True if styles should be omitted from terminal strings
 * @see https://clig.dev/#output
 */
function omitStyles(width: number): boolean {
  return (
    !process?.env['FORCE_COLOR'] &&
    (!width || !!process?.env['NO_COLOR'] || process?.env['TERM'] === 'dumb')
  );
}

/**
 * Creates a control sequence.
 * @template T The type of the sequence command
 * @param cmd The sequence command
 * @param params The sequence parameters
 * @returns The control sequence
 */
function seq<T extends cs>(cmd: T, ...params: Array<number>): CSI<string, T> {
  return `\x9b${params.join(';')}${cmd}`;
}

/**
 * Creates an SGR sequence.
 * @param attrs The text styling attributes
 * @returns The SGR sequence
 */
function style(...attrs: Array<StyleAttr>): Style {
  return seq(cs.sgr, ...attrs.flat());
}

/**
 * Creates a foreground color.
 * @param color The color decimal value
 * @returns The foreground color
 */
function foreground(color: Decimal): FgColor {
  return [38, 5, color];
}

/**
 * Creates a background color.
 * @param color The color decimal value
 * @returns The background color
 */
function background(color: Decimal): BgColor {
  return [48, 5, color];
}

/**
 * Creates an underline color.
 * @param color The color decimal value
 * @returns The underline color
 */
function underline(color: Decimal): UlColor {
  return [58, 5, color];
}
