//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import type { MessageConfig } from './config.js';
import type { Alias, Args, Enumerate, ValuesOf } from './utils.js';

import { ConnectiveWord, ErrorItem, cs, fg, bg, tf } from './enums.js';
import {
  getEntries,
  isArray,
  max,
  omitStyles,
  regex,
  selectAlternative,
  streamWidth,
} from './utils.js';

export { sequence as seq, sgr as style, foreground as fg8, background as bg8, underline as ul8 };
export { underlineStyle as ul, formatFunctions as fmt };

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
 * A map of data type to formatting function key.
 */
const typeMapping: Record<string, string> = {
  boolean: 'b',
  string: 's',
  symbol: 'm',
  number: 'n',
  bigint: 'n',
  object: 'o',
} as const;

/**
 * The formatting function for each data types.
 */
const formatFunctions = {
  /**
   * The formatting function for boolean values.
   * @param value The boolean value
   * @param config The message configuration
   * @param result The resulting string
   */
  b(value: boolean, config, result) {
    result.style = config.styles.boolean;
    result.word(`${value}`);
  },
  /**
   * The formatting function for string values.
   * @param value The string value
   * @param config The message configuration
   * @param result The resulting string
   */
  s(value: string, config, result) {
    const quote = config.connectives[ConnectiveWord.stringQuote];
    result.style = config.styles.string;
    result.word(`${quote}${value}${quote}`);
  },
  /**
   * The formatting function for number values.
   * @param value The number value
   * @param config The message configuration
   * @param result The resulting string
   */
  n(value: number, config, result) {
    result.style = config.styles.number;
    result.word(`${value}`);
  },
  /**
   * The formatting function for regular expressions.
   * @param value The regular expression
   * @param config The message configuration
   * @param result The resulting string
   */
  r(value: RegExp, config, result) {
    result.style = config.styles.regex;
    result.word(`${value}`);
  },
  /**
   * The formatting function for symbols.
   * @param value The symbol value
   * @param config The message configuration
   * @param result The resulting string
   */
  m(value: symbol, config, result) {
    result.style = config.styles.symbol;
    result.word(Symbol.keyFor(value) ?? '');
  },
  /**
   * The formatting function for URLs.
   * @param url The URL object
   * @param config The message configuration
   * @param result The resulting string
   */
  u(url: URL, config, result) {
    result.style = config.styles.url;
    result.word(url.href);
  },
  /**
   * The formatting function for ANSI strings.
   * @param str The ANSI string
   * @param _config The message configuration
   * @param result The resulting string
   */
  t(str: AnsiString, _config, result) {
    result.other(str);
  },
  /**
   * The formatting function for custom format callbacks.
   * This is used internally and should not be exposed in the API.
   * @param arg The format argument
   * @param _config The message configuration
   * @param result The resulting string
   * @param flags The formatting flags
   */
  c(arg: unknown, _config, result, flags) {
    flags.custom?.bind(result)(arg);
  },
  /**
   * The formatting function for array values.
   * A custom format callback may be used for array elements.
   * @param value The array value
   * @param config The message configuration
   * @param result The resulting string
   * @param flags The formatting flags
   */
  a(value: Array<unknown>, config, result, flags) {
    const connectives = config.connectives;
    const sep = flags.sep ?? connectives[ConnectiveWord.arraySep];
    const open = flags.open ?? connectives[ConnectiveWord.arrayOpen];
    const close = flags.close ?? connectives[ConnectiveWord.arrayClose];
    result.open(open);
    value.forEach((val, i) => {
      const spec = flags.custom ? 'c' : 'v';
      this[spec](val, config, result, flags);
      if (sep && i < value.length - 1) {
        result.merge = flags.mergePrev ?? true;
        result.word(sep);
        result.merge = flags.mergeNext ?? false;
      }
    });
    result.close(close);
  },
  /**
   * The formatting function for object values.
   * Assumes that the object is not null.
   * @param value The object value
   * @param config The message configuration
   * @param result The resulting string
   * @param flags The formatting flags
   */
  o(value: object, config, result, flags) {
    const connectives = config.connectives;
    const valueSep = connectives[ConnectiveWord.valueSep];
    const newFlags: FormattingFlags = {
      ...flags,
      sep: flags.sep ?? connectives[ConnectiveWord.objectSep],
      open: flags.open ?? connectives[ConnectiveWord.objectOpen],
      close: flags.close ?? connectives[ConnectiveWord.objectClose],
      custom: (entry) => {
        const [key, val] = entry as [string, unknown];
        if (key.match(regex.id)) {
          result.word(key);
        } else {
          this['s'](key, config, result, flags);
        }
        result.close(valueSep);
        this['v'](val, config, result, flags);
      },
    };
    const entries = getEntries(value as Record<string, unknown>);
    this['a'](entries, config, result, newFlags);
  },
  /**
   * The formatting function for unknown values.
   * @param value The unknown value
   * @param config The message configuration
   * @param result The resulting string
   * @param flags The formatting flags
   */
  v(value: unknown, config, result, flags) {
    const spec =
      value instanceof URL
        ? 'u'
        : value instanceof RegExp
          ? 'r'
          : value instanceof AnsiString
            ? 't'
            : isArray(value)
              ? 'a'
              : typeMapping[typeof value];
    if (spec && value !== null) {
      this[spec](value, config, result, flags);
    } else {
      const connectives = config.connectives;
      const open = connectives[ConnectiveWord.valueOpen];
      const close = connectives[ConnectiveWord.valueClose];
      result.seq(config.styles.value);
      result.merge = true;
      result.open(open).split(`${value}`).close(close);
      if (config.styles.value) {
        result.merge = true;
        result.clear();
        result.merge = true;
        result.seq(result.defStyle); // TODO: optimize this
      }
    }
  },
} as const satisfies FormatFunctions;

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A callback that processes a placeholder when splitting text.
 * @param this The ANSI string to append to
 * @param arg The placeholder or argument
 */
export type FormatCallback<T = string> = (this: AnsiString, arg: T) => void;

/**
 * The formatting flags.
 */
export type FormattingFlags = {
  /**
   * The phrase alternative, if any.
   */
  readonly alt?: number;
  /**
   * An element delimiter for array and object values.
   * Overrides {@link ConnectiveWord.arraySep} and {@link ConnectiveWord.objectSep} from
   * {@link MessageConfig.connectives}.
   */
  readonly sep?: string;
  /**
   * An opening delimiter for array and object values.
   * Overrides {@link ConnectiveWord.arrayOpen} and {@link ConnectiveWord.objectOpen} from
   * {@link MessageConfig.connectives}.
   */
  readonly open?: string;
  /**
   * A closing delimiter for array and object values.
   * Overrides {@link ConnectiveWord.arrayClose} and {@link ConnectiveWord.objectClose} from
   * {@link MessageConfig.connectives}.
   */
  readonly close?: string;
  /**
   * Whether the separator should be merged with the previous value. (Defaults to true)
   */
  readonly mergePrev?: boolean;
  /**
   * Whether the separator should be merged with the next value. (Defaults to false)
   */
  readonly mergeNext?: boolean;
  /**
   * A custom callback to format arguments.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly custom?: FormatCallback<any>;
};

/**
 * A control sequence introducer.
 * @template P The type of the sequence parameter
 * @template C The type of the sequence command
 */
export type CSI<P extends string, C extends cs> = `\x1b[${P}${C}`;

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

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * A formatting function.
 * @param value The value to be formatted
 * @param config The message configuration
 * @param result The resulting string
 * @param flags The formatting flags
 */
type FormatFunction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  config: MessageConfig,
  result: AnsiString,
  flags: FormattingFlags,
) => void;

/**
 * A set of formatting functions.
 */
type FormatFunctions = Record<string, FormatFunction>;

/**
 * The ANSI string context.
 */
type AnsiContext = [
  /**
   * The list of internal strings that have been appended.
   */
  strings: Array<string>,
  /**
   * The lengths of the internal strings, ignoring control sequences.
   */
  lengths: Array<number>,
  /**
   * Whether the next string should be merged with the last string.
   */
  merge: boolean,
  /**
   * The style to apply to the next string.
   */
  style: Style,
];

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements concatenation of strings that can be printed on a terminal.
 */
export class AnsiString {
  /**
   * The ANSI string context.
   */
  private readonly context: AnsiContext = [[], [], false, ''];

  /**
   * Whether to merge the first internal string to the last internal string of another terminal
   * string.
   */
  private mergeFirst = false;

  /**
   * @returns The list of internal strings
   */
  get strings(): Array<string> {
    return this.context[0];
  }

  /**
   * @returns The lengths of internal strings
   */
  get lengths(): Array<number> {
    return this.context[1];
  }

  /**
   * @returns The number of internal strings
   */
  get count(): number {
    return this.context[1].length;
  }

  /**
   * Sets a flag to merge the next word with the last word.
   * @param merge The flag value
   */
  set merge(merge: boolean) {
    this.context[2] = merge;
  }

  /**
   * Sets a style to apply to the next word.
   * @param style The style
   */
  set style(style: Style) {
    this.context[3] = style;
  }

  /**
   * Creates a ANSI string.
   * @param indent The starting column for this string (negative values are replaced by zero)
   * @param breaks The initial number of line feeds (non-positive values are ignored)
   * @param righty True if the string should be right-aligned to the terminal width
   * @param defStyle The default style to use
   */
  constructor(
    public indent = 0,
    breaks = 0,
    public righty = false,
    public defStyle: Style = '',
  ) {
    this.break(breaks).seq(defStyle);
  }

  /**
   * Removes strings from the end of the list.
   * @param count The number of strings
   * @returns The ANSI string instance
   */
  pop(count = 1): this {
    if (count > 0) {
      const [strings, lengths] = this.context;
      const len = max(0, strings.length - count);
      strings.length = len;
      lengths.length = len;
    }
    return this;
  }

  /**
   * Appends another ANSI string to the list.
   * We deliberately avoided optimizing this code, in order to keep it short.
   * @param other The other ANSI string
   * @returns The ANSI string instance
   */
  other(other: AnsiString): this {
    if (other.count) {
      const [otherStrings, otherLengths, otherMerge] = other.context;
      this.context[2] ||= other.mergeFirst;
      const [str, ...restStr] = otherStrings;
      const [len, ...restLen] = otherLengths;
      const [strings, lengths] = this.add(str, len).context;
      strings.push(...restStr);
      lengths.push(...restLen);
      this.merge = otherMerge;
    }
    return this;
  }

  /**
   * Appends a word that will be merged with the next word.
   * @param word The opening word
   * @param pos The position of a previously added word
   * @returns The ANSI string instance
   */
  open(word: string, pos = NaN): this {
    if (pos >= 0 && pos < this.count) {
      const [strings, lengths] = this.context;
      strings[pos] = word + strings[pos];
      lengths[pos] += word.length;
    } else if (word) {
      this.word(word).merge = true;
    }
    return this;
  }

  /**
   * Appends a word that is merged with the last word.
   * @param word The closing word
   * @returns The ANSI string instance
   */
  close(word: string): this {
    if (word) {
      this.merge = true;
      this.word(word);
    }
    return this;
  }

  /**
   * Appends a word to the list.
   * @param word The word to be appended. Should not contain control characters or sequences.
   * @returns The ANSI string instance
   */
  word(word: string): this {
    return this.add(word, word.length);
  }

  /**
   * Appends line breaks to the list.
   * @param count The number of line breaks to insert (non-positive values are ignored)
   * @returns The ANSI string instance
   */
  break(count = 1): this {
    return count > 0 ? this.add('\n'.repeat(count), 0) : this;
  }

  /**
   * Appends a sequence to the list.
   * @param seq The sequence to insert
   * @returns The ANSI string instance
   */
  seq(seq: Sequence): this {
    return this.add(seq, 0);
  }

  /**
   * Appends an SGR clear sequence to the list.
   * This is different from the {@link pop} method (we are aware of this ambiguity, but we want
   * method names to be short).
   * @returns The ANSI string instance
   */
  clear(): this {
    return this.add(sgr(tf.clear), 0);
  }

  /**
   * Appends a text that may contain control characters or sequences to the list.
   * @param text The text to be appended
   * @param length The length of the text without control characters or sequences
   * @returns The ANSI string instance
   */
  add(text: string, length: number): this {
    if (text) {
      const [strings, lengths, merge, curStyle] = this.context;
      let index = 0;
      if (!strings.length) {
        this.mergeFirst = merge;
      } else {
        index = strings.length - (merge ? 1 : 0);
      }
      const revert = curStyle ? sgr(tf.clear) + this.defStyle : '';
      strings[index] = (strings[index] ?? '') + curStyle + text + revert;
      lengths[index] = (lengths[index] ?? 0) + length;
    }
    this.merge = false;
    this.style = '';
    return this;
  }

  /**
   * Splits a text into words and style sequences, and appends them to the list.
   * @param text The text to be split
   * @param format An optional callback to process placeholders
   * @returns The ANSI string instance
   */
  split(text: string, format?: FormatCallback): this {
    const paragraphs = text.split(regex.para);
    paragraphs.forEach((para, i) => {
      splitParagraph(this, para, format);
      if (i < paragraphs.length - 1) {
        this.break(2);
      }
    });
    return this;
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
    function align() {
      if (needToAlign && j < result.length && column < width) {
        const rem = width - column; // remaining columns until right boundary
        const pad = emitStyles ? sequence(cs.cuf, rem) : ' '.repeat(rem);
        result.splice(j, 0, pad); // insert padding at the indentation boundary
        column = width;
      }
    }
    const count = this.count;
    if (!count) {
      return column;
    }
    column = max(0, column);
    width = max(0, width);
    let start = max(0, this.indent);

    const [strings, lengths] = this.context;
    const needToAlign = width && this.righty;
    const largestFits = !width || width >= start + Math.max(...lengths);
    if (!largestFits) {
      start = 0; // wrap to the first column instead
    }
    if (column !== start && !strings[0].startsWith('\n')) {
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
        // adjust backwards: shorten the current line
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
      column = start;
    }

    const indent = start ? (emitStyles ? sequence(cs.cha, start + 1) : ' '.repeat(start)) : '';
    let j = result.length; // save index for right-alignment
    for (let i = 0; i < count; ++i) {
      let str = strings[i];
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
      const len = lengths[i];
      if (!len) {
        if (emitStyles) {
          result.push(str);
        }
        continue;
      }
      if (!emitStyles) {
        str = str.replace(regex.sgr, '');
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

  /**
   * Formats a text from a custom phrase with a set of arguments.
   * @param config The message configuration
   * @param phrase The message phrase
   * @param flags The formatting flags
   * @param args The message arguments
   * @returns The ANSI string instance
   */
  format(config: MessageConfig, phrase: string, flags: FormattingFlags = {}, ...args: Args): this {
    const formatFn: FormatCallback | undefined =
      args &&
      function (spec) {
        const index = Number(spec.slice(1));
        if (index >= 0 && index < args.length) {
          formatFunctions.v(args[index], config, this, flags);
        }
      };
    const alternative = flags.alt !== undefined ? selectAlternative(phrase, flags.alt) : phrase;
    return this.split(alternative, formatFn);
  }
}

/**
 * The ANSI message. Used as base for other message classes.
 */
export class AnsiMessage extends Array<AnsiString> {
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
    return this.wrap(streamWidth('stdout'));
  }

  /**
   * @returns The wrapped message
   */
  get message(): string {
    return this.toString();
  }
}

/**
 * A warning message.
 */
export class WarnMessage extends AnsiMessage {
  /**
   * @returns The wrapped message
   */
  override toString(): string {
    return this.wrap(streamWidth('stderr'));
  }
}

/**
 * An error message.
 */
export class ErrorMessage extends Error {
  /**
   * The terminal message.
   */
  readonly msg: AnsiMessage;

  /**
   * Creates an error message
   * @param str The ANSI string
   */
  constructor(str: AnsiString) {
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
 * A text message.
 */
export class TextMessage extends Array<string> {
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

/**
 * Implements formatting of error and warning messages.
 */
export class ErrorFormatter {
  /**
   * Creates an error formatter.
   * @param config The message configuration
   */
  constructor(readonly config: MessageConfig) {}

  /**
   * Creates a formatted error message.
   * @param kind The message kind
   * @param flags The formatting flags
   * @param args The message arguments
   * @returns The formatted error
   */
  error(kind: ErrorItem, flags?: FormattingFlags, ...args: Args): ErrorMessage {
    return new ErrorMessage(this.create(kind, flags, ...args));
  }

  /**
   * Creates a formatted message.
   * The message always ends with a single line break.
   * @template T The type of phrase identifier
   * @param kind The message kind
   * @param flags The formatting flags
   * @param args The message arguments
   * @returns The formatted message
   */
  create(kind: ErrorItem, flags?: FormattingFlags, ...args: Args): AnsiString {
    return this.format(this.config.errorPhrases[kind], flags, ...args);
  }

  /**
   * Creates a formatted message.
   * The message always ends with a single line break.
   * @param phrase The message phrase
   * @param flags The formatting flags
   * @param args The message arguments
   * @returns The formatted message
   */
  format(phrase: string, flags?: FormattingFlags, ...args: Args): AnsiString {
    return new AnsiString(0, 0, false, this.config.styles.text)
      .format(this.config, phrase, flags, ...args)
      .break();
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Splits a paragraph into words and style sequences, and appends them to the list.
 * @param result The resulting string
 * @param para The paragraph to be split
 * @param format An optional callback to process placeholders
 */
function splitParagraph(result: AnsiString, para: string, format?: FormatCallback) {
  const count = result.count;
  para.split(regex.item).forEach((item, i) => {
    if (i % 2 === 0) {
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
 * @param format An optional callback to process placeholders
 */
function splitItem(result: AnsiString, item: string, format?: FormatCallback) {
  const boundFormat = format?.bind(result);
  const words = item.split(regex.word);
  for (const word of words) {
    if (!word) {
      continue;
    }
    if (boundFormat) {
      const parts = word.split(regex.spec);
      if (parts.length > 1) {
        result.open(parts[0]);
        for (let i = 1; i < parts.length; i += 2) {
          boundFormat(parts[i]);
          result.close(parts[i + 1]).merge = true;
        }
        result.merge = false;
        continue;
      }
    }
    const styles = word.match(regex.sgr) ?? [];
    const length = styles.reduce((acc, str) => acc + str.length, 0);
    result.add(word, word.length - length);
  }
}

/**
 * Creates a control sequence.
 * @template T The type of the sequence command
 * @param cmd The sequence command
 * @param params The sequence parameters
 * @returns The control sequence
 */
function sequence<T extends cs>(cmd: T, ...params: Array<number>): CSI<string, T> {
  return `\x1b[${params.join(';')}${cmd}`;
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
