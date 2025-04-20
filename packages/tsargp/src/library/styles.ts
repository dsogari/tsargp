//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import type { ConnectiveWords } from './config.js';
import type { ErrorItem } from './enums.js';
import type { Alias, Args, Enumerate, UnknownRecord } from './utils.js';

import { config } from './config.js';
import { bg, cs, fg, rs, tf, ul } from './enums.js';
import {
  getEntries,
  getKeys,
  getSymbol,
  getValues,
  isArray,
  isNumber,
  isString,
  max,
  min,
  omitSpaces,
  omitStyles,
  regex,
  selectAlternative,
  streamWidth,
} from './utils.js';

export { taggedTemplate as ansi, indexedColor as ext8, rgbColor as rgb };

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * A mapping of styling attribute to its cancelling attribute.
 */
const cancellingAttribute: Readonly<Partial<Record<StandardAttribute, rs>>> = {
  [tf.alternative1]: rs.primaryFont,
  [tf.alternative2]: rs.primaryFont,
  [tf.alternative3]: rs.primaryFont,
  [tf.alternative4]: rs.primaryFont,
  [tf.alternative5]: rs.primaryFont,
  [tf.alternative6]: rs.primaryFont,
  [tf.alternative7]: rs.primaryFont,
  [tf.alternative8]: rs.primaryFont,
  [tf.alternative9]: rs.primaryFont,
  [tf.bold]: rs.notBoldOrFaint,
  [tf.faint]: rs.notBoldOrFaint,
  [tf.italic]: rs.notItalicOrFraktur,
  [tf.fraktur]: rs.notItalicOrFraktur,
  [tf.underlined]: rs.notUnderlined,
  [tf.doublyUnderlined]: rs.notUnderlined,
  [tf.slowlyBlinking]: rs.notBlinking,
  [tf.rapidlyBlinking]: rs.notBlinking,
  [tf.inverse]: rs.notInverse,
  [tf.invisible]: rs.notInvisible,
  [tf.crossedOut]: rs.notCrossedOut,
  [tf.proportionallySpaced]: rs.notProportionallySpaced,
  [tf.framed]: rs.notFramedOrEncircled,
  [tf.encircled]: rs.notFramedOrEncircled,
  [tf.overlined]: rs.notOverlined,
  [tf.ideogramUnderline]: rs.noIdeogram,
  [tf.ideogramDoubleUnderline]: rs.noIdeogram,
  [tf.ideogramOverline]: rs.noIdeogram,
  [tf.ideogramDoubleOverline]: rs.noIdeogram,
  [tf.ideogramStressMarking]: rs.noIdeogram,
  [tf.superscript]: rs.notSuperscriptOrSubscript,
  [tf.subscript]: rs.notSuperscriptOrSubscript,
  [fg.black]: rs.defaultForeground,
  [fg.red]: rs.defaultForeground,
  [fg.green]: rs.defaultForeground,
  [fg.yellow]: rs.defaultForeground,
  [fg.blue]: rs.defaultForeground,
  [fg.magenta]: rs.defaultForeground,
  [fg.cyan]: rs.defaultForeground,
  [fg.white]: rs.defaultForeground,
  [fg.extended]: rs.defaultForeground,
  [fg.brightBlack]: rs.defaultForeground,
  [fg.brightRed]: rs.defaultForeground,
  [fg.brightGreen]: rs.defaultForeground,
  [fg.brightYellow]: rs.defaultForeground,
  [fg.brightBlue]: rs.defaultForeground,
  [fg.brightMagenta]: rs.defaultForeground,
  [fg.brightCyan]: rs.defaultForeground,
  [fg.brightWhite]: rs.defaultForeground,
  [bg.black]: rs.defaultBackground,
  [bg.red]: rs.defaultBackground,
  [bg.green]: rs.defaultBackground,
  [bg.yellow]: rs.defaultBackground,
  [bg.blue]: rs.defaultBackground,
  [bg.magenta]: rs.defaultBackground,
  [bg.cyan]: rs.defaultBackground,
  [bg.white]: rs.defaultBackground,
  [bg.extended]: rs.defaultBackground,
  [bg.brightBlack]: rs.defaultBackground,
  [bg.brightRed]: rs.defaultBackground,
  [bg.brightGreen]: rs.defaultBackground,
  [bg.brightYellow]: rs.defaultBackground,
  [bg.brightBlue]: rs.defaultBackground,
  [bg.brightMagenta]: rs.defaultBackground,
  [bg.brightCyan]: rs.defaultBackground,
  [bg.brightWhite]: rs.defaultBackground,
  [ul.extended]: rs.defaultUnderline,
};

/**
 * A map of data type to format specifier.
 */
const typeMapping: Readonly<Record<string, FormatSpecifier>> = {
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
const formatFunctions = {
  /**
   * The formatting function for boolean values.
   * @param value The boolean value
   * @param result The resulting string
   */
  b(value: boolean, result: AnsiString) {
    result.word('' + value, config.styles.boolean);
  },
  /**
   * The formatting function for string values.
   * @param value The string value
   * @param result The resulting string
   */
  s(value: string, result: AnsiString) {
    const quote = config.connectives.stringQuote;
    result.word(quote + value + quote, config.styles.string);
  },
  /**
   * The formatting function for number values.
   * @param value The number value
   * @param result The resulting string
   */
  n(value: number, result: AnsiString) {
    result.word('' + value, config.styles.number);
  },
  /**
   * The formatting function for regular expressions.
   * @param value The regular expression
   * @param result The resulting string
   */
  r(value: RegExp, result: AnsiString) {
    result.word('' + value, config.styles.regex);
  },
  /**
   * The formatting function for symbols.
   * @param value The symbol value
   * @param result The resulting string
   */
  m(value: symbol, result: AnsiString) {
    result.word(Symbol.keyFor(value) ?? '', config.styles.symbol);
  },
  /**
   * The formatting function for URLs.
   * @param url The URL object
   * @param result The resulting string
   */
  u(url: URL, result: AnsiString) {
    result.word(url.href, config.styles.url);
  },
  /**
   * The formatting function for ANSI strings.
   * @param str The ANSI string
   * @param result The resulting string
   */
  t(str: AnsiString, result: AnsiString) {
    result.append(str);
  },
  /**
   * The formatting function for custom format callbacks.
   * For internal use only.
   * @param arg The format argument
   * @param result The resulting string
   * @param flags The formatting flags
   */
  c(arg: unknown, result: AnsiString, flags: FormattingFlags) {
    flags.custom?.bind(result)(arg);
  },
  /**
   * The formatting function for array values.
   * A custom format callback may be used for array elements.
   * @param value The array value
   * @param result The resulting string
   * @param flags The formatting flags
   * @param phrase The phrase to be applied to each array element
   */
  a(value: ReadonlyArray<unknown>, result: AnsiString, flags: FormattingFlags, phrase?: string) {
    const { connectives } = config;
    const { arraySep, arrayOpen, arrayClose } = connectives;
    const sep = flags.sep ?? arraySep;
    const open = flags.open ?? arrayOpen;
    const close = flags.close ?? arrayClose;
    result.open(open);
    value.forEach((val, i) => {
      if (phrase !== undefined) {
        result.format(phrase, flags, val);
      } else {
        const spec = flags.custom ? 'c' : 'v';
        this[spec](val, result, flags);
      }
      if (sep && i < value.length - 1) {
        result.mergeLast = flags.mergePrev ?? true;
        result.append(sep);
        result.mergeLast = flags.mergeNext ?? false;
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
  o(value: object, result: AnsiString, flags: FormattingFlags) {
    if ('$phrase' in value && '$elements' in value) {
      this.a(value.$elements, result, flags, value.$phrase as string);
      return; // special case of array with phrase
    }
    const { connectives } = config;
    const { objectSep, objectOpen, objectClose, valueSep } = connectives;
    const arrayFlags: FormattingFlags = {
      ...flags,
      sep: flags.sep ?? objectSep,
      open: flags.open ?? objectOpen,
      close: flags.close ?? objectClose,
      custom: (entry) => {
        const [key, val] = entry as [string, unknown];
        if (regex.id.test(key)) {
          this.m(getSymbol(key), result, flags);
        } else {
          this.s(key, result, flags);
        }
        result.close(valueSep);
        this.v(val, result, flags);
      },
    };
    const entries = getEntries(value as UnknownRecord);
    this.a(entries, result, arrayFlags);
  },
  /**
   * The formatting function for unknown values.
   * @param value The unknown value
   * @param result The resulting string
   * @param flags The formatting flags
   */
  v(value: unknown, result: AnsiString, flags: FormattingFlags) {
    const spec: FormatSpecifier =
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
      const { valueOpen, valueClose } = config.connectives;
      const str = new AnsiString(config.styles.value)
        .open(valueOpen)
        .split('' + value)
        .close(valueClose);
      result.append(str);
    }
  },
} as const satisfies FormattingFunctions;

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A callback that processes a placeholder when splitting text.
 * @param this The ANSI string to append to
 * @param arg The placeholder or argument
 */
export type FormattingCallback<T = string> = (this: AnsiString, arg: T) => void;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly custom?: FormattingCallback<any>;
};

/**
 * A select graphics rendition sequence.
 */
export type Style = Array<StylingAttribute>;

/**
 * An 8-bit decimal number.
 */
export type DecimalValue = Alias<Enumerate<256>>;

/**
 * An 8-bit indexed color.
 */
export type IndexedColor = [5, DecimalValue];

/**
 * A 24-bit RGB color.
 */
export type RgbColor = [2, DecimalValue, DecimalValue, DecimalValue];

/**
 * A standard styling attribute.
 */
export type StandardAttribute = tf | fg | bg | ul;

/**
 * An extended styling attribute.
 */
export type ExtendedAttribute = IndexedColor | RgbColor;

/**
 * A text styling attribute.
 */
export type StylingAttribute = rs | StandardAttribute | ExtendedAttribute;

/**
 * A text alignment setting.
 */
export type TextAlignment = 'left' | 'right';

/**
 * A string that may contain styles.
 */
export type StyledString = string | AnsiString;

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * A format specifier.
 */
type FormatSpecifier =
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
 * @param phrase The phrase to be applied to each array element
 */
type FormattingFunction = (
  value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  result: AnsiString,
  flags: FormattingFlags,
  phrase?: string,
) => void;

/**
 * A set of formatting functions.
 */
type FormattingFunctions = Readonly<Record<FormatSpecifier, FormattingFunction>>;

/**
 * A record that keeps track of styling attributes by their cancelling attribute.
 */
type StyleRecord = Partial<
  Record<rs, [StandardAttribute] | [StandardAttribute, ExtendedAttribute]>
>;

/**
 * The context for line-wise wrapping.
 */
type WrappingContext = [
  /**
   * The index of the current string in the wrapping procedure.
   */
  index: number,
  /**
   * The accumulated style to restore at the start of a line.
   */
  style: StyleRecord,
  /**
   * Whether the wrapping is finished.
   */
  done?: boolean,
];

/**
 * The aggregate lengths of words or lines in a ANSI string.
 */
type AggregateLength = [
  /**
   * The length of the first word or line.
   */
  first: number,
  /**
   * The length of the last word or line.
   */
  last: number,
  /**
   * The length of the longest word or line.
   */
  max: number,
];

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements concatenation of strings that can be printed on a terminal.
 */
export class AnsiString {
  /**
   * The list of words (including line feeds).
   */
  public readonly words: Array<Array<string | Style>> = [];

  /**
   * The line-wise wrapping context. The accumulated style always includes an SGR clear.
   */
  private readonly context: WrappingContext = [0, {}];

  /**
   * The base style for the string.
   */
  private readonly baseStyle: StyleRecord = {};

  /**
   * The aggregate length of words.
   */
  private readonly wordLength: AggregateLength = [0, 0, 0];

  /**
   * The aggregate length of lines.
   */
  private readonly lineLength: AggregateLength = [0, 0, 0];

  /**
   * Whether the first word should be merged with the previous word.
   */
  public mergeFirst: boolean = false;

  /**
   * Whether the last word should be merged with the next word.
   */
  public mergeLast: boolean = false;

  /**
   * The number of lines in the string. Always positive.
   */
  public lineCount: number = 1;

  /**
   * The hooked string for line-wise wrapping.
   */
  public hook?: AnsiString;

  /**
   * @returns The number of words in the string (including line feeds)
   */
  get wordCount(): number {
    return this.words.length;
  }

  /**
   * @returns The length of the longest word in the string
   */
  get wordWidth(): number {
    return this.wordLength[2];
  }

  /**
   * @returns The length of the longest line in the string
   */
  get lineWidth(): number {
    return this.lineLength[2];
  }

  /**
   * Creates a ANSI string.
   * @param sty The base style
   * @param indent The starting column for text wrapping
   * @param align Whether the string should be left- or right-aligned
   * @param width The wrapping width relative to the indentation level
   */
  constructor(
    sty: Style = [],
    public indent: number = 0,
    public align: TextAlignment = 'left',
    public width: number = NaN,
  ) {
    saveStyle(sty, this.baseStyle);
  }

  /**
   * Prepends text to the word at a specific position.
   * @param text The text to prepend (should contain no styles)
   * @param pos The position of the previously added word
   * @returns The ANSI string instance
   */
  openAt(text: string, pos: number): this {
    const { words, wordCount } = this;
    if (pos >= wordCount) {
      return this.open(text);
    }
    if (pos >= 0) {
      words[pos].unshift(text);
    }
    return this;
  }

  /**
   * Opens with text.
   * @param text The text to insert (should contain no styles)
   * @returns The ANSI string instance
   */
  open(text: string): this {
    if (text) {
      this.add(text).mergeLast = true;
    }
    return this;
  }

  /**
   * Closes with text.
   * @param text The text to insert (should contain no styles)
   * @returns The ANSI string instance
   */
  close(text: string): this {
    if (text) {
      this.mergeLast = true;
      this.add(text);
    }
    return this;
  }

  /**
   * Appends line breaks.
   * @param count The number of line breaks to insert (non-positive values are ignored)
   * @returns The ANSI string instance
   */
  break(count = 1): this {
    if (count > 0) {
      this.words.push(...Array(count).fill([])); // the only case where the word can be empty
      this.wordLength[1] = 0;
      this.lineLength[1] = 0;
      this.lineCount += count;
      this.mergeLast = false;
    }
    return this;
  }

  /**
   * Appends text with a style.
   * @param text The text to insert
   * @param sty The style to be applied
   * @returns The ANSI string instance
   */
  word(text: string, sty: Style): this {
    return this.add(new AnsiString(sty).append(text));
  }

  /**
   * Appends text.
   * @param text The text to append
   * @returns The ANSI string instance
   */
  private add(text: StyledString): this {
    const isStr = isString(text);
    if (isStr ? text.length : text.wordCount) {
      const { words, mergeLast, wordLength, lineLength, lineCount, baseStyle } = this;
      let wordsToAdd;
      if (isStr) {
        wordsToAdd = [[text]];
      } else {
        wordsToAdd = text.words.map((word) => word.map((part) => part.slice())); // make copy
        const sty = restoreStyle(text.baseStyle);
        if (sty.length) {
          wordsToAdd.at(0)?.unshift(sty);
          wordsToAdd.at(-1)?.push(cancelStyle(text.baseStyle));
        }
        wordsToAdd.forEach((word) =>
          word.filter(isArray<Style>).forEach((sty) => applyStyle(baseStyle, sty)),
        );
      }
      const lastWord = words.at(-1);
      const length = isStr ? text.length : 0;
      const lengths = [length, length, length];
      const [a, b, c] = isStr ? lengths : text.wordLength;
      const [d, e, f] = isStr ? lengths : text.lineLength;
      const close = (mergeLast && !!d) || (!isStr && text.mergeFirst);
      if (close && lastWord?.length) {
        lastWord.push(...wordsToAdd.shift()!);
        wordLength[1] += a;
        lineLength[1] += d;
      } else {
        wordLength[1] = a;
        lineLength[1] += d + (lineLength[1] && d ? 1 : 0);
      }
      words.push(...wordsToAdd);
      if (words.length === 1) {
        wordLength[0] = wordLength[1];
      }
      if (lineCount === 1) {
        lineLength[0] = lineLength[1];
      }
      if (!lastWord) {
        this.mergeFirst = close;
      }
      wordLength[2] = max(wordLength[2], wordLength[1], c);
      lineLength[2] = max(lineLength[2], lineLength[1], f);
      if (!isStr) {
        if (text.wordCount > 1) {
          wordLength[1] = b;
        }
        if (text.lineCount > 1) {
          lineLength[1] = e;
          this.lineCount += text.lineCount - 1;
        }
      }
      this.mergeLast = !isStr && text.mergeLast;
    }
    return this;
  }

  /**
   * Splits a phrase into words and appends them.
   * @param phrase The phrase text
   * @param format An optional callback to process placeholders
   * @returns The ANSI string instance
   */
  split(phrase: string, format?: FormattingCallback): this {
    const paragraphs = phrase.split(regex.para);
    paragraphs.forEach((paragraph, i) => {
      splitParagraph(this, paragraph, format);
      if (i < paragraphs.length - 1) {
        this.break(2);
      }
    });
    return this;
  }

  /**
   * Wraps the words to fit in a terminal width.
   * @param result The resulting list
   * @param currentColumn The current terminal column
   * @param terminalWidth The desired terminal width (or zero or `NaN` to avoid wrapping)
   * @param emitStyles Whether styles should be emitted
   * @param emitSpaces Whether spaces should be emitted instead of move sequences
   * @param isHead Whether this string is the head of a chain for line-wise wrapping
   * @returns The updated terminal column
   */
  wrap(
    result: Array<string>,
    currentColumn: number = 0,
    terminalWidth: number = NaN,
    emitStyles: boolean = false,
    emitSpaces: boolean = true,
    isHead: boolean = true,
  ): number {
    /** @ignore */
    function move(count: number): string {
      return emitSpaces ? ' '.repeat(count) : seqToString(cs.cuf, count);
    }
    /** @ignore */
    function alignRight() {
      if (needToAlign && j < result.length && column < width) {
        result.splice(j, 0, move(width - column)); // insert padding at the beginning of the line
        column = width;
      }
    }
    /** @ignore */
    function callHook(hook: AnsiString, index: number): number {
      context[0] = index; // save index for next line
      return hook.wrap(result, column, NaN, emitStyles, emitSpaces, false);
    }
    /** @ignore */
    function feed() {
      column = 0;
      j = result.push('\n'); // save index for right-alignment
    }
    const { words, wordCount, wordWidth, align, hook, context, baseStyle } = this;
    if (hook) {
      if (isHead) {
        context[2] = undefined; // start of line-wise wrapping
      }
      if (context[2] === undefined) {
        context[0] = 0;
        context[2] = false;
        hook.context[2] = undefined; // signal start of line-wise wrapping for child
      }
      terminalWidth = NaN; // ignore terminal width in this case
    } else if (!wordCount) {
      context[2] = true; // signal end of line-wise wrapping for parent
      return currentColumn;
    }
    // sanitize input
    let column = max(0, currentColumn || 0);
    const indent = max(0, this.indent || 0);
    const width = min(indent + max(0, this.width || Infinity), max(0, terminalWidth || Infinity));
    let start = max(0, min(indent, width));
    let j = result.length; // save index for right-alignment
    if (width < start + wordWidth) {
      if (hook) {
        // developer mistake: see documentation
        throw Error(`Cannot wrap word of length ${wordWidth}`);
      }
      start = 0; // wrap to the first column instead
      if (column && words[0].length) {
        feed(); // forcefully break the first line
      }
    }
    const needToAlign = isFinite(width) && align === 'right';
    const pad = start ? move(start) : ''; // precomputed for efficiency
    if (emitStyles && !context[0]) {
      context[1] = { ...baseStyle };
    }
    for (let i = context[0], applied = false; i < wordCount; i++) {
      const word = words[i];
      if (!word.length) {
        alignRight();
        if (hook) {
          const col = callHook(hook, i + 1); // resume from the next string
          if (!isHead) {
            return col; // return from child
          }
        }
        feed(); // keep line feeds separate from the rest
        continue;
      }
      let str = word.filter(isString).join('');
      const len = str.length;
      let len2 = start; // start at indentation level, unless we are in the middle of the line
      let pad2 = pad;
      if (column) {
        if (column < start) {
          len2 = start - column;
          pad2 = move(len2); // pad until start (only executed once, i.e., for the first line)
        } else if (column + len < width) {
          len2 = 1;
          pad2 = ' '; // single space separating words
        } else {
          alignRight();
          if (hook) {
            const col = callHook(hook, i); // resume from the same string
            if (!isHead) {
              return col; // return from child
            }
          }
          feed(); // keep line feeds separate from the rest
        }
      }
      if (emitStyles) {
        if ((column <= start && hook) || !applied) {
          const sty = restoreStyle(context[1]);
          if (hook) {
            sty.unshift(rs.clear); // clear SGR attributes
          }
          pad2 += seqToString(cs.sgr, ...sty); // restore SGR attributes
          applied = true;
        }
        str = word
          .map((part) =>
            isString(part) ? part : (saveStyle(part, context[1]), seqToString(cs.sgr, ...part)),
          ) // save SGR attributes
          .join('');
      }
      column += len2 + len;
      result.push(pad2 + str);
    }
    if (emitStyles && wordWidth) {
      const sty = cancelStyle(context[1]);
      if (sty.length) {
        result.push(seqToString(cs.sgr, ...sty)); // cancel remaining style
      }
    }
    alignRight();
    if (hook) {
      do {
        column = callHook(hook, wordCount); // call once if not head
        context[2] = hook.context[2]; // signal end of line-wise wrapping for parent
        if (isHead && !context[2]) {
          feed(); // head is driving the wrapping, so child line feeds are ignored
        }
      } while (isHead && !context[2]);
    }
    return column;
  }

  /**
   * Formats a phrase with a set of arguments.
   * @param phrase The phrase text
   * @param flags The formatting flags
   * @param args The phrase arguments
   * @returns The ANSI string instance
   */
  format(phrase: string, flags: FormattingFlags = {}, ...args: Args): this {
    const formatFn: FormattingCallback | undefined =
      args &&
      function (spec) {
        const index = Number(spec.slice(1));
        if (index >= 0 && index < args.length) {
          this.value(args[index], flags);
        }
      };
    const alternative = flags.alt !== undefined ? selectAlternative(phrase, flags.alt) : phrase;
    return this.split(alternative, formatFn);
  }

  /**
   * Appends a value.
   * @param value The value to be formatted
   * @param flags The formatting flags
   * @returns The ANSI string instance
   */
  value(value: unknown, flags: FormattingFlags = {}): this {
    formatFunctions.v(value, this, flags);
    return this;
  }

  /**
   * Appends text that may contain styles.
   * @param text The text to be appended (may be a plain string or another ANSI string)
   * @param split Whether to split the text if it is a plain string (defaults to `false`)
   * @returns The ANSI string instance
   */
  append(text: StyledString, split: boolean = false): this {
    return !isString(text)
      ? this.add(text)
      : split
        ? this.split(text)
        : this.add(text.replace(regex.sgr, '')); // remove inline styles
  }

  /**
   * @returns The string without line feeds or control sequences.
   */
  toString(): string {
    return this.words.map((word) => word.filter(isString).join('')).join(' ');
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
   * Appends a ANSI string formatted from a phrase, with a trailing line feed.
   * @param phrase The phrase text
   * @param flags The formatting flags
   * @param sty The style, if any
   * @param args The phrase arguments
   * @returns The ANSI message instance
   */
  add(phrase: string, flags?: FormattingFlags, sty?: Style, ...args: Args): this {
    this.push(new AnsiString(sty).format(phrase, flags, ...args).break());
    return this;
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
    return '' + this;
  }
}

/**
 * An error message.
 */
export class ErrorMessage extends AnsiMessage {
  /**
   * Appends a ANSI string formatted from an error item or custom phrase, with a trailing line feed.
   * @param itemOrPhrase The error item or phrase
   * @param flags The formatting flags
   * @param args The error arguments
   * @returns The error message instance
   */
  add(itemOrPhrase: ErrorItem | string, flags?: FormattingFlags, ...args: Args): this {
    const { base, error } = config.styles;
    const phrase = isString(itemOrPhrase) ? itemOrPhrase : config.errorPhrases[itemOrPhrase];
    return super.add(phrase, flags, base.concat(error), ...args);
  }

  /**
   * @returns The wrapped message
   */
  override toString(): string {
    return this.wrap(streamWidth('stderr'));
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
    return '' + this;
  }
}

/**
 * A JSON message.
 */
export class JsonMessage extends Array<object> {
  /**
   * @returns The wrapped message
   */
  override toString(): string {
    return JSON.stringify(this);
  }

  /**
   * @returns The wrapped message
   */
  get message(): string {
    return '' + this;
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
function splitParagraph(result: AnsiString, para: string, format?: FormattingCallback) {
  const count = result.wordCount;
  para.split(regex.item).forEach((item, i) => {
    if (i % 2 === 0) {
      splitItem(result, item, format);
    } else {
      if (result.wordCount > count) {
        result.break(); // break before list item if does not start the paragraph
      }
      result.append(item); // list item prefix
    }
  });
}

/**
 * Splits a list item into words and styles, and appends them to the ANSI string.
 * @param result The resulting string
 * @param item The list item to be split
 * @param format An optional callback to process placeholders
 */
function splitItem(result: AnsiString, item: string, format?: FormattingCallback) {
  const boundFormat = format?.bind(result);
  const words = item.split(regex.space);
  for (const word of words) {
    if (word) {
      const parts = word.split(regex.spec);
      result.append(parts[0]);
      for (let i = 1; i < parts.length; i += 2) {
        result.mergeLast ||= !!parts[i - 1];
        boundFormat?.(parts[i]);
        result.mergeLast ||= !!parts[i + 1];
        result.append(parts[i + 1]);
      }
    }
  }
}

/**
 * Converts a control sequence to string.
 * @param spec The sequence specifier
 * @param params The sequence parameters
 * @returns The resulting string
 */
function seqToString(spec: cs, ...params: ReadonlyArray<number | ReadonlyArray<number>>): string {
  return params.length ? `\x1b[${params.flat().join(';')}${spec}` : '';
}

/**
 * Cancels a style from a style record.
 * @param rec The style record
 * @returns The cancelling style
 */
function cancelStyle(rec: StyleRecord): Style {
  return getKeys(rec).map(Number); // keys are sorted in ascending order
}

/**
 * Restores a style from a style record.
 * @param rec The style record
 * @returns The restored style
 */
function restoreStyle(rec: StyleRecord): Style {
  return getValues(rec).flat(); // keys are sorted in ascending order
}

/**
 * Applies a style from a style record.
 * @param from The style to be applied
 * @param result The resulting style
 */
function applyStyle(from: StyleRecord, result: Style) {
  for (let i = 0; i < result.length; i++) {
    const attr = result[i];
    if (isNumber(attr)) {
      const cancel = cancellingAttribute[attr as StandardAttribute];
      if (!cancel) {
        const fromAttr = from[attr as rs];
        if (fromAttr) {
          result.splice(i, 1, ...fromAttr);
        }
      }
    }
  }
}

/**
 * Saves a style into a style record.
 * @param from The style to be saved
 * @param result The resulting style
 */
function saveStyle(from: Style, result: StyleRecord) {
  let prev: rs | undefined;
  for (const attr of from) {
    if (isNumber(attr)) {
      const cancel = cancellingAttribute[attr as StandardAttribute];
      if (cancel) {
        result[cancel] = [attr as StandardAttribute];
        if ([fg.extended, bg.extended, ul.extended].includes(attr as number)) {
          prev = cancel;
          continue; // extended introducer: must be followed by an extended attribute
        }
      } else {
        delete result[attr as rs]; // attr is a cancelling attribute
      }
    } else if (prev) {
      // handle extended attribute
      result[prev]![1] = attr as ExtendedAttribute;
    }
    prev = undefined; // for completeness, and may also work around developer mistakes
  }
}

/**
 * Creates an 8-bit indexed color.
 * @param index The color index
 * @returns The color attribute
 */
function indexedColor(index: DecimalValue): IndexedColor {
  return [5, index];
}

/**
 * Creates a 24-bit RGB color.
 * @param r The red component
 * @param g The green component
 * @param b The blue component
 * @returns The color attribute
 */
function rgbColor(r: DecimalValue, g: DecimalValue, b: DecimalValue): RgbColor {
  return [2, r, g, b];
}

/**
 * Creates a ANSI string from a template literal.
 * @param this The style, if any
 * @param parts The template string parts
 * @param args The template arguments
 * @returns The ANSI string
 */
function taggedTemplate(
  this: void | Style,
  parts: TemplateStringsArray,
  ...args: Args
): AnsiString {
  const phrase = parts.map((str, i) => (i < parts.length - 1 ? str + '#' + i : str)).join('');
  return new AnsiString(this ?? []).format(phrase, {}, ...args);
}

/**
 * Creates a tagged template function with a style.
 * @param attrs The styling attributes
 * @returns The tag function
 */
taggedTemplate.style = (...attrs: Style) => taggedTemplate.bind(attrs);
