//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import type { ConnectiveWords } from './config.js';
import type { ErrorItem } from './enums.js';
import type { Alias, Args, Enumerate, UnknownRecord } from './utils.js';

import { config } from './config.js';
import { cs, tf, fg, bg, ul } from './enums.js';
import {
  getEntries,
  getValues,
  isArray,
  isString,
  max,
  min,
  omitSpaces,
  omitStyles,
  regex,
  selectAlternative,
  streamWidth,
} from './utils.js';

export {
  sequence as seq,
  sgrSequence as style,
  indexedColor as ext8,
  rgbColor as rgb,
  taggedTemplate as ansi,
};

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * A mapping of styling attribute to its cancelling attribute.
 */
const cancellingAttribute: Readonly<Partial<Record<StandardAttribute, StandardAttribute>>> = {
  [tf.alternative1]: tf.primaryFont,
  [tf.alternative2]: tf.primaryFont,
  [tf.alternative3]: tf.primaryFont,
  [tf.alternative4]: tf.primaryFont,
  [tf.alternative5]: tf.primaryFont,
  [tf.alternative6]: tf.primaryFont,
  [tf.alternative7]: tf.primaryFont,
  [tf.alternative8]: tf.primaryFont,
  [tf.alternative9]: tf.primaryFont,
  [tf.bold]: tf.notBoldOrFaint,
  [tf.faint]: tf.notBoldOrFaint,
  [tf.italic]: tf.notItalicOrFraktur,
  [tf.fraktur]: tf.notItalicOrFraktur,
  [tf.underlined]: tf.notUnderlined,
  [tf.doublyUnderlined]: tf.notUnderlined,
  [tf.slowlyBlinking]: tf.notBlinking,
  [tf.rapidlyBlinking]: tf.notBlinking,
  [tf.inverse]: tf.notInverse,
  [tf.invisible]: tf.notInvisible,
  [tf.crossedOut]: tf.notCrossedOut,
  [tf.proportionallySpaced]: tf.notProportionallySpaced,
  [tf.framed]: tf.notFramedOrEncircled,
  [tf.encircled]: tf.notFramedOrEncircled,
  [tf.overlined]: tf.notOverlined,
  [tf.ideogramUnderline]: tf.noIdeogram,
  [tf.ideogramDoubleUnderline]: tf.noIdeogram,
  [tf.ideogramOverline]: tf.noIdeogram,
  [tf.ideogramDoubleOverline]: tf.noIdeogram,
  [tf.ideogramStressMarking]: tf.noIdeogram,
  [tf.superscript]: tf.notSuperscriptOrSubscript,
  [tf.subscript]: tf.notSuperscriptOrSubscript,
  [fg.black]: fg.default,
  [fg.red]: fg.default,
  [fg.green]: fg.default,
  [fg.yellow]: fg.default,
  [fg.blue]: fg.default,
  [fg.magenta]: fg.default,
  [fg.cyan]: fg.default,
  [fg.white]: fg.default,
  [fg.extended]: fg.default,
  [fg.brightBlack]: fg.default,
  [fg.brightRed]: fg.default,
  [fg.brightGreen]: fg.default,
  [fg.brightYellow]: fg.default,
  [fg.brightBlue]: fg.default,
  [fg.brightMagenta]: fg.default,
  [fg.brightCyan]: fg.default,
  [fg.brightWhite]: fg.default,
  [bg.black]: bg.default,
  [bg.red]: bg.default,
  [bg.green]: bg.default,
  [bg.yellow]: bg.default,
  [bg.blue]: bg.default,
  [bg.magenta]: bg.default,
  [bg.cyan]: bg.default,
  [bg.white]: bg.default,
  [bg.extended]: bg.default,
  [bg.brightBlack]: bg.default,
  [bg.brightRed]: bg.default,
  [bg.brightGreen]: bg.default,
  [bg.brightYellow]: bg.default,
  [bg.brightBlue]: bg.default,
  [bg.brightMagenta]: bg.default,
  [bg.brightCyan]: bg.default,
  [bg.brightWhite]: bg.default,
  [ul.extended]: ul.default,
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
    result.other(str);
  },
  /**
   * The formatting function for inline styles.
   * @param sty The style value
   * @param result The resulting string
   */
  i(sty: Style, result: AnsiString) {
    result.closeSty(sty);
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
          result.word(key);
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
              ? '$cmd' in value
                ? 'i'
                : 'a'
              : typeMapping[typeof value];
    if (spec && value !== null) {
      this[spec](value, result, flags);
    } else {
      const { valueOpen, valueClose } = config.connectives;
      result
        .pushSty(config.styles.value)
        .open(valueOpen)
        .split('' + value)
        .close(valueClose)
        .popSty();
    }
  },
} as const satisfies FormattingFunctions;

/**
 * The empty style. Converts to an empty string.
 */
const noStyle: Style = sgrSequence();

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
 * A control sequence parameter.
 */
export type SequenceParameter = number | Array<number>;

/**
 * A control sequence.
 * @template T The type of the sequence command
 */
export type ControlSequence<T extends cs> = Array<SequenceParameter> & { $cmd: T };

/**
 * A select graphics rendition sequence.
 */
export type Style = ControlSequence<cs.sgr>;

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
export type StylingAttribute = StandardAttribute | ExtendedAttribute;

/**
 * A text alignment setting.
 */
export type TextAlignment = 'left' | 'right';

/**
 * A string that may contain inline styles.
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
  | 'i' // inline style
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
  Record<StandardAttribute, StandardAttribute | [StandardAttribute, ExtendedAttribute]>
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

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements concatenation of strings that can be printed on a terminal.
 */
export class AnsiString {
  /**
   * The list of strings without control sequences.
   */
  public readonly strings: Array<string> = [];

  /**
   * The list of strings with control sequences.
   */
  public readonly styled: Array<string> = [];

  /**
   * The stack of styles used during building.
   */
  private readonly styleStack: Array<Style> = [];

  /**
   * The opening style used during building.
   */
  private readonly curStyle: Style = sgrSequence();

  /**
   * The line-wise wrapping context. The accumulated style always includes an SGR clear.
   */
  private readonly context: WrappingContext = [0, { [tf.clear]: tf.clear }];

  /**
   * Whether the first string should be merged with the previous string.
   */
  private mergeLeft: boolean = false;

  /**
   * Whether the last string should be merged with the next string.
   */
  public merge: boolean = false;

  /**
   * The largest length among all strings.
   */
  public maxLength: number = 0;

  /**
   * The hooked string for line-wise wrapping.
   */
  public hook?: AnsiString;

  /**
   * @returns The number of internal strings
   */
  get count(): number {
    return this.strings.length;
  }

  /**
   * @returns The maximum line width without wrapping
   */
  get lineWidth(): number {
    let ans = 0;
    let acc = 0;
    for (const str of this.strings) {
      if (str) {
        acc += str.length + (acc ? 1 : 0);
        ans = max(ans, acc);
      } else {
        acc = 0;
      }
    }
    return ans;
  }

  /**
   * Creates a ANSI string.
   * @param indent The starting column for text wrapping
   * @param align Whether the string should be left- or right-aligned
   * @param width The wrapping width relative to the indentation level
   */
  constructor(
    public indent: number = 0,
    public align: TextAlignment = 'left',
    public width: number = NaN,
  ) {}

  /**
   * Appends another ANSI string.
   * @param other The other ANSI string
   * @returns The ANSI string instance
   */
  other(other: AnsiString): this {
    const { strings, styled, styleStack, curStyle, maxLength } = this;
    const [firstString, ...restStrings] = other.strings;
    const [firstStyled, ...restStyled] = other.styled;
    if (firstString) {
      this.add(firstString, firstStyled, other.mergeLeft);
    } else if (firstString !== undefined) {
      strings.push(firstString);
      styled.push(firstStyled); // line feed
      curStyle.length = 0; // reset opening style
    }
    strings.push(...restStrings);
    styled.push(...restStyled);
    styleStack.push(...other.styleStack);
    curStyle.push(...other.curStyle);
    this.maxLength = max(maxLength, other.maxLength);
    this.merge = other.merge;
    return this;
  }

  /**
   * Prepends a word to the string at a specific position.
   * This can only be done if the affected string does not contain leading styles.
   * @param word The word to prepend (should contain no styles)
   * @param pos The position of the previously added string
   * @returns The ANSI string instance
   */
  openAt(word: string, pos: number): this {
    const { strings, styled, count } = this;
    if (pos >= count) {
      return this.open(word);
    }
    if (pos >= 0) {
      strings[pos] = word + strings[pos];
      styled[pos] = word + styled[pos];
    }
    return this;
  }

  /**
   * Pushes a style to the style stack.
   * @param sty The style (does nothing if no style)
   * @returns The ANSI string instance
   */
  pushSty(sty: Style = noStyle): this {
    this.styleStack.push(sty);
    return this.openSty(sty);
  }

  /**
   * Pops a style from the style stack.
   * @returns The ANSI string instance
   */
  popSty(): this {
    const { styleStack } = this;
    const close = styleStack.pop();
    const open = styleStack.at(-1); // keep order of these calls
    const sty = mergeStyles(close, open);
    return this.closeSty(sty);
  }

  /**
   * Opens with a style.
   * @param sty The style
   * @returns The ANSI string instance
   */
  private openSty(sty: Style): this {
    this.curStyle.push(...sty); // append to opening style
    return this;
  }

  /**
   * Closes with a style.
   * @param sty The style
   * @returns The ANSI string instance
   */
  closeSty(sty: Style): this {
    const { styled, count } = this;
    if (count && styled[count - 1]) {
      styled[count - 1] += sty; // close with style
    } else {
      this.openSty(sty); // open with style if no strings or if the last string is a line feed
    }
    return this;
  }

  /**
   * Opens with a word.
   * @param word The word to insert (should contain no styles)
   * @returns The ANSI string instance
   */
  open(word: string): this {
    if (word) {
      this.add(word, word).merge = true;
    }
    return this;
  }

  /**
   * Closes with a word.
   * @param word The word to insert (should contain no styles)
   * @returns The ANSI string instance
   */
  close(word: string): this {
    // keep this check
    if (word) {
      this.add(word, word, true);
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
      const { strings, styled } = this;
      const breaks = Array(count).fill('');
      strings.push(...breaks); // the only case where the string can be empty
      styled.push(...breaks); // special case of styled string for line feeds
      this.merge = false;
    }
    return this;
  }

  /**
   * Appends a word.
   * @param word The word to insert (should contain no styles)
   * @param sty The style to be applied
   * @returns The ANSI string instance
   */
  word(word: string, sty?: Style): this {
    if (word) {
      if (sty) {
        this.pushSty(sty).add(word, word).popSty();
      } else {
        this.add(word, word);
      }
    }
    return this;
  }

  /**
   * Appends a text.
   * @param text The text with no control sequences
   * @param styledText The text with possible control sequences (should not be empty)
   * @param close True if the text should be merged with the previous string, if any
   * @returns The ANSI string instance
   */
  private add(text: string, styledText: string, close: boolean = false): this {
    if (!text) {
      const sty: Style = seqFromText(cs.sgr, styledText);
      return close ? this.closeSty(sty) : this.openSty(sty);
    }
    const { strings, styled, count, curStyle, merge, maxLength } = this;
    if (count && (merge || close) && strings[count - 1]) {
      text = strings[count - 1] += text; // to update maxLength
      styled[count - 1] += curStyle + styledText;
    } else {
      strings.push(text);
      styled.push(curStyle + styledText);
    }
    curStyle.length = 0; // reset opening style
    if (!maxLength) {
      this.mergeLeft = merge || close;
    }
    this.maxLength = max(maxLength, text.length);
    this.merge = false;
    return this;
  }

  /**
   * Splits a text into words and style sequences, and appends them.
   * @param text The text to be split
   * @param format An optional callback to process placeholders
   * @returns The ANSI string instance
   */
  split(text: string, format?: FormattingCallback): this {
    const paragraphs = text.split(regex.para);
    paragraphs.forEach((paragraph, i) => {
      splitParagraph(this, paragraph, format);
      if (i < paragraphs.length - 1) {
        this.break(2);
      }
    });
    return this;
  }

  /**
   * Wraps the internal strings to fit in a terminal width.
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
      return emitSpaces ? ' '.repeat(count) : '' + sequence(cs.cuf, count);
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
      if (context[2] == undefined) {
        context[2] = false;
        hook.context[0] = 0;
        hook.context[2] = undefined; // signal start of line-wise wrapping for child
      }
      return hook.wrap(result, column, NaN, emitStyles, emitSpaces, false);
    }
    /** @ignore */
    function feed() {
      column = 0;
      j = result.push('\n'); // save index for right-alignment
    }
    const { strings, styled, count, maxLength, align, hook, context } = this;
    if (hook) {
      if (isHead) {
        context[0] = 0;
        context[2] = undefined; // start of line-wise wrapping
      }
      terminalWidth = NaN; // ignore terminal width in this case
    } else if (!count) {
      context[2] = true; // signal end of line-wise wrapping for parent
      return currentColumn;
    }
    // sanitize input
    let column = max(0, currentColumn || 0);
    const indent = max(0, this.indent || 0);
    const width = min(indent + max(0, this.width || Infinity), max(0, terminalWidth || Infinity));
    let start = max(0, min(indent, width));
    let j = result.length; // save index for right-alignment
    if (width < start + maxLength) {
      if (hook) {
        throw Error(`Cannot wrap word of length ${maxLength}`); // developer mistake: see documentation
      }
      start = 0; // wrap to the first column instead
      if (column && strings[0]) {
        feed(); // forcefully break the first line
      }
    }
    const needToAlign = isFinite(width) && align === 'right';
    const pad = start ? move(start) : ''; // precomputed for efficiency
    for (let i = context[0]; i < count; i++) {
      const len = strings[i].length;
      if (!len) {
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
      if (hook && emitStyles && column <= start) {
        pad2 += recordToStyle(context[1]); // restore SGR attributes
      }
      column += len2 + len;
      result.push(pad2 + (emitStyles ? styled[i] : strings[i]));
      if (hook && emitStyles) {
        const styles = styled[i].match(regex.sgr); // extract SGR attributes
        if (styles) {
          applyStyle(seqFromText(cs.sgr, styles.join('')), context[1]);
        }
      }
    }
    alignRight();
    if (hook) {
      do {
        column = callHook(hook, count); // call once if not head
        context[2] = hook.context[2]; // signal end of line-wise wrapping for parent
        if (isHead && !context[2]) {
          feed(); // head is driving the wrapping, so child line feeds are ignored
        }
      } while (isHead && !context[2]);
    }
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
   * Appends a text that may contain inline styles.
   * @param text The text to be appended (may be a normal string or another ANSI string)
   * @param split Whether to split the text if it is a normal string (defaults to `true`)
   * @param close Whether the text should be merged with the previous string, if it is a normal
   * string and is not split (defaults to `false`)
   * @returns The ANSI string instance
   */
  append(text: StyledString, split: boolean = true, close: boolean = false): this {
    return !isString(text)
      ? this.other(text)
      : split
        ? this.split(text)
        : this.add(text.replace(regex.sgr, ''), text, close);
  }

  /**
   * @returns The string without line feeds or control sequences.
   */
  toString(): string {
    return this.strings.join(' ');
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
    return '' + this;
  }
}

/**
 * A warning message.
 */
export class WarnMessage extends AnsiMessage {
  /**
   * Appends a ANSI string formatted from an error item or custom phrase.
   * @param itemOrPhrase The error item or custom phrase
   * @param flags The formatting flags
   * @param args The error arguments
   * @returns The new length of the message
   */
  add(itemOrPhrase: ErrorItem | string, flags?: FormattingFlags, ...args: Args): number {
    const phrase = isString(itemOrPhrase) ? itemOrPhrase : config.errorPhrases[itemOrPhrase];
    const str = new AnsiString()
      .pushSty(config.styles.base)
      .format(phrase, flags, ...args)
      .popSty()
      .break(); // include trailing line feed
    return this.push(str);
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
export class ErrorMessage extends WarnMessage {
  /**
   * Creates an error message formatted from an error item or custom phrase.
   * @param itemOrPhrase The error item or custom phrase
   * @param flags The formatting flags
   * @param args The error arguments
   */
  constructor(itemOrPhrase: ErrorItem | string, flags?: FormattingFlags, ...args: Args) {
    super();
    this.add(itemOrPhrase, flags, ...args);
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
function splitItem(result: AnsiString, item: string, format?: FormattingCallback) {
  const boundFormat = format?.bind(result);
  const words = item.split(regex.space);
  for (const word of words) {
    if (word) {
      const parts = word.split(regex.spec);
      result.append(parts[0], false);
      for (let i = 1; i < parts.length; i += 2) {
        if (parts[i - 1]) {
          result.merge = true;
        }
        boundFormat?.(parts[i]);
        result.append(parts[i + 1], false, true);
      }
    }
  }
}

/**
 * Creates a control sequence.
 * Do not call `concat` on the result.
 * @template T The type of the sequence command
 * @param cmd The sequence command
 * @param params The sequence parameters
 * @returns The control sequence
 */
function sequence<T extends cs>(cmd: T, ...params: Array<SequenceParameter>): ControlSequence<T> {
  const seq = params as ControlSequence<T>;
  seq.toString = function () {
    return this.length ? `\x1b[${this.flat().join(';')}${this.$cmd}` : '';
  };
  seq.$cmd = cmd;
  return seq;
}

/**
 * Creates an SGR sequence.
 * Do not call `concat` on the result.
 * @param attrs The styling attributes
 * @returns The SGR sequence
 */
function sgrSequence(...attrs: Array<StylingAttribute>): Style {
  return sequence(cs.sgr, ...attrs);
}

/**
 * Checks if a sequence parameter is a standard styling attribute.
 * @param param The sequence parameter
 * @returns True if the parameter is a standard attribute
 */
function isStandard(param: SequenceParameter): param is StandardAttribute {
  return !isArray(param);
}

/**
 * Converts a style record to a style.
 * @param rec The style record
 * @returns The style
 */
function recordToStyle(rec: StyleRecord): Style {
  return sgrSequence(...getValues(rec).flat()); // keys are sorted in ascending order
}

/**
 * Merges opening and closing styles.
 * @param close The closing style (to cancel from current level)
 * @param open The opening style (to reapply from parent level)
 * @returns The merged style (i.e., with no redundant attributes)
 */
function mergeStyles(close?: Style, open: Style = noStyle): Style {
  if (!close?.length) {
    return noStyle; // skip if there is nothing to cancel
  }
  const result: StyleRecord = {};
  for (const attr of close) {
    // skip extended attributes
    if (isStandard(attr)) {
      const cancelAttr = cancellingAttribute[attr] ?? attr;
      if (cancelAttr) {
        result[cancelAttr] = cancelAttr; // cancel attribute (if not tf.clear)
      }
    }
  }
  applyStyle(open, result, true);
  return recordToStyle(result);
}

/**
 * Applies a style to a style record.
 * @param sty The style to apply
 * @param result The resulting style
 * @param onlyIfPresent Whether to apply a styling attribute only if it appears in the result
 */
function applyStyle(sty: Style, result: StyleRecord, onlyIfPresent: boolean = false) {
  let prev: StandardAttribute | undefined;
  for (const attr of sty) {
    if (attr === tf.clear) {
      // clear all preceding attributes
      Reflect.ownKeys(result).forEach((key) => Reflect.deleteProperty(result, key));
      result[attr] = attr; // set tf.clear
    } else if (isStandard(attr)) {
      const cancelAttr = cancellingAttribute[attr] ?? attr;
      if (!onlyIfPresent || cancelAttr in result) {
        result[cancelAttr] = attr;
        if ([fg.extended, bg.extended, ul.extended].includes(attr as number)) {
          prev = cancelAttr;
          continue; // extended introducer: must be followed by an extended attribute
        }
      }
    } else if (prev) {
      // handle extended attribute
      result[prev] = [result[prev] as StandardAttribute, attr as ExtendedAttribute];
    }
    prev = undefined; // for completeness, and may also work around developer mistakes
  }
}

/**
 * Creates a control sequence from a string.
 * Assumes that there is no text between sequences.
 * Any text before the first sequence is discarded.
 * Assumes that the sequence specifier has unitary length.
 * Empty parameters are converted to zero.
 * @template T The type of the sequence command
 * @param cmd The sequence command
 * @param text The string (must be a sequence of control sequences)
 * @returns The control sequence
 */
function seqFromText<T extends cs>(cmd: T, text: string): ControlSequence<T> {
  const splitParams = (str: string) => str.slice(0, -1).split(';');
  const params = text.split('\x1b[').slice(1).flatMap(splitParams).map(Number);
  return sequence(cmd, ...params);
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
 * @param parts The template string parts
 * @param args The template arguments
 * @returns The ANSI string
 */
function taggedTemplate(parts: TemplateStringsArray, ...args: Args): AnsiString {
  const phrase = parts.map((str, i) => (i < parts.length - 1 ? str + '#' + i : str)).join('');
  return new AnsiString().format(phrase, {}, ...args);
}
