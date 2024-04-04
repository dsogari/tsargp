//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import type { Alias, Concrete, Enumerate, URL, ValuesOf } from './utils';
import { cs, tf, fg, bg } from './enums';
import { max, overrides, regexps, selectAlternative } from './utils';

export { sequence as seq, sgr as style, foreground as fg8, background as bg8, underline as ul8 };
export { underlineStyle as ul, formatFunctions as format };

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * A predefined underline style.
 */
const underlineStyle = {
  /**
   * No underline.
   */
  none: [4, 0],
  /**
   * Single underline.
   */
  single: [4, 1],
  /**
   * Double underline.
   */
  double: [4, 2],
  /**
   * Curly underline.
   */
  curly: [4, 3],
  /**
   * Dotted underline.
   */
  dotted: [4, 4],
  /**
   * Dashed underline.
   */
  dashed: [4, 5],
} as const satisfies Record<string, [4, number]>;

/**
 * The formatting functions.
 */
const formatFunctions = {
  /**
   * The formatting function for boolean values.
   * @param value The boolean value
   * @param styles The format styles
   * @param result The resulting string
   */
  b(value: boolean, styles, result) {
    result.style(styles.boolean, `${value}`, styles.current ?? styles.text);
  },
  /**
   * The formatting function for string values.
   * @param value The string value
   * @param styles The format styles
   * @param result The resulting string
   */
  s(value: string, styles, result) {
    result.style(styles.string, `'${value}'`, styles.current ?? styles.text);
  },
  /**
   * The formatting function for number values.
   * @param value The number value
   * @param styles The format styles
   * @param result The resulting string
   */
  n(value: number, styles, result) {
    result.style(styles.number, `${value}`, styles.current ?? styles.text);
  },
  /**
   * The formatting function for regex values.
   * @param value The regular expression
   * @param styles The format styles
   * @param result The resulting string
   */
  r(value: RegExp, styles, result) {
    result.style(styles.regex, `${value}`, styles.current ?? styles.text);
  },
  /**
   * The formatting function for option names.
   * @param name The option name
   * @param styles The format styles
   * @param result The resulting string
   */
  o(name: string, styles, result) {
    result.style(styles.option, name, styles.current ?? styles.text);
  },
  /**
   * The formatting function for generic values.
   * @param value The generic value
   * @param styles The format styles
   * @param result The resulting string
   */
  v(value: unknown, styles, result) {
    result.style(styles.value, `<${value}>`, styles.current ?? styles.text);
  },
  /**
   * The formatting function for URLs.
   * @param url The URL object
   * @param styles The format styles
   * @param result The resulting string
   */
  u(url: URL, styles, result) {
    result.style(styles.url, url.href, styles.current ?? styles.text);
  },
  /**
   * The formatting function for general text.
   * @param text The text to be split
   * @param _styles The format styles
   * @param result The resulting string
   */
  t(text: string, _styles, result) {
    result.split(text);
  },
  /**
   * The formatting function for terminal strings.
   * @param str The terminal string
   * @param _styles The format styles
   * @param result The resulting string
   */
  p(str: TerminalString, _styles, result) {
    result.other(str);
  },
} as const satisfies FormatFunctions;

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A control sequence introducer.
 * @template P The type of the sequence parameter
 * @template C The type of the sequence command
 */
export type CSI<P extends string, C extends cs> = `\x9b${P}${C}`;

/**
 * A control sequence.
 */
export type Sequence = CSI<string, cs> | '';

/**
 * A select graphics rendition sequence.
 */
export type Style = CSI<string, cs.sgr> | '';

/**
 * An 8-bit decimal number.
 */
export type Decimal = Alias<Enumerate<256>>;

/**
 * An 8-bit foreground color.
 */
export type FgColor = [38, 5, Decimal];

/**
 * An 8-bit background color.
 */
export type BgColor = [48, 5, Decimal];

/**
 * An 8-bit underline color.
 */
export type UlColor = [58, 5, Decimal];

/**
 * An underline style.
 */
export type UlStyle = ValuesOf<typeof underlineStyle>;

/**
 * A text styling attribute.
 */
export type StyleAttr = tf | fg | bg | FgColor | BgColor | UlColor | UlStyle;

/**
 * A callback that processes a format specifier when splitting text.
 * @param this The terminal string to append to
 * @param spec The format specifier (e.g., '%s')
 */
export type FormatCallback = (this: TerminalString, spec: string) => void;

/**
 * A set of formatting arguments.
 */
export type FormatArgs = Record<string, unknown>;

/**
 * A message that can be printed on a terminal.
 */
export type Message = ErrorMessage | HelpMessage | WarnMessage | CompletionMessage;

/**
 * A set of styles for terminal messages.
 */
export type MessageStyles = {
  /**
   * The style of boolean values.
   */
  readonly boolean?: Style;
  /**
   * The style of string values.
   */
  readonly string?: Style;
  /**
   * The style of number values.
   */
  readonly number?: Style;
  /**
   * The style of regular expressions.
   */
  readonly regex?: Style;
  /**
   * The style of option names.
   */
  readonly option?: Style;
  /**
   * The style of generic (or unknown) values.
   */
  readonly value?: Style;
  /**
   * The style of URLs.
   */
  readonly url?: Style;
  /**
   * The style of general text.
   */
  readonly text?: Style;
};

/**
 * A concrete version of the format styles.
 */
export type FormatStyles = Concrete<MessageStyles> & {
  /**
   * The current style in use.
   */
  current?: Style;
};

/**
 * The formatting flags.
 */
export type FormattingFlags = {
  /**
   * The phrase alternative, if any.
   */
  readonly alt?: number;
  /**
   * An element separator for array values.
   */
  readonly sep?: string;
  /**
   * Whether the separator should be merged with the previous value. (Defaults to true)
   */
  readonly mergePrev?: boolean;
  /**
   * Whether the separator should be merged with the next value. (Defaults to false)
   */
  readonly mergeNext?: boolean;
};

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * A formatting function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormatFunction = (value: any, styles: FormatStyles, result: TerminalString) => void;

/**
 * A set of formatting functions.
 */
type FormatFunctions = Record<string, FormatFunction>;

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements concatenation of strings that can be printed on a terminal.
 */
export class TerminalString {
  /**
   * Whether the next string should be merged with the last string.
   */
  private merge = false;

  /**
   * The list of internal strings that have been appended.
   */
  readonly strings: Array<string> = [];

  /**
   * The lengths of the internal strings, ignoring control characters and sequences.
   */
  readonly lengths: Array<number> = [];

  /**
   * @returns The combined length of all internal strings, ignoring control characters and sequences
   */
  get length(): number {
    return this.lengths.reduce((acc, len) => acc + len, 0);
  }

  /**
   * @returns The number of internal strings
   */
  get count(): number {
    return this.strings.length;
  }

  /**
   * Creates a terminal string.
   * @param indent The starting column for this string (negative values are replaced by zero)
   * @param breaks The initial number of line feeds (non-positive values are ignored)
   * @param rightAlign True if the string should be right-aligned to the terminal width
   */
  constructor(
    public indent: number = 0,
    breaks = 0,
    public rightAlign = false,
  ) {
    this.break(breaks);
  }

  /**
   * Removes strings from the end of the list.
   * @param count The number of strings
   * @returns The terminal string instance
   */
  pop(count = 1): this {
    if (count > 0) {
      const len = max(0, this.count - count);
      this.strings.length = len;
      this.lengths.length = len;
    }
    return this;
  }

  /**
   * Appends another terminal string to the list.
   * We deliberately avoided optimizing this code, in order to keep it short.
   * @param other The other terminal string
   * @returns The terminal string instance
   */
  other(other: TerminalString): this {
    for (let i = 0; i < other.count; ++i) {
      this.add(other.strings[i], other.lengths[i]);
    }
    this.merge = other.merge;
    return this;
  }

  /**
   * Sets a flag to merge the next word to the last word.
   * @param merge The flag value (defaults to true)
   * @returns The terminal string instance
   */
  setMerge(merge = true): this {
    this.merge = merge;
    return this;
  }

  /**
   * Appends a word that will be merged with the next word.
   * @param word The opening word
   * @returns The terminal string instance
   */
  open(word: string): this {
    return word ? this.word(word).setMerge() : this;
  }

  /**
   * Appends a word that is merged with the last word.
   * @param word The closing word
   * @returns The terminal string instance
   */
  close(word: string): this {
    return this.setMerge().word(word);
  }

  /**
   * Appends a word with surrounding styles.
   * @param begin The starting style
   * @param word The word to be appended
   * @param end The ending style (optional)
   * @returns The terminal string instance
   */
  style(begin: Style, word: string, end: Style = ''): this {
    return this.add(begin + word + end, word.length);
  }

  /**
   * Appends a word to the list.
   * @param word The word to be appended. Should not contain control characters or sequences.
   * @returns The terminal string instance
   */
  word(word: string): this {
    return this.add(word, word.length);
  }

  /**
   * Appends line breaks to the list.
   * @param count The number of line breaks to insert (non-positive values are ignored)
   * @returns The terminal string instance
   */
  break(count = 1): this {
    return count > 0 ? this.add('\n'.repeat(count), 0) : this;
  }

  /**
   * Appends a sequence to the list.
   * @param seq The sequence to insert
   * @returns The terminal string instance
   */
  seq(seq: Sequence): this {
    return this.add(seq, 0);
  }

  /**
   * Appends an SGR clear sequence to the list.
   * This is different from the {@link pop} method (we are aware of this ambiguity, but we want
   * method names to be short).
   * @returns The terminal string instance
   */
  clear(): this {
    return this.add(sgr(tf.clear), 0);
  }

  /**
   * Appends a text that may contain control characters or sequences to the list.
   * @param text The text to be appended
   * @param length The length of the text without control characters or sequences
   * @returns The terminal string instance
   */
  add(text: string, length: number): this {
    if (text) {
      const count = this.count;
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
   * Splits a text into words and style sequences, and appends them to the list.
   * @param text The text to be split
   * @param format An optional callback to process format specifiers
   * @returns The terminal string instance
   */
  split(text: string, format?: FormatCallback): this {
    const paragraphs = text.split(regexps.para);
    paragraphs.forEach((para, i) => {
      splitParagraph(this, para, format);
      if (i < paragraphs.length - 1) {
        this.break(2);
      }
    });
    return this;
  }

  /**
   * Formats a set of arguments.
   * @param styles The format styles
   * @param phrase The custom phrase
   * @param args The format arguments
   * @param flags The formatting flags
   * @returns The terminal string instance
   */
  format(styles: FormatStyles, phrase: string, args?: FormatArgs, flags?: FormattingFlags): this {
    const formatFn = args && formatArgs(styles, args, flags);
    const alternative = flags?.alt !== undefined ? selectAlternative(phrase, flags.alt) : phrase;
    return this.split(alternative, formatFn);
  }

  /**
   * Wraps the internal strings to fit in a terminal width.
   * @param result The resulting strings to append to
   * @param column The current terminal column
   * @param width The desired terminal width (or zero to avoid wrapping)
   * @param emitStyles True if styles should be emitted
   * @returns The updated terminal column
   */
  wrap(result: Array<string>, column: number, width: number, emitStyles: boolean): number {
    /** @ignore */
    function shorten() {
      let length = result.length;
      for (; length && column > start; --length) {
        const last = result[length - 1];
        if (last.length > column - start) {
          result[length - 1] = last.slice(0, start - column); // cut the last string
          break;
        }
        column -= last.length;
      }
      result.length = length;
    }
    /** @ignore */
    function align() {
      if (needToAlign && j < result.length && column < width) {
        const rem = width - column; // remaining columns until right boundary
        const pad = emitStyles ? sequence(cs.cuf, rem) : ' '.repeat(rem);
        result.splice(j, 0, pad); // insert padding at the indentation boundary
        column = width;
      }
    }
    /** @ignore */
    function adjust() {
      const pad = !largestFits
        ? '\n'
        : emitStyles
          ? sequence(cs.cha, start + 1)
          : column < start
            ? ' '.repeat(start - column)
            : '';
      if (pad) {
        result.push(pad);
      } else {
        shorten(); // adjust backwards: shorten the current line
      }
    }
    if (!this.count) {
      return column;
    }
    column = max(0, column);
    width = max(0, width);
    let start = max(0, this.indent);

    const needToAlign = width && this.rightAlign;
    const largestFits = !width || width >= start + Math.max(...this.lengths);
    if (!largestFits) {
      start = 0; // wrap to the first column instead
    }
    const indent = start ? (emitStyles ? sequence(cs.cha, start + 1) : ' '.repeat(start)) : '';
    if (column != start && !this.strings[0].startsWith('\n')) {
      adjust();
      column = start;
    }

    let j = result.length; // save index for right-alignment
    for (let i = 0; i < this.count; ++i) {
      let str = this.strings[i];
      if (str.startsWith('\n')) {
        align();
        j = result.push(str); // save index for right-alignment
        column = 0;
        continue;
      }
      if (!column && indent) {
        j = result.push(indent); // save index for right-alignment
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
        str = str.replace(regexps.style, '');
      }
      if (column === start) {
        result.push(str);
        column += len;
      } else if (!width || column + 1 + len <= width) {
        result.push(' ' + str);
        column += 1 + len;
      } else {
        align();
        j = result.push('\n' + indent, str) - 1; // save index for right-alignment
        column = start + len;
      }
    }
    align();
    return column;
  }
}

/**
 * A terminal message. Used as base for other message classes.
 */
export class TerminalMessage extends Array<TerminalString> {
  /**
   * Wraps the help message to a specified width.
   * @param width The terminal width (or zero to avoid wrapping)
   * @param emitStyles True if styles should be emitted
   * @returns The message to be printed on a terminal
   */
  wrap(width = 0, emitStyles = !omitStyles(width)): string {
    const result: Array<string> = [];
    let column = 0;
    for (const str of this) {
      column = str.wrap(result, column, width, emitStyles);
    }
    if (emitStyles) {
      result.push(sgr(tf.clear));
    }
    return result.join('');
  }

  /**
   * @returns The wrapped message
   */
  override toString(): string {
    return this.wrap(overrides.stdoutCols ?? process?.stdout?.columns);
  }

  /**
   * @returns The wrapped message
   */
  get message(): string {
    return this.toString();
  }
}

/**
 * A help message.
 */
export class HelpMessage extends TerminalMessage {}

/**
 * A warning message.
 */
export class WarnMessage extends TerminalMessage {
  /**
   * @returns The wrapped message
   */
  override toString(): string {
    return this.wrap(overrides.stderrCols ?? process?.stderr?.columns);
  }
}

/**
 * An error message.
 */
export class ErrorMessage extends Error {
  /**
   * The terminal message.
   */
  readonly msg: TerminalMessage;

  /**
   * Creates an error message
   * @param str The terminal string
   */
  constructor(str: TerminalString) {
    super(); // do not wrap the message now. wait until it is actually needed
    this.msg = new WarnMessage(str);
  }

  /**
   * We have to override this, since the message cannot be transformed after being wrapped.
   * @returns The wrapped message
   */
  override toString(): string {
    return this.msg.toString();
  }

  /**
   * @returns The wrapped message
   */
  get message(): string {
    return this.toString();
  }
}

/**
 * A completion message.
 */
export class CompletionMessage extends Array<string> {
  /**
   * @returns The wrapped message
   */
  override toString(): string {
    return this.join('\n');
  }

  /**
   * @returns The wrapped message
   */
  get message(): string {
    return this.toString();
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Splits a paragraph into words and style sequences, and appends them to the list.
 * @param result The resulting string
 * @param para The paragraph to be split
 * @param format An optional callback to process format specifiers
 */
function splitParagraph(result: TerminalString, para: string, format?: FormatCallback) {
  const count = result.count;
  para.split(regexps.item).forEach((item, i) => {
    if (i % 2 == 0) {
      splitItem(result, item, format);
    } else {
      if (result.count > count) {
        result.break();
      }
      result.word(item);
    }
  });
}

/**
 * Splits a list item into words and style sequences, and appends them to the list.
 * @param result The resulting string
 * @param item The list item to be split
 * @param format An optional callback to process format specifiers
 */
function splitItem(result: TerminalString, item: string, format?: FormatCallback) {
  const boundFormat = format?.bind(result);
  const words = item.split(regexps.word);
  for (const word of words) {
    if (!word) {
      continue;
    }
    if (boundFormat) {
      const parts = word.split(regexps.spec);
      if (parts.length > 1) {
        result.open(parts[0]);
        for (let i = 1; i < parts.length; i += 2) {
          boundFormat(parts[i]);
          result.close(parts[i + 1]).setMerge();
        }
        result.setMerge(false);
        continue;
      }
    }
    const styles = word.match(regexps.style) ?? [];
    const length = styles.reduce((acc, str) => acc + str.length, 0);
    result.add(word, word.length - length);
  }
}

/**
 * Creates a formatting callback from a set of styles and arguments.
 * @param styles The format styles
 * @param args The format arguments
 * @param flags The formatting flags
 * @returns The formatting callback
 */
function formatArgs(
  styles: FormatStyles,
  args: FormatArgs,
  flags: FormattingFlags = { sep: ',' },
): FormatCallback {
  return function (this: TerminalString, spec: string) {
    const arg = spec.slice(1);
    const fmt = arg[0];
    if (fmt in formatFunctions && arg in args) {
      const value = args[arg];
      const formatFn = (formatFunctions as FormatFunctions)[fmt];
      if (Array.isArray(value)) {
        value.forEach((val, i) => {
          formatFn(val, styles, this);
          if (flags?.sep && i < value.length - 1) {
            this.setMerge(flags.mergePrev)
              .word(flags.sep)
              .setMerge(flags.mergeNext ?? false);
          }
        });
      } else {
        formatFn(value, styles, this);
      }
    }
  };
}

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
function sequence<T extends cs>(cmd: T, ...params: Array<number>): CSI<string, T> {
  return `\x9b${params.join(';')}${cmd}`;
}

/**
 * Creates an SGR sequence.
 * @param attrs The text styling attributes
 * @returns The SGR sequence
 */
function sgr(...attrs: Array<StyleAttr>): Style {
  return sequence(cs.sgr, ...attrs.flat());
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
