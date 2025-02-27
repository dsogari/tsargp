//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import type { ConnectiveWords } from './config.js';
import type { ErrorItem, fg, bg } from './enums.js';
import type { Alias, Args, Enumerate, ValuesOf } from './utils.js';

import { config } from './config.js';
import { cs, tf } from './enums.js';
import {
  getEntries,
  isArray,
  max,
  omitStyles,
  omitSpaces,
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
const underlineStyle: UnderlineStyles = {
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
};

/**
 * A map of data type to format specifier.
 */
const typeMapping: DataTypeToFormatSpecifier = {
  boolean: 'b',
  string: 's',
  symbol: 'm',
  number: 'n',
  bigint: 'n',
  object: 'o',
};

/**
 * The formatting function for each data type.
 */
const formatFunctions: FormatFunctions = {
  /**
   * The formatting function for boolean values.
   * @param value The boolean value
   * @param result The resulting string
   */
  b(value: boolean, result) {
    result.word(`${value}`, config.styles.boolean);
  },
  /**
   * The formatting function for string values.
   * @param value The string value
   * @param result The resulting string
   */
  s(value: string, result) {
    const quote = config.connectives.stringQuote;
    result.word(`${quote}${value}${quote}`, config.styles.string);
  },
  /**
   * The formatting function for number values.
   * @param value The number value
   * @param result The resulting string
   */
  n(value: number, result) {
    result.word(`${value}`, config.styles.number);
  },
  /**
   * The formatting function for regular expressions.
   * @param value The regular expression
   * @param result The resulting string
   */
  r(value: RegExp, result) {
    result.word(`${value}`, config.styles.regex);
  },
  /**
   * The formatting function for symbols.
   * @param value The symbol value
   * @param result The resulting string
   */
  m(value: symbol, result) {
    result.word(Symbol.keyFor(value) ?? '', config.styles.symbol);
  },
  /**
   * The formatting function for URLs.
   * @param url The URL object
   * @param result The resulting string
   */
  u(url: URL, result) {
    result.word(url.href, config.styles.url);
  },
  /**
   * The formatting function for ANSI strings.
   * @param str The ANSI string
   * @param result The resulting string
   */
  t(str: AnsiString, result) {
    result.other(str);
  },
  /**
   * The formatting function for custom format callbacks.
   * For internal use only.
   * @param arg The format argument
   * @param result The resulting string
   * @param flags The formatting flags
   */
  c(arg: unknown, result, flags) {
    flags.custom?.bind(result)(arg);
  },
  /**
   * The formatting function for array values.
   * A custom format callback may be used for array elements.
   * @param value The array value
   * @param result The resulting string
   * @param flags The formatting flags
   */
  a(value: Array<unknown>, result, flags) {
    const connectives = config.connectives;
    const sep = flags.sep ?? connectives.arraySep;
    const open = flags.open ?? connectives.arrayOpen;
    const close = flags.close ?? connectives.arrayClose;
    result.open(open);
    value.forEach((val, i) => {
      const spec = flags.custom ? 'c' : 'v';
      this[spec](val, result, flags);
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
   * @param result The resulting string
   * @param flags The formatting flags
   */
  o(value: object, result, flags) {
    const connectives = config.connectives;
    const valueSep = connectives.valueSep;
    const newFlags: FormattingFlags = {
      ...flags,
      sep: flags.sep ?? connectives.objectSep,
      open: flags.open ?? connectives.objectOpen,
      close: flags.close ?? connectives.objectClose,
      custom: (entry) => {
        const [key, val] = entry as [string, unknown];
        if (regex.id.test(key)) {
          result.word(key);
        } else {
          this['s'](key, result, flags);
        }
        result.close(valueSep);
        this['v'](val, result, flags);
      },
    };
    const entries = getEntries(value as Record<string, unknown>);
    this['a'](entries, result, newFlags);
  },
  /**
   * The formatting function for unknown values.
   * @param value The unknown value
   * @param result The resulting string
   * @param flags The formatting flags
   */
  v(value: unknown, result, flags) {
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
      this[spec](value, result, flags);
    } else {
      const connectives = config.connectives;
      const open = connectives.valueOpen;
      const close = connectives.valueClose;
      result.open('', config.styles.value);
      result.open(open).split(`${value}`).close(close);
      if (config.styles.value) {
        result.close('', result.defSty);
      }
    }
  },
};

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * The name of a predefined underline style.
 */
export type UnderlineStyle = 'none' | 'single' | 'double' | 'curly' | 'dotted' | 'dashed';

/**
 * A set of underline styles.
 */
export type UnderlineStyles = Readonly<Record<UnderlineStyle, [4, number]>>;

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
   * Overrides {@link ConnectiveWords.arraySep} and {@link ConnectiveWords.objectSep}.
   */
  readonly sep?: string;
  /**
   * An opening delimiter for array and object values.
   * Overrides {@link ConnectiveWords.arrayOpen} and {@link ConnectiveWords.objectOpen}.
   */
  readonly open?: string;
  /**
   * A closing delimiter for array and object values.
   * Overrides {@link ConnectiveWords.arrayClose} and {@link ConnectiveWords.objectClose}.
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
  readonly custom?: FormatCallback<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
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

/**
 * A format specifier.
 */
export type FormatSpecifier =
  | 'a' // array
  | 'b' // boolean
  | 's' // string
  | 'n' // number
  | 'r' // regexp
  | 'v' // unknown
  | 'u' // url
  | 't' // ANSI string
  | 'o' // object
  | 'm' // symbol
  | 'c'; // custom

/**
 * A formatting function.
 * @param value The value to be formatted
 * @param result The resulting string
 * @param flags The formatting flags
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormatFunction = (value: any, result: AnsiString, flags: FormattingFlags) => void;

/**
 * A set of formatting functions.
 */
export type FormatFunctions = Readonly<Record<FormatSpecifier, FormatFunction>>;

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * The ANSI string context.
 */
type AnsiContext = [
  /**
   * The list of internal strings without control sequences.
   */
  strings: Array<string>,
  /**
   * The list of internal strings with control sequences.
   */
  styledStrings: Array<string>,
  /**
   * The styles to be applied to the next string.
   */
  curStyle: string,
  /**
   * Whether the first internal string should be merged with the previous string.
   */
  mergeLeft: boolean,
  /**
   * Whether the last internal string should be merged with the next string.
   */
  mergeRight: boolean,
  /**
   * The largest length among all internal strings.
   */
  maxLength: number,
];

/**
 * A mapping of data type to format specifier.
 */
type DataTypeToFormatSpecifier = Readonly<Record<string, FormatSpecifier>>;

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
  private context: AnsiContext = [[], [], '', false, false, 0];

  /**
   * @returns The list of internal strings without control sequences
   */
  get strings(): Array<string> {
    return this.context[0];
  }

  /**
   * @returns The list of internal strings with control sequences
   */
  get styles(): Array<string> {
    return this.context[1];
  }

  /**
   * @returns The number of internal strings
   */
  get count(): number {
    return this.strings.length;
  }

  /**
   * @returns The combined length including spaces (but with no wrapping)
   */
  get totalLen(): number {
    const len = this.strings.reduce(
      (acc, str) => acc + (str.length ? str.length + 1 : acc && -1),
      0,
    );
    return len && len - 1;
  }

  /**
   * @returns The mergeLeft flag value
   */
  get mergeLeft(): boolean {
    return this.context[3];
  }

  /**
   * Sets a flag to merge the next word with the last word.
   * @param merge The flag value
   */
  set merge(merge: boolean) {
    this.context[4] = merge;
  }

  /**
   * Creates a ANSI string.
   * @param indent The starting column for this string (negative values are replaced by zero)
   * @param breaks The initial number of line feeds (non-positive values are ignored)
   * @param righty True if the string should be right-aligned to the terminal width
   * @param defSty The default style to use (defaults to empty)
   */
  constructor(
    public indent = 0,
    breaks = 0,
    public righty = false,
    public defSty = '',
  ) {
    this.break(breaks).context[2] = defSty;
  }

  /**
   * Removes all strings.
   * @returns The ANSI string instance
   */
  clear(): this {
    this.context = [[], [], '', false, false, 0];
    return this;
  }

  /**
   * Appends another ANSI string.
   * @param other The other ANSI string
   * @returns The ANSI string instance
   */
  other(other: AnsiString): this {
    if (other.count) {
      const [thisStrings, thisStyledStrings] = this.context;
      const [
        otherStrings,
        otherStyledStrings,
        otherCurStyle,
        otherMergeLeft,
        otherMergeRight,
        otherMaxLength,
      ] = other.context;
      const [firstString, ...restStrings] = otherStrings;
      const [firstStyledString, ...restStyledStrings] = otherStyledStrings;
      if (firstString.length) {
        this.add(firstString, firstStyledString, otherMergeLeft);
      } else {
        // line feed
        thisStrings.push(firstString);
        thisStyledStrings.push(firstStyledString);
      }
      thisStrings.push(...restStrings);
      thisStyledStrings.push(...restStyledStrings);
      this.context[2] = otherCurStyle;
      this.context[4] = otherMergeRight;
      this.context[5] = max(this.context[5], otherMaxLength);
    }
    return this;
  }

  /**
   * Prepends text to the string at a specific position.
   * This can only be done if the affected string does not contain opening styles.
   * @param text The opening text
   * @param pos The position of the previously added string
   * @returns The ANSI string instance
   */
  openAtPos(text: string, pos: number): this {
    if (pos >= this.count) {
      return this.open(text);
    }
    if (pos >= 0) {
      const [strings, styledStrings] = this.context;
      strings[pos] = text + strings[pos];
      styledStrings[pos] = text + styledStrings[pos];
    }
    return this;
  }

  /**
   * Appends text that will be merged with the next text.
   * @param text The text with no control sequences
   * @param styledText The text with possible control sequences
   * @returns The ANSI string instance
   */
  open(text: string, styledText = text): this {
    this.add(text, styledText);
    if (text) {
      this.merge = true;
    }
    return this;
  }

  /**
   * Appends a text that is merged with the last text.
   * @param text The text with no control sequences
   * @param styledText The text with possible control sequences
   * @returns The ANSI string instance
   */
  close(text: string, styledText = text): this {
    return this.add(text, styledText, true);
  }

  /**
   * Appends line breaks.
   * @param count The number of line breaks to insert (non-positive values are ignored)
   * @returns The ANSI string instance
   */
  break(count = 1): this {
    if (count > 0) {
      const [strings, styledStrings] = this.context;
      strings.push(''); // the only case where the string can be empty
      styledStrings.push('\n'.repeat(count)); // special case for line feeds
      this.merge = false;
    }
    return this;
  }

  /**
   * Appends a word.
   * @param word The word to insert
   * @param sty The style to be applied
   * @returns The ANSI string instance
   */
  word(word: string, sty: Style = ''): this {
    if (word) {
      this.add(word, sty ? sty + word + this.defSty : word);
    }
    return this;
  }

  /**
   * Appends a text.
   * @param text The text with no control sequences
   * @param styledText The text with possible control sequences
   * @param close True if the text should be merged with the previous string, if any
   * @returns The ANSI string instance
   */
  add(text: string, styledText: string, close = false): this {
    if (styledText) {
      const count = this.count;
      const [strings, styledStrings, curStyle, , mergeRight, maxLength] = this.context;
      if (text) {
        if (count && (mergeRight || close)) {
          strings[count - 1] += text;
          styledStrings[count - 1] += curStyle + styledText;
          text = strings[count - 1]; // to update maxLength
        } else {
          strings.push(text);
          styledStrings.push(curStyle + styledText);
        }
        if (!maxLength) {
          this.context[3] = mergeRight || close;
        }
        this.context[5] = max(maxLength, text.length);
        this.merge = false;
      } else if (!close) {
        this.context[2] += styledText; // append to opening style
      } else if (count && !curStyle) {
        styledStrings[count - 1] += styledText; // close with style
      }
      if (text || close) {
        this.context[2] = '';
      }
    }
    return this;
  }

  /**
   * Splits a text into words and style sequences, and appends them.
   * @param text The text to be split
   * @param format An optional callback to process placeholders
   * @returns The ANSI string instance
   */
  split(text: string, format?: FormatCallback): this {
    const paragraphs = text.split(regex.para);
    paragraphs.forEach((paragraph, i) => {
      splitParagraph(this, paragraph, format);
      if (i < paragraphs.length - 1) {
        this.break(2);
      }
    });
    return this.close('', this.defSty); // reset from possible inline styles
  }

  /**
   * Wraps the internal strings to fit in a terminal width.
   * @param result The resulting strings to append to
   * @param column The current terminal column
   * @param width The desired terminal width (or zero to avoid wrapping)
   * @param emitStyles True if styles should be emitted
   * @param emitSpaces True if spaces should be emitted instead of move sequences
   * @returns The updated terminal column
   */
  wrap(
    result: Array<string>,
    column: number,
    width: number,
    emitStyles: boolean,
    emitSpaces: boolean,
  ): number {
    /** @ignore */
    function align() {
      if (needToAlign && j < result.length && column < width) {
        const rem = width - column; // remaining columns until right boundary
        const pad = !emitSpaces ? sequence(cs.cuf, rem) : ' '.repeat(rem);
        result.splice(j, 0, pad); // insert padding at the indentation boundary
        column = width;
      }
    }
    /** @ignore */
    function push(str: string, col: number): number {
      column = col;
      return result.push(str);
    }
    const count = this.count;
    if (!count) {
      return column;
    }
    column = max(0, column);
    width = max(0, width);
    let start = max(0, this.indent);

    const [strings, styledStrings, , , , maxLength] = this.context;
    const needToAlign = width && this.righty;
    const largestFits = !width || width >= start + maxLength;
    if (!largestFits) {
      start = 0; // wrap to the first column instead
    }
    if (column !== start && strings[0]) {
      const pad = !largestFits
        ? '\n'
        : !emitSpaces
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

    const indent = start ? (!emitSpaces ? sequence(cs.cha, start + 1) : ' '.repeat(start)) : '';
    let j = result.length; // save index for right-alignment
    for (let i = 0; i < count; i++) {
      let str = strings[i];
      const len = str.length;
      const styledStr = styledStrings[i];
      if (!len) {
        align();
        j = push(styledStr, 0); // save index for right-alignment
        continue;
      }
      if (!column && indent) {
        j = push(indent, start); // save index for right-alignment
      }
      if (emitStyles) {
        str = styledStr;
      }
      if (column === start) {
        push(str, column + len);
      } else if (!width || column + 1 + len <= width) {
        push(' ' + str, column + 1 + len);
      } else {
        align();
        j = push('\n' + indent, start + len); // save index for right-alignment
        result.push(str);
      }
    }
    align();
    return column;
  }

  /**
   * Formats a text from a custom phrase with a set of arguments.
   * @param phrase The message phrase
   * @param flags The formatting flags
   * @param args The message arguments
   * @returns The ANSI string instance
   */
  format(phrase: string, flags: FormattingFlags = {}, ...args: Args): this {
    const formatFn: FormatCallback | undefined =
      args &&
      function (spec) {
        const index = Number(spec.slice(1));
        if (index >= 0 && index < args.length) {
          formatFunctions.v(args[index], this, flags);
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
   * @param emitSpaces True if spaces should be emitted instead of move sequences
   * @returns The message to be printed on a terminal
   */
  wrap(
    width: number = 0,
    emitStyles: boolean = !omitStyles(width),
    emitSpaces: boolean = !omitSpaces(width),
  ): string {
    const result: Array<string> = [];
    let column = 0;
    for (const str of this) {
      column = str.wrap(result, column, width, emitStyles, emitSpaces);
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
   * Appends a ANSI message formatted from an error phrase.
   * @param kind The error kind
   * @param flags The formatting flags
   * @param args The error arguments
   */
  add(kind: ErrorItem, flags?: FormattingFlags, ...args: Args) {
    this.addCustom(config.errorPhrases[kind], flags, ...args);
  }

  /**
   * Appends a ANSI string formatted from a custom phrase.
   * @param phrase The phrase
   * @param flags The formatting flags
   * @param args The phrase arguments
   */
  addCustom(phrase: string, flags?: FormattingFlags, ...args: Args) {
    const str = new AnsiString(0, 0, false, config.styles.text);
    this.push(str.format(phrase, flags, ...args).break());
  }

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
   * The warning message.
   */
  readonly msg: WarnMessage = new WarnMessage();

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
  override get message(): string {
    return this.toString();
  }

  /**
   * Creates an error message formatted with an error phrase.
   * @param kind The error kind
   * @param flags The formatting flags
   * @param args The error arguments
   * @returns The newly created message
   */
  static create(kind: ErrorItem, flags?: FormattingFlags, ...args: Args): ErrorMessage {
    const err = new ErrorMessage();
    err.msg.add(kind, flags, ...args);
    return err;
  }

  /**
   * Creates an error message formatted with a custom phrase.
   * @param phrase The phrase
   * @param flags The formatting flags
   * @param args The phrase arguments
   * @returns The newly created message
   */
  static createCustom(phrase: string, flags?: FormattingFlags, ...args: Args): ErrorMessage {
    const err = new ErrorMessage();
    err.msg.addCustom(phrase, flags, ...args);
    return err;
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

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Splits a paragraph into words and style sequences, and appends them to ANSI string.
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
        result.break(); // break before list item if does not start the paragraph
      }
      result.word(item); // list item prefix
    }
  });
}

/**
 * Splits a list item into words and styles, and appends them to the ANSI string.
 * @param result The resulting string
 * @param item The list item to be split
 * @param format An optional callback to process placeholders
 */
function splitItem(result: AnsiString, item: string, format?: FormatCallback) {
  const boundFormat = format?.bind(result);
  const words = item.split(regex.space);
  for (const word of words) {
    if (word) {
      const parts = word.split(regex.spec);
      let text = parts[0].replace(regex.sgr, '');
      result.add(text, parts[0]);
      for (let i = 1; i < parts.length; i += 2) {
        if (text) {
          result.merge = true;
        }
        boundFormat?.(parts[i]);
        text = parts[i + 1].replace(regex.sgr, '');
        result.close(text, parts[i + 1]);
      }
    }
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
