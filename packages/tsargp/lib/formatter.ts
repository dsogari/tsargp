//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { OpaqueOption, OpaqueOptions, Requires, RequiresEntry, RequiresVal } from './options';
import type { Style, FormatStyles, ConnectiveWords, HelpMessage } from './styles';
import type { Concrete } from './utils';
import type { OptionValidator } from './validator';

import { tf, HelpItem, ConnectiveWord } from './enums';
import {
  RequiresAll,
  RequiresNot,
  RequiresOne,
  isOpt,
  getParamCount,
  getOptionNames,
  fieldNames,
} from './options';
import { AnsiMessage, JsonMessage, TextMessage, TerminalString, style, format } from './styles';
import { max, combineRegExp, regexps } from './utils';

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * A text alignment setting.
 */
export type Alignment = 'left' | 'right';

/**
 * Defines attributes common to all help columns.
 * @template A The type of text alignment
 */
export type WithColumn<A = Alignment> = {
  /**
   * The text alignment for this column. (Defaults to 'left')
   */
  readonly align?: A;
  /**
   * The indentation level for this column. (Defaults to 2)
   */
  readonly indent?: number;
  /**
   * The number of line breaks to insert before each entry in this column. (Defaults to 0)
   */
  readonly breaks?: number;
  /**
   * Whether the column should be hidden. (Defaults to false)
   */
  readonly hidden?: boolean;
};

/**
 * Defines attributes for columns that may be preceded by other columns.
 */
export type WithAbsolute = {
  /**
   * Whether the indentation level should be relative to the beginning of the line instead of the
   * end of the previous column. (Defaults to false)
   */
  readonly absolute?: boolean;
};

/**
 * The formatter configuration.
 */
export type FormatterConfig = {
  /**
   * The settings for the names column.
   */
  readonly names?: WithColumn<Alignment | 'slot'>;
  /**
   * The settings for the parameter column.
   */
  readonly param?: WithColumn & WithAbsolute;
  /**
   * The settings for the description column.
   */
  readonly descr?: WithColumn & WithAbsolute;
  /**
   * The order of items to be shown in the option description.
   * @see HelpItem
   */
  readonly items?: ReadonlyArray<HelpItem>;
  /**
   * The phrases to be used for each kind of description item.
   *
   * If an item has a value, the `%s` specifier can be used to indicate where in the phrase to place
   * the value. If an item has multiple alternatives, such as {@link HelpItem.case}, different texts
   * can separated with `|` and grouped in parentheses, like this:
   * `'Values will be converted to (lowercase|uppercase)'`.
   */
  readonly phrases?: Readonly<Partial<Record<HelpItem, string>>>;
  /**
   * A list of patterns to filter options.
   */
  filter?: ReadonlyArray<string>;
};

/**
 * Defines attributes common to all help sections.
 */
export type WithKind<T extends string> = {
  /**
   * The kind of section.
   */
  readonly type: T;
};

/**
 * Defines attributes for a help section with wrapping.
 */
export type WithTitle = {
  /**
   * The section heading or default group heading. May contain inline styles.
   */
  readonly title?: string;
  /**
   * The style of the section heading or option group headings. (Defaults to tf.bold)
   */
  readonly style?: Style;
  /**
   * The number of line breaks to insert before the section.
   * (Defaults to 0 for the first section, else 2)
   */
  readonly breaks?: number;
  /**
   * True to disable wrapping of the provided text or headings.
   */
  readonly noWrap?: true;
};

/**
 * Defines attributes for a help section with text content.
 */
export type WithText = {
  /**
   * The section content. May contain inline styles.
   */
  readonly text?: string;
};

/**
 * Defines attributes for a help section with indentation.
 */
export type WithIndent = {
  /**
   * The indentation level of the section content. (Defaults to 0)
   */
  readonly indent?: number;
};

/**
 * Defines attributes for a help section with filter.
 */
export type WithFilter = {
  /**
   * A list of options keys or group names to include or exclude.
   */
  readonly filter?: ReadonlyArray<string>;
  /**
   * True if the filter should exclude.
   */
  readonly exclude?: true;
};

/**
 * Defines additional attributes for the usage section.
 */
export type WithRequired = {
  /**
   * A list of options that should be considered required in the usage.
   */
  readonly required?: ReadonlyArray<string>;
  /**
   * A commentary to append to the usage.
   */
  readonly comment?: string;
};

/**
 * A help text section.
 */
export type HelpText = WithKind<'text'> & WithTitle & WithText & WithIndent;

/**
 * A help usage section.
 */
export type HelpUsage = WithKind<'usage'> & WithTitle & WithIndent & WithFilter & WithRequired;

/**
 * A help groups section.
 */
export type HelpGroups = WithKind<'groups'> & WithTitle & WithFilter;

/**
 * A help section.
 */
export type HelpSection = HelpText | HelpUsage | HelpGroups;

/**
 * A list of help sections.
 */
export type HelpSections = Array<HelpSection>;

/**
 * A help format.
 */
export type HelpFormat = (typeof helpFormats)[number];

/**
 * A help formatter.
 */
export interface HelpFormatter {
  /**
   * Formats a help message with sections.
   * Options are rendered in the same order as was declared in the option definitions.
   * @param sections The help sections
   * @param progName The program name, if any
   * @returns The formatted help message
   */
  formatSections(sections: HelpSections, progName?: string): HelpMessage;
}

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * A concrete version of the help column settings.
 */
type ConcreteColumn = Concrete<WithColumn>;

/**
 * A concrete version of the format configuration.
 */
type ConcreteFormat = Concrete<FormatterConfig>;

/**
 * Precomputed texts used by the ANSI formatter.
 */
type AnsiHelpEntry = [
  names: ReadonlyArray<TerminalString>,
  param: TerminalString,
  descr: TerminalString,
];

/**
 * Precomputed texts used by the CSV formatter.
 */
type CsvHelpEntry = ReadonlyArray<string>;

/**
 * Information about the current help message.
 */
type HelpContext = [styles: FormatStyles, options: OpaqueOptions, connectives: ConnectiveWords];

/**
 * A function to format a help item.
 */
type HelpFunction = (
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
  negate: boolean,
) => void;

/**
 * A set of functions to format help items.
 */
type HelpFunctions = ReadonlyArray<HelpFunction>;

/**
 * A function to format a help groups section.
 */
type GroupsFunction<T> = (group: string, entries: Array<T>, section: HelpGroups) => void;

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The default column configuration.
 */
const defaultColumn: ConcreteColumn = {
  align: 'left',
  indent: 2,
  breaks: 0,
  hidden: false,
};

/**
 * The default configuration used by the formatter.
 */
const defaultConfig: ConcreteFormat = {
  names: defaultColumn,
  param: { ...defaultColumn, absolute: false },
  descr: { ...defaultColumn, absolute: false },
  items: [
    HelpItem.synopsis,
    HelpItem.negation,
    HelpItem.separator,
    HelpItem.paramCount,
    HelpItem.positional,
    HelpItem.append,
    HelpItem.trim,
    HelpItem.case,
    HelpItem.conv,
    HelpItem.enums,
    HelpItem.regex,
    HelpItem.range,
    HelpItem.unique,
    HelpItem.limit,
    HelpItem.requires,
    HelpItem.required,
    HelpItem.default,
    HelpItem.deprecated,
    HelpItem.link,
    HelpItem.envVar,
    HelpItem.requiredIf,
    HelpItem.clusterLetters,
    HelpItem.fallback,
    HelpItem.useNested,
    HelpItem.useFormat,
    HelpItem.useFilter,
  ],
  phrases: {
    [HelpItem.synopsis]: '%t',
    [HelpItem.negation]: 'Can be negated with %o.',
    [HelpItem.separator]: 'Values are delimited by (%s|%r).',
    [HelpItem.paramCount]: 'Accepts (multiple|%n|at most %n|at least %n|between %n) parameters.',
    [HelpItem.positional]: 'Accepts positional parameters(| that may be preceded by %o).',
    [HelpItem.append]: 'May be specified multiple times.',
    [HelpItem.trim]: 'Values will be trimmed.',
    [HelpItem.case]: 'Values will be converted to (lowercase|uppercase).',
    [HelpItem.conv]: 'Values will be converted with Math.%t.',
    [HelpItem.enums]: 'Values must be one of {(%s|%n)}.',
    [HelpItem.regex]: 'Values must match the regex %r.',
    [HelpItem.range]: 'Values must be in the range [%n].',
    [HelpItem.unique]: 'Duplicate values will be removed.',
    [HelpItem.limit]: 'Value count is limited to %n.',
    [HelpItem.requires]: 'Requires %p.',
    [HelpItem.required]: 'Always required.',
    [HelpItem.default]: 'Defaults to (%b|%s|%n|[%s]|[%n]|%v).',
    [HelpItem.deprecated]: 'Deprecated for %t.',
    [HelpItem.link]: 'Refer to %u for details.',
    [HelpItem.envVar]: 'Can be specified through the %o environment variable.',
    [HelpItem.requiredIf]: 'Required if %p.',
    [HelpItem.clusterLetters]: 'Can be clustered with %s.',
    [HelpItem.fallback]: 'Falls back to (%b|%s|%n|[%s]|[%n]|%v) if specified without parameter.',
    [HelpItem.useNested]: 'Uses the next argument as the name of a nested command.',
    [HelpItem.useFormat]: 'Uses the next argument as the name of a help format.',
    [HelpItem.useFilter]: 'Uses the remaining arguments as option filter.',
  },
  filter: [],
};

/**
 * Keep this in-sync with {@link HelpItem}.
 */
const helpFunctions = [
  formatSynopsis,
  formatNegation,
  formatSeparator,
  formatParamCount,
  formatPositional,
  formatAppend,
  formatTrim,
  formatCase,
  formatConv,
  formatEnums,
  formatRegex,
  formatRange,
  formatUnique,
  formatLimit,
  formatRequires,
  formatRequired,
  formatDefault,
  formatDeprecated,
  formatLink,
  formatEnvVar,
  formatRequiredIf,
  formatClusterLetters,
  formatFallback,
  formatUseNested,
  formatUseFormat,
  formatUseFilter,
] as const satisfies HelpFunctions;

/**
 * The available help formats.
 */
const helpFormats = ['ansi', 'json', 'csv', 'md'] as const;

/**
 * The Markdown table cell delimiter.
 */
const markdownSep = ' | ';

/**
 * The Markdown table heading row.
 */
const markdownHead = markdownSep + fieldNames.join(markdownSep) + markdownSep;

/**
 * The Markdown table heading row splitter.
 */
const markdownHeadSplit =
  markdownSep + fieldNames.map((field) => '-'.repeat(field.length)).join(markdownSep) + markdownSep;

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements formatting of help messages for a set of option definitions.
 * @template T The type of the help message
 * @template E The type of the help entries
 */
abstract class BaseFormatter<T extends HelpMessage, E> implements HelpFormatter {
  protected readonly context: HelpContext;
  protected readonly groups = new Map<string, Array<E>>();

  /**
   * @returns The list of group names
   */
  get groupNames(): Iterable<string> {
    return this.groups.keys();
  }

  /**
   * Creates a help message formatter.
   * @param validator The validator instance
   * @param config The formatter configuration
   */
  constructor(validator: OptionValidator, config?: FormatterConfig) {
    const { styles, connectives } = validator.config;
    this.context = [styles, validator.options, connectives];
    this.build(mergeConfig(config));
  }

  /**
   * Formats the help message of an option group.
   * Options are rendered in the same order as was declared in the option definitions.
   * @param name The group name (defaults to the default group)
   * @returns The help message, if the group exists; otherwise an empty message
   */
  formatHelp(name = ''): T {
    return this.format(this.groups.get(name) ?? []);
  }

  protected abstract build(config: ConcreteFormat): void;
  protected abstract format(entries: Array<E>): T;
  abstract formatSections(sections: HelpSections, progName?: string): T;
}

/**
 * Implements formatting of ANSI help messages for a set of option definitions.
 */
export class AnsiFormatter extends BaseFormatter<AnsiMessage, AnsiHelpEntry> {
  protected override build(config: ConcreteFormat) {
    buildAnsiEntries(this.groups, config, this.context);
  }
  protected override format(entries: Array<AnsiHelpEntry>): AnsiMessage {
    return formatAnsiEntries(entries);
  }
  formatSections(sections: HelpSections, progName = ''): AnsiMessage {
    const help = new AnsiMessage();
    for (const section of sections) {
      formatAnsiSection(this.groups, this.context, section, progName, help);
    }
    return help;
  }
}

/**
 * Implements formatting of JSON help messages for a set of option definitions.
 */
export class JsonFormatter extends BaseFormatter<JsonMessage, object> {
  protected override build(config: ConcreteFormat) {
    buildEntries(this.groups, config, this.context, (opt) => opt);
  }
  protected override format(entries: Array<object>): JsonMessage {
    return new JsonMessage(...entries);
  }
  formatSections(sections: HelpSections): JsonMessage {
    const result = new JsonMessage();
    formatGroupsSections(this.groups, sections, (_, entries) => result.push(...entries));
    return result;
  }
}

/**
 * Implements formatting of CSV help messages for a set of option definitions.
 */
export class CsvFormatter extends BaseFormatter<TextMessage, CsvHelpEntry> {
  protected override build(config: ConcreteFormat) {
    buildEntries(this.groups, config, this.context, (opt) =>
      fieldNames.map((field) => `${opt[field] ?? ''}`),
    );
  }
  protected override format(entries: Array<CsvHelpEntry>): TextMessage {
    if (entries.length) {
      entries.unshift(fieldNames);
    }
    return formatCsvEntries(entries);
  }
  formatSections(sections: HelpSections): TextMessage {
    const result = new TextMessage(fieldNames.join('\t')); // single heading row for all groups
    formatGroupsSections(this.groups, sections, (_, entries) => formatCsvEntries(entries, result));
    return result;
  }
}

/**
 * Implements formatting of Markdown help messages for a set of option definitions.
 */
export class MdFormatter extends BaseFormatter<TextMessage, CsvHelpEntry> {
  protected override build(config: ConcreteFormat) {
    buildEntries(this.groups, config, this.context, (opt) =>
      fieldNames.map((field) => `${opt[field] ?? ''}`),
    );
  }
  protected override format(entries: Array<CsvHelpEntry>): TextMessage {
    const help = new TextMessage();
    if (entries.length) {
      help.push(markdownHead, markdownHeadSplit);
    }
    return formatCsvEntries(entries, help, markdownSep, markdownSep);
  }
  formatSections(sections: HelpSections): TextMessage {
    const result = new TextMessage();
    formatGroupsSections(this.groups, sections, (group, entries, section) => {
      if (result.length) {
        result.push(''); // line feed between tables
      }
      const title = group || section.title;
      if (title) {
        result.push('## ' + title, ''); // section before table
      }
      result.push(markdownHead, markdownHeadSplit); // one table for each group
      formatCsvEntries(entries, result, markdownSep, markdownSep);
    });
    return result;
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Creates a help message formatter.
 * @param validator The validator instance
 * @param config The formatter configuration
 * @param format The help format (defaults to `ansi`)
 * @returns The formatter instance
 */
export function createFormatter(
  validator: OptionValidator,
  config?: FormatterConfig,
  format: HelpFormat = 'ansi',
): HelpFormatter {
  const classes = [AnsiFormatter, JsonFormatter, CsvFormatter, MdFormatter];
  return new classes[helpFormats.indexOf(format)](validator, config);
}

/**
 * Checks if a name is a help format.
 * @param name The candidate name
 * @returns True if the name is a help format
 */
export function isHelpFormat(name: string): name is HelpFormat {
  return helpFormats.includes(name as HelpFormat);
}

/**
 * Formats a list of help groups sections to be included in the help message.
 * @template T The type of the help entries
 * @param groups The option groups
 * @param sections The help sections
 * @param formatFn The formatting function
 */
function formatGroupsSections<T>(
  groups: Map<string, Array<T>>,
  sections: HelpSections,
  formatFn: GroupsFunction<T>,
) {
  for (const section of sections) {
    if (section.type === 'groups') {
      formatGroups(groups, section, formatFn);
    }
  }
}

/**
 * Formats a help groups section to be included in the help message.
 * @template T The type of the help entries
 * @param groups The option groups
 * @param section The help section
 * @param formatFn The formatting function
 */
function formatGroups<T>(
  groups: Map<string, Array<T>>,
  section: HelpGroups,
  formatFn: GroupsFunction<T>,
) {
  const { filter, exclude } = section;
  const filterGroups = filter && new Set(filter);
  for (const [group, entries] of groups.entries()) {
    if ((filterGroups?.has(group) ?? !exclude) !== !!exclude) {
      formatFn(group, entries, section);
    }
  }
}

/**
 * Matches an option with a regular expression.
 * @param option The option definition
 * @param regexp The regular expression
 * @returns True if the option matches
 */
function matchOption(option: OpaqueOption, regexp: RegExp): boolean {
  return !!(
    option.names?.find((name) => name?.match(regexp)) ||
    option.desc?.match(regexp) ||
    option.envVar?.match(regexp)
  );
}

/**
 * Build the help entries for a help message.
 * @template T The type of the help entries
 * @param groups The map of option groups
 * @param config The formatter configuration
 * @param context The help context
 * @param formatFn The formatting function
 */
function buildEntries<T>(
  groups: Map<string, Array<T>>,
  config: ConcreteFormat,
  context: HelpContext,
  formatFn: (option: OpaqueOption) => T,
) {
  const { filter } = config;
  const [, options] = context;
  const regexp = filter.length ? RegExp(combineRegExp(filter), 'i') : undefined;
  for (const key in options) {
    const option = options[key];
    if (!option.hide && (!regexp || matchOption(option, regexp))) {
      const entry = formatFn(option);
      const name = option.group ?? '';
      const group = groups.get(name);
      if (!group) {
        groups.set(name, [entry]);
      } else {
        group.push(entry);
      }
    }
  }
}

/**
 * Build the help entries for a help message using the ANSI format.
 * @param groups The option groups
 * @param config The format configuration
 * @param context The help context
 */
function buildAnsiEntries(
  groups: Map<string, Array<AnsiHelpEntry>>,
  config: ConcreteFormat,
  context: HelpContext,
) {
  /** @ignore */
  function formatFn(option: OpaqueOption): AnsiHelpEntry {
    const [entry, paramLen] = formatOption(config, context, nameWidths, option);
    paramWidth = max(paramWidth, paramLen);
    return entry;
  }
  const { names } = config;
  const [, options, connectives] = context;
  const optionSep = connectives[ConnectiveWord.optionSep];
  const nameWidths = names.hidden
    ? 0
    : names.align === 'slot'
      ? getNameWidths(options)
      : getMaxNamesWidth(options, optionSep);
  let paramWidth = 0;
  buildEntries(groups, config, context, formatFn);
  adjustEntries(groups, config, nameWidths, paramWidth);
}

/**
 * Formats an option to be printed on the terminal.
 * @param config The format configuration
 * @param context The help context
 * @param nameWidths The name slot widths
 * @param option The option definition
 * @returns [the help entry, the length of the option parameter]
 */
function formatOption(
  config: ConcreteFormat,
  context: HelpContext,
  nameWidths: Array<number> | number,
  option: OpaqueOption,
): [AnsiHelpEntry, number] {
  const names = formatNames(config, context, option, nameWidths);
  const [param, paramLen] = formatParams(config, context[0], option);
  const descr = formatDescription(config, context, option);
  return [[names, param, descr], paramLen];
}

/**
 * Formats an option's names to be printed on the terminal.
 * @param config The format configuration
 * @param context The help context
 * @param option The option definition
 * @param nameWidths The name slot widths
 * @returns The list of formatted strings, one for each name
 */
function formatNames(
  config: ConcreteFormat,
  context: HelpContext,
  option: OpaqueOption,
  nameWidths: Array<number> | number,
): Array<TerminalString> {
  if (config.names.hidden || !option.names) {
    return [];
  }
  const [styles, , connectives] = context;
  const namesStyle = option.styles?.names ?? styles.option;
  const sep = connectives[ConnectiveWord.optionSep];
  return formatNameSlots(config, option.names, nameWidths, namesStyle, styles.text, sep);
}

/**
 * Formats an option's parameter to be printed on the terminal.
 * @param config The format configuration
 * @param styles The set of styles
 * @param option The option definition
 * @returns [the formatted string, the string length]
 */
function formatParams(
  config: ConcreteFormat,
  styles: FormatStyles,
  option: OpaqueOption,
): [TerminalString, number] {
  const result = new TerminalString();
  const { param } = config;
  if (param.hidden) {
    return [result, 0];
  }
  const len = formatParam(option, styles, result, param.breaks);
  result.indent = len; // hack: save the length, since we will need it in `adjustEntries`
  return [result, len];
}

/**
 * Formats an option's description to be printed on the terminal.
 * The description always ends with a single line break.
 * @param config The format configuration
 * @param context The help context
 * @param option The option definition
 * @returns The formatted string
 */
function formatDescription(
  config: ConcreteFormat,
  context: HelpContext,
  option: OpaqueOption,
): TerminalString {
  const { descr, items, phrases } = config;
  const result = new TerminalString(0, 0, descr.align === 'right');
  if (descr.hidden || !items.length) {
    return result.break();
  }
  const [styles] = context;
  const descrStyle = option.styles?.descr ?? styles.text;
  result.break(descr.breaks).seq(descrStyle);
  styles.current = descrStyle;
  const count = result.count;
  try {
    for (const item of items) {
      helpFunctions[item](option, phrases[item], context, result);
    }
  } finally {
    delete styles.current;
  }
  if (result.count === count) {
    result.pop(count).break(); // this string does not contain any word
  } else {
    result.clear().break(); // add ending breaks after styles
  }
  return result;
}

/**
 * Merges a help configuration with the default configuration.
 * @param config The provided configuration
 * @returns The merged configuration
 */
function mergeConfig(config: FormatterConfig = {}): ConcreteFormat {
  return {
    names: { ...defaultConfig.names, ...config.names },
    param: { ...defaultConfig.param, ...config.param },
    descr: { ...defaultConfig.descr, ...config.descr },
    items: config.items ?? defaultConfig.items,
    phrases: { ...defaultConfig.phrases, ...config.phrases },
    filter: config.filter ?? defaultConfig.filter,
  };
}

/**
 * Gets the required width of each name slot in a set of option definitions.
 * @param options The option definitions
 * @returns The name slot widths
 */
function getNameWidths(options: OpaqueOptions): Array<number> {
  const result: Array<number> = [];
  for (const key in options) {
    const option = options[key];
    const names = option.names;
    if (!option.hide && names) {
      names.forEach((name, i) => {
        result[i] = max(result[i] ?? 0, name?.length ?? 0);
      });
    }
  }
  return result;
}

/**
 * Gets the maximum combined width of option names in a set of option definitions.
 * @param options The option definitions
 * @param sep The option name separator
 * @returns The maximum width
 */
function getMaxNamesWidth(options: OpaqueOptions, sep: string): number {
  const sepLen = sep.length + 1;
  let result = 0;
  for (const key in options) {
    const option = options[key];
    const names = option.names;
    if (!option.hide && names) {
      const len = names.reduce((acc, name) => acc + sepLen + (name?.length ?? -sepLen), -sepLen);
      result = max(result, len);
    }
  }
  return result;
}

/**
 * Updates help entries to start at the appropriate terminal column.
 * @param groups The option groups
 * @param config The format configuration
 * @param namesWidth The width (or widths) of the names column
 * @param paramWidth The width of the param column
 */
function adjustEntries(
  groups: Map<string, Array<AnsiHelpEntry>>,
  config: ConcreteFormat,
  namesWidth: Array<number> | number,
  paramWidth: number,
) {
  if (typeof namesWidth !== 'number') {
    namesWidth = namesWidth.length ? namesWidth.reduce((acc, len) => acc + len + 2, -2) : 0;
  }
  const { names, param, descr } = config;
  const alignLeft = param.align === 'left';
  const namesIndent = max(0, names.indent);
  const paramIndent = param.absolute
    ? max(0, param.indent)
    : namesIndent + namesWidth + param.indent;
  const descrIndent = descr.absolute
    ? max(0, descr.indent)
    : paramIndent + paramWidth + descr.indent;
  for (const entries of groups.values()) {
    for (const [, param, descr] of entries) {
      param.indent = paramIndent + (alignLeft ? 0 : paramWidth - param.indent);
      descr.indent = descrIndent;
    }
  }
}

/**
 * Formats a list of names to be printed on the terminal.
 * @param config The format configuration
 * @param names The list of option names
 * @param nameWidths The name slot widths
 * @param namesStyle The style to apply
 * @param defStyle The default style
 * @param sep The option name separator
 * @returns The resulting strings
 */
function formatNameSlots(
  config: ConcreteFormat,
  names: ReadonlyArray<string | null>,
  nameWidths: Array<number> | number,
  namesStyle: Style,
  defStyle: Style,
  sep: string,
): Array<TerminalString> {
  const slotted = typeof nameWidths !== 'number';
  const result: Array<TerminalString> = [];
  const sepLen = sep.length + 1;
  let str: TerminalString | undefined;
  let { indent, breaks, align } = config.names;
  indent = max(0, indent);
  let len = 0;
  names.forEach((name, i) => {
    if (name) {
      if (str) {
        str.close(sep);
        len += sepLen;
      }
      if (!str || slotted) {
        str = new TerminalString(indent, breaks);
        result.push(str);
        breaks = 0; // break only on the first name
      }
      str.style(namesStyle, name, defStyle);
      len += name.length;
    } else if (slotted) {
      str = undefined;
    }
    if (slotted) {
      indent += nameWidths[i] + sepLen;
    }
  });
  if (str && !slotted && align === 'right') {
    str.indent += nameWidths - len;
  }
  return result;
}

/**
 * Formats a help message from a list of ANSI help entries.
 * @param entries The help entries
 * @param result The resulting message
 * @returns The resulting message
 */
function formatAnsiEntries(entries: Array<AnsiHelpEntry>, result = new AnsiMessage()): AnsiMessage {
  for (const [names, param, descr] of entries) {
    result.push(...names, param, descr);
  }
  return result;
}

/**
 * Formats a help message from a list of CSV help entries.
 * Sequences of whitespace are collapsed to a single space.
 * @param entries The help entries
 * @param result The resulting message
 * @param itemSep The help item delimiter
 * @param entryQuote The quote character for a whole help entry
 * @returns The resulting message
 */
function formatCsvEntries(
  entries: Array<CsvHelpEntry>,
  result = new TextMessage(),
  itemSep = '\t',
  entryQuote = '',
): TextMessage {
  result.push(
    ...entries.map(
      (entry) =>
        entryQuote +
        entry
          .map((item) => item.replace(regexps.space, ' ').replace(regexps.style, ''))
          .join(itemSep) +
        entryQuote,
    ),
  );
  return result;
}

/**
 * Formats a help section to be included in the full help message.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param groups The option groups
 * @param context The help context
 * @param section The help section
 * @param progName The program name
 * @param result The resulting message
 */
function formatAnsiSection(
  groups: Map<string, Array<AnsiHelpEntry>>,
  context: HelpContext,
  section: HelpSection,
  progName: string,
  result: AnsiMessage,
) {
  let breaks = section.breaks ?? (result.length ? 2 : 0);
  if (section.type === 'groups') {
    formatGroupsSection(groups, breaks, section, result);
  } else {
    const { title, noWrap, style: sty } = section;
    if (title) {
      result.push(formatText(title, sty ?? style(tf.bold), 0, breaks, noWrap));
      breaks = 2;
    }
    const [styles] = context;
    if (section.type === 'usage') {
      let { indent } = section;
      if (progName) {
        result.push(formatText(progName, styles.text, indent, breaks, true));
        indent = max(0, indent ?? 0) + progName.length + 1;
        breaks = 0;
      }
      result.push(formatUsage(context, section, indent, breaks));
    } else {
      const { text, indent } = section;
      if (text) {
        result.push(formatText(text, styles.text, indent, breaks, noWrap));
      }
    }
  }
}

/**
 * Formats a groups section to be included in the full help message.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param groups The option groups
 * @param breaks The number of line breaks
 * @param section The help section
 * @param result The resulting message
 */
function formatGroupsSection(
  groups: Map<string, Array<AnsiHelpEntry>>,
  breaks: number,
  section: HelpGroups,
  result: AnsiMessage,
) {
  const { title, noWrap, style: sty } = section;
  const headingStyle = sty ?? style(tf.bold);
  formatGroups(groups, section, (group, entries) => {
    const title2 = group || title;
    const heading = title2
      ? formatText(title2, headingStyle, 0, breaks, noWrap).break(2)
      : new TerminalString(0, breaks);
    result.push(heading);
    formatAnsiEntries(entries, result);
    result[result.length - 1].pop(); // remove trailing break
    breaks = 2;
  });
}

/**
 * Formats a custom text to be included in a help section.
 * @param text The heading title or section text
 * @param defStyle The default style
 * @param indent The indentation level (negative values are replaced by zero)
 * @param breaks The number of line breaks (non-positive values are ignored)
 * @param noWrap True if the provided text should not be split
 * @returns The terminal string
 */
function formatText(
  text: string,
  defStyle: Style,
  indent?: number,
  breaks?: number,
  noWrap = false,
): TerminalString {
  const result = new TerminalString(indent, breaks).seq(defStyle);
  if (noWrap) {
    result.word(text); // warning: may be larger than the terminal width
  } else {
    result.split(text);
  }
  return result.clear(); // to simplify client code
}

/**
 * Formats a usage text to be included in a help section.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param context The help context
 * @param section The help section
 * @param indent The indentation level (negative values are replaced by zero)
 * @param breaks The number of line breaks (non-positive values are ignored)
 * @returns The terminal string
 */
function formatUsage(
  context: HelpContext,
  section: HelpUsage,
  indent?: number,
  breaks?: number,
): TerminalString {
  const [styles, options] = context;
  const { filter, exclude, required, comment } = section;
  const filterKeys = filter && new Set(filter);
  const requiredKeys = required && new Set(required);
  const result = new TerminalString(indent, breaks).seq(styles.text);
  const count = result.count;
  if (filterKeys && !exclude) {
    // list options in the same order specified in the filter
    for (const key of filterKeys) {
      if (key in options) {
        formatUsageOption(context, options[key], result, requiredKeys?.has(key));
      }
    }
  } else {
    for (const key in options) {
      const option = options[key];
      if (!option.hide && !(exclude && filterKeys?.has(key))) {
        formatUsageOption(context, option, result);
      }
    }
  }
  if (comment) {
    result.split(comment);
  }
  if (result.count === count) {
    return new TerminalString(); // this string does not contain any word
  }
  return result.clear(); // to simplify client code
}

/**
 * Formats an option to be included in the the usage text.
 * @param context The help context
 * @param option The option definition
 * @param result The resulting string
 * @param required True if the option should be considered required
 */
function formatUsageOption(
  context: HelpContext,
  option: OpaqueOption,
  result: TerminalString,
  required = option.required ?? false,
) {
  const [styles] = context;
  if (!required) {
    result.open('[');
  }
  formatUsageNames(context, option, result);
  formatParam(option, styles, result);
  if (!required) {
    result.close(']');
  }
}

/**
 * Formats an option's names to be included in the usage text.
 * @param context The help context
 * @param option The option definition
 * @param result The resulting string
 */
function formatUsageNames(context: HelpContext, option: OpaqueOption, result: TerminalString) {
  const [styles, , connectives] = context;
  const names = getOptionNames(option);
  if (names.length) {
    const positional = option.positional;
    if (positional) {
      result.open('[');
    }
    if (names.length > 1) {
      const sep = connectives[ConnectiveWord.optionAlt];
      result.format(styles, '(%o)', { o: names }, { sep, mergeNext: true });
    } else {
      format.o(names[0], styles, result);
    }
    if (positional) {
      result.close(']');
    }
  }
}

/**
 * Formats an option's parameter to be included in the description or the usage text.
 * Assumes that the option is not niladic.
 * @param option The option definition
 * @param styles The set of styles
 * @param result The resulting string
 * @param breaks The number of line breaks (non-positive values are ignored)
 * @returns The string length
 */
function formatParam(
  option: OpaqueOption,
  styles: FormatStyles,
  result: TerminalString,
  breaks = 0,
): number {
  if (option.example !== undefined) {
    return formatExample(option, styles, result.break(breaks));
  }
  const paramStyle = option.styles?.param ?? styles.value;
  const ellipsis = '...';
  if (option.type === 'command') {
    result.break(breaks).style(paramStyle, ellipsis, styles.text);
    return ellipsis.length;
  }
  const [min, max] = getParamCount(option);
  if (!max) {
    return 0;
  }
  const paramName = option.paramName;
  const param0 = paramName
    ? paramName.includes('<')
      ? paramName
      : `<${paramName}>`
    : option.type === 'function'
      ? '<param>'
      : `<${option.type}>`;
  const param1 = param0 + (max > 1 ? ellipsis : '');
  const param2 = min <= 0 ? `[${param1}]` : param1;
  result.break(breaks).style(paramStyle, param2, styles.text);
  return param2.length;
}

/**
 * Formats an option's example value to be included in the description or the usage text.
 * Assumes that the option was validated.
 * @param option The option definition
 * @param styles The set of styles
 * @param result The resulting string
 * @returns The string length, counting spaces in non-delimited array values
 */
function formatExample(option: OpaqueOption, styles: FormatStyles, result: TerminalString): number {
  const example = option.example;
  const separator = option.separator;
  if (separator) {
    const sep = typeof separator === 'string' ? separator : separator.source;
    const value = (example as Array<unknown>).join(sep);
    result.format(styles, '%s', { s: value });
    return result.length;
  }
  const spec = isOpt.bool(option) ? 'b' : isOpt.str(option) ? 's' : isOpt.num(option) ? 'n' : 'v';
  result.format(styles, `%${spec}`, { [spec]: example });
  const nonDelimited = spec !== 'v' && Array.isArray(example);
  return result.length + (nonDelimited ? example.length - 1 : 0);
}

/**
 * Formats an option's synopsis to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatSynopsis(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const desc = option.desc;
  if (desc) {
    result.format(context[0], phrase, { t: desc });
  }
}

/**
 * Formats an option's negation names to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatNegation(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const names = option.negationNames?.filter((name) => name);
  if (names?.length) {
    const sep = context[2][ConnectiveWord.optionSep];
    result.format(context[0], phrase, { o: names }, { sep });
  }
}

/**
 * Formats an option's separator string to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatSeparator(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const separator = option.separator;
  if (separator) {
    const [spec, alt] = typeof separator === 'string' ? ['s', 0] : ['r', 1];
    result.format(context[0], phrase, { [spec]: separator }, { alt });
  }
}

/**
 * Formats an option's parameter count to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatParamCount(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const [min, max] = getParamCount(option);
  if (max > 1) {
    const [alt, val] =
      min === max
        ? [1, min] // exactly %n
        : min <= 0
          ? isFinite(max)
            ? [2, max] // at most %n
            : [0, undefined] // multiple
          : isFinite(max)
            ? [4, [min, max]] // between %n
            : min > 1
              ? [3, min] // at least %n
              : [0, undefined]; // multiple
    const sep = context[2][ConnectiveWord.and];
    result.format(context[0], phrase, { n: val }, { alt, sep, mergePrev: false });
  }
}

/**
 * Formats an option's positional attribute to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatPositional(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const positional = option.positional;
  if (positional) {
    const [spec, alt] = positional === true ? ['', 0] : ['o', 1];
    result.format(context[0], phrase, { [spec]: positional }, { alt });
  }
}

/**
 * Formats an option's append attribute to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param _context The help context
 * @param result The resulting string
 */
function formatAppend(
  option: OpaqueOption,
  phrase: string,
  _context: HelpContext,
  result: TerminalString,
) {
  if (option.append) {
    result.split(phrase);
  }
}

/**
 * Formats an option's trim normalization to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param _context The help context
 * @param result The resulting string
 */
function formatTrim(
  option: OpaqueOption,
  phrase: string,
  _context: HelpContext,
  result: TerminalString,
) {
  if (option.trim) {
    result.split(phrase);
  }
}

/**
 * Formats an option's case conversion to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatCase(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const conv = option.case;
  if (conv) {
    const alt = conv === 'lower' ? 0 : 1;
    result.format(context[0], phrase, undefined, { alt });
  }
}

/**
 * Formats an option's math conversion to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatConv(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const conv = option.conv;
  if (conv) {
    result.format(context[0], phrase, { t: conv });
  }
}

/**
 * Formats an option's enumerated values to be included in the description.
 * This includes truth and falsity names of a boolean option.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatEnums(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const enums = option.enums;
  const truth = option.truthNames;
  const falsity = option.falsityNames;
  if (enums || truth || falsity) {
    const connectives = context[2];
    const values = [...(enums ?? []), ...(truth ?? []), ...(falsity ?? [])];
    const [spec, alt, sep] = isOpt.num(option)
      ? ['n', 1, connectives[ConnectiveWord.numberSep]]
      : ['s', 0, connectives[ConnectiveWord.stringSep]];
    result.format(context[0], phrase, { [spec]: values }, { alt, sep });
  }
}

/**
 * Formats an option's regex constraint to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatRegex(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const regex = option.regex;
  if (regex) {
    result.format(context[0], phrase, { r: regex });
  }
}

/**
 * Formats an option's range constraint to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatRange(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const range = option.range;
  if (range) {
    const sep = context[2][ConnectiveWord.numberSep];
    result.format(context[0], phrase, { n: range }, { sep });
  }
}

/**
 * Formats an option's unique constraint to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param _context The help context
 * @param result The resulting string
 */
function formatUnique(
  option: OpaqueOption,
  phrase: string,
  _context: HelpContext,
  result: TerminalString,
) {
  if (option.unique) {
    result.split(phrase);
  }
}

/**
 * Formats an option's limit constraint to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatLimit(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const limit = option.limit;
  if (limit !== undefined) {
    result.format(context[0], phrase, { n: limit });
  }
}

/**
 * Formats an option's required attribute to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param _context The help context
 * @param result The resulting string
 */
function formatRequired(
  option: OpaqueOption,
  phrase: string,
  _context: HelpContext,
  result: TerminalString,
) {
  if (option.required) {
    result.split(phrase);
  }
}

/**
 * Formats an option's default value to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatDefault(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  formatValue(context, option, phrase, result, option.default);
}

/**
 * Formats an option's default or fallback value to be included in the description.
 * @param context The help context
 * @param option The option definition
 * @param phrase The description item phrase
 * @param result The resulting string
 * @param value The default or fallback value
 */
function formatValue(
  context: HelpContext,
  option: OpaqueOption,
  phrase: string,
  result: TerminalString,
  value: unknown,
) {
  if (value === undefined) {
    return;
  }
  const connectives = context[2];
  const [spec, alt, sep] =
    typeof value === 'function'
      ? ['v', 5]
      : typeof value === 'boolean'
        ? ['b', 0]
        : typeof value === 'string'
          ? ['s', 1]
          : typeof value === 'number'
            ? ['n', 2]
            : option.type === 'strings'
              ? ['s', 3, connectives[ConnectiveWord.stringSep]]
              : option.type === 'numbers'
                ? ['n', 4, connectives[ConnectiveWord.numberSep]]
                : ['v', 5];
  result.format(context[0], phrase, { [spec]: value }, { alt, sep });
}

/**
 * Formats an option's deprecation notice to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatDeprecated(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const deprecated = option.deprecated;
  if (deprecated) {
    result.format(context[0], phrase, { t: deprecated });
  }
}

/**
 * Formats an option's external resource reference to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatLink(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const link = option.link;
  if (link) {
    result.format(context[0], phrase, { u: link });
  }
}

/**
 * Formats an option's environment variable to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatEnvVar(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const envVar = option.envVar;
  if (envVar) {
    result.format(context[0], phrase, { o: envVar });
  }
}

/**
 * Formats an option's cluster letters to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatClusterLetters(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const letters = option.clusterLetters;
  if (letters) {
    result.format(context[0], phrase, { s: letters });
  }
}

/**
 * Recursively formats an option's requirements to be included in the description.
 * Assumes that the options were validated.
 * @param context The help context
 * @param requires The option requirements
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequirements(
  context: HelpContext,
  requires: Requires,
  result: TerminalString,
  negate: boolean = false,
) {
  const [styles, options, connectives] = context;
  if (typeof requires === 'string') {
    if (negate) {
      result.word(connectives[ConnectiveWord.no]);
    }
    const name = options[requires].preferredName ?? '';
    format.o(name, styles, result);
  } else if (requires instanceof RequiresNot) {
    formatRequirements(context, requires.item, result, !negate);
  } else if (requires instanceof RequiresAll || requires instanceof RequiresOne) {
    formatRequiresExp(context, requires, result, negate);
  } else if (typeof requires === 'object') {
    formatRequiresVal(context, requires, result, negate);
  } else {
    if (negate) {
      result.word(connectives[ConnectiveWord.not]);
    }
    format.v(requires, styles, result);
  }
}

/**
 * Formats a requirement expression to be included in the description.
 * Assumes that the options were validated.
 * @param context The help context
 * @param requires The requirement expression
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequiresExp(
  context: HelpContext,
  requires: RequiresAll | RequiresOne,
  result: TerminalString,
  negate: boolean,
) {
  /** @ignore */
  function custom(item: Requires) {
    formatRequirements(context, item, result, negate);
  }
  const connectives = context[2];
  const items = requires.items;
  const phrase = items.length > 1 ? '(%c)' : '%c';
  const sep =
    requires instanceof RequiresAll === negate
      ? connectives[ConnectiveWord.or]
      : connectives[ConnectiveWord.and];
  result.format(context[0], phrase, { c: items }, { sep, custom, mergePrev: false });
}

/**
 * Formats a requirement object to be included in the description.
 * Assumes that the options were validated.
 * @param context The help context
 * @param requires The requirement object
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequiresVal(
  context: HelpContext,
  requires: RequiresVal,
  result: TerminalString,
  negate: boolean,
) {
  /** @ignore */
  function custom([key, value]: RequiresEntry) {
    formatRequiredValue(context, options[key], value, result, negate);
  }
  const [, options, connectives] = context;
  const entries = Object.entries(requires);
  const phrase = entries.length > 1 ? '(%c)' : '%c';
  const sep = connectives[ConnectiveWord.and];
  result.format(context[0], phrase, { c: entries }, { sep, custom, mergePrev: false });
}

/**
 * Formats an option's required value to be included in the description.
 * Assumes that the options were validated.
 * @param context The help context
 * @param option The option definition
 * @param value The option value
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequiredValue(
  context: HelpContext,
  option: OpaqueOption,
  value: RequiresVal[string],
  result: TerminalString,
  negate: boolean,
) {
  const [styles, , connectives] = context;
  const requireAbsent = value === null;
  const requirePresent = value === undefined;
  if ((requireAbsent && !negate) || (requirePresent && negate)) {
    result.word(connectives[ConnectiveWord.no]);
  }
  format.o(option.preferredName ?? '', styles, result);
  if (!requireAbsent && !requirePresent) {
    const connective = negate
      ? connectives[ConnectiveWord.notEquals]
      : connectives[ConnectiveWord.equals];
    const spec = isOpt.bool(option) ? 'b' : isOpt.str(option) ? 's' : isOpt.num(option) ? 'n' : 'v';
    const phrase = isOpt.arr(option) ? `[%${spec}]` : `%${spec}`;
    result.word(connective).format(styles, phrase, { [spec]: value });
  }
}

/**
 * Formats an option's requirements to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatRequires(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const requires = option.requires;
  if (requires) {
    result.split(phrase, () => formatRequirements(context, requires, result));
  }
}

/**
 * Formats an option's conditional requirements to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatRequiredIf(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  const requiredIf = option.requiredIf;
  if (requiredIf) {
    result.split(phrase, () => formatRequirements(context, requiredIf, result));
  }
}

/**
 * Formats an option's fallback value to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param context The help context
 * @param result The resulting string
 */
function formatFallback(
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) {
  formatValue(context, option, phrase, result, option.fallback);
}

/**
 * Formats a help option's useNested to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param _context The help context
 * @param result The resulting string
 */
function formatUseNested(
  option: OpaqueOption,
  phrase: string,
  _context: HelpContext,
  result: TerminalString,
) {
  if (option.useNested) {
    result.split(phrase);
  }
}

/**
 * Formats a help option's useFormat to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param _context The help context
 * @param result The resulting string
 */
function formatUseFormat(
  option: OpaqueOption,
  phrase: string,
  _context: HelpContext,
  result: TerminalString,
) {
  if (option.useFormat) {
    result.split(phrase);
  }
}

/**
 * Formats a help option's useFilter to be included in the description.
 * @param option The option definition
 * @param phrase The description item phrase
 * @param _context The help context
 * @param result The resulting string
 */
function formatUseFilter(
  option: OpaqueOption,
  phrase: string,
  _context: HelpContext,
  result: TerminalString,
) {
  if (option.useFilter) {
    result.split(phrase);
  }
}
