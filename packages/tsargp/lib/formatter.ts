//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { FormattingFlags, HelpMessage, MessageConfig, Style } from './styles.js';
import type {
  WithColumn,
  HelpGroups,
  HelpSection,
  HelpUsage,
  HelpSections,
  HelpFormatter,
  OpaqueOption,
  OpaqueOptions,
  Requires,
  RequiresCallback,
  RequiresEntry,
  PartialFormatterConfig,
  FormatterConfig,
} from './options.js';

import { ConnectiveWord, HelpItem, tf } from './enums.js';
import {
  fmt,
  cfg,
  style,
  TerminalString,
  AnsiMessage,
  JsonMessage,
  TextMessage,
} from './styles.js';
import { getParamCount, getOptionNames, visitRequirements } from './options.js';
import {
  mergeValues,
  getSymbol,
  isReadonlyArray,
  getKeys,
  escapeRegExp,
  getValues,
  max,
  regex,
  getEntries,
  getRequiredBy,
} from './utils.js';

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
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
type HelpContext = [options: OpaqueOptions, config: FormatterConfig];

/**
 * A function to format a help item.
 * @param option The option definition
 * @param phrase The help item phrase
 * @param context The help context
 * @param result The resulting string
 */
type HelpFunction = (
  option: OpaqueOption,
  phrase: string,
  context: HelpContext,
  result: TerminalString,
) => void;

/**
 * A function to format a help groups section.
 * @template T The type of the help entry
 */
type GroupsFunction<T> = (group: string, entries: ReadonlyArray<T>, section: HelpGroups) => void;

/**
 * A map of option groups to help entries.
 * @template T The type of the help entry
 */
type EntriesByGroup<T> = Readonly<Record<string, ReadonlyArray<T>>>;

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The default column configuration.
 */
const defaultColumn: WithColumn = {
  align: 'left',
  indent: 2,
  breaks: 0,
  hidden: false,
};

/**
 * The default configuration used by the formatter.
 */
const defaultConfig: FormatterConfig = {
  ...cfg,
  names: defaultColumn,
  param: { ...defaultColumn, absolute: false },
  descr: { ...defaultColumn, absolute: false },
  phrases: {
    [HelpItem.synopsis]: '#0',
    [HelpItem.separator]: 'Values can be delimited with #0.',
    [HelpItem.paramCount]: 'Accepts (multiple|#0|at most #0|at least #0|between #0) parameters.',
    [HelpItem.positional]: 'Accepts positional arguments(| that may be preceded by #0).',
    [HelpItem.append]: 'Can be specified multiple times.',
    [HelpItem.choices]: 'Values must be one of #0.',
    [HelpItem.regex]: 'Values must match the regex #0.',
    [HelpItem.unique]: 'Duplicate values will be removed.',
    [HelpItem.limit]: 'Element count is limited to #0.',
    [HelpItem.requires]: 'Requires #0.',
    [HelpItem.required]: 'Always required.',
    [HelpItem.default]: 'Defaults to #0.',
    [HelpItem.deprecated]: 'Deprecated for #0.',
    [HelpItem.link]: 'Refer to #0 for details.',
    [HelpItem.stdin]: 'Reads data from standard input.',
    [HelpItem.sources]: 'Reads environment data from #0.',
    [HelpItem.requiredIf]: 'Required if #0.',
    [HelpItem.cluster]: 'Can be clustered with #0.',
    [HelpItem.useNested]: 'Uses the next argument as the name of a nested command.',
    [HelpItem.useFormat]: 'Uses the next argument as the name of a help format.',
    [HelpItem.useFilter]: 'Uses the remaining arguments as option filter.',
    [HelpItem.inline]: '(Disallows|Requires) inline parameters.',
    [HelpItem.formats]: 'Available formats are #0.',
  },
  items: [
    HelpItem.synopsis,
    HelpItem.cluster,
    HelpItem.separator,
    HelpItem.paramCount,
    HelpItem.positional,
    HelpItem.inline,
    HelpItem.append,
    HelpItem.choices,
    HelpItem.regex,
    HelpItem.unique,
    HelpItem.limit,
    HelpItem.stdin,
    HelpItem.sources,
    HelpItem.requires,
    HelpItem.required,
    HelpItem.requiredIf,
    HelpItem.default,
    HelpItem.useNested,
    HelpItem.useFormat,
    HelpItem.useFilter,
    HelpItem.formats,
    HelpItem.deprecated,
    HelpItem.link,
  ],
  filter: [],
};

/**
 * Keep this in-sync with {@link HelpItem}.
 */
const helpFunctions = [
  /**
   * Formats an option's synopsis to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const desc = option.synopsis;
    if (desc) {
      result.format(context[1], phrase, {}, new TerminalString().split(desc));
    }
  },
  /**
   * Formats an option's separator string to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const separator = option.separator;
    if (separator) {
      result.format(context[1], phrase, {}, separator);
    }
  },
  /**
   * Formats an option's parameter count to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const [min, max] = getParamCount(option);
    if (max > 1 && !option.inline) {
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
      const sep = context[1].connectives[ConnectiveWord.and];
      result.format(context[1], phrase, { alt, sep, open: '', close: '', mergePrev: false }, val);
    }
  },
  /**
   * Formats an option's positional attribute to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const positional = option.positional;
    if (positional) {
      const [alt, name] = positional === true ? [0] : [1, getSymbol(positional)];
      result.format(context[1], phrase, { alt }, name);
    }
  },
  /**
   * Formats an option's append attribute to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.append) {
      result.split(phrase);
    }
  },
  /**
   * Formats an option's choices to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const choices = option.choices;
    const values = isReadonlyArray<string>(choices) ? choices : choices && getKeys(choices);
    if (values?.length) {
      result.format(context[1], phrase, { open: '{', close: '}' }, values);
    }
  },
  /**
   * Formats an option's regex constraint to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const regex = option.regex;
    if (regex) {
      result.format(context[1], phrase, {}, regex);
    }
  },
  /**
   * Formats an option's unique constraint to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.unique) {
      result.split(phrase);
    }
  },
  /**
   * Formats an option's limit constraint to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const limit = option.limit;
    if (limit !== undefined) {
      result.format(context[1], phrase, {}, limit);
    }
  },
  /**
   * Formats an option's requirements to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const requires = option.requires;
    if (requires) {
      result.split(phrase, () => formatRequirements(context, requires, result));
    }
  },
  /**
   * Formats an option's required attribute to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.required) {
      result.split(phrase);
    }
  },
  /**
   * Formats an option's default value to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const def = option.default;
    if (def !== undefined) {
      result.format(context[1], phrase, {}, def);
    }
  },
  /**
   * Formats an option's deprecation notice to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const deprecated = option.deprecated;
    if (deprecated) {
      result.format(context[1], phrase, {}, new TerminalString().split(deprecated));
    }
  },
  /**
   * Formats an option's external resource reference to be included in the description
   * @ignore
   */
  (option, phrase, context, result) => {
    const link = option.link;
    if (link) {
      result.format(context[1], phrase, {}, link);
    }
  },
  /**
   * Formats an option's handling of standard input to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.stdin) {
      result.split(phrase);
    }
  },
  /**
   * Formats an option's environment data sources to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const env = option.sources;
    if (env?.length) {
      const map = (name: (typeof env)[number]) =>
        typeof name === 'string' ? getSymbol(name) : name;
      result.format(context[1], phrase, { open: '', close: '' }, env.map(map));
    }
  },
  /**
   * Formats an option's conditional requirements to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const requiredIf = option.requiredIf;
    if (requiredIf) {
      result.split(phrase, () => formatRequirements(context, requiredIf, result));
    }
  },
  /**
   * Formats an option's cluster letters to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const cluster = option.cluster;
    if (cluster) {
      result.format(context[1], phrase, {}, cluster);
    }
  },
  /**
   * Formats a help option's useNested to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.useNested) {
      result.split(phrase);
    }
  },
  /**
   * Formats a help option's useFormat to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.useFormat) {
      result.split(phrase);
    }
  },
  /**
   * Formats a help option's useFilter to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.useFilter) {
      result.split(phrase);
    }
  },
  /**
   * Formats an option's inline treatment to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const inline = option.inline;
    if (inline !== undefined) {
      result.format(context[1], phrase, { alt: inline ? 1 : 0 });
    }
  },
  /**
   * Formats a help option's formats to be included in the description.
   * @ignore
   */
  (option, phrase, context, result) => {
    const keys = getKeys(option.formats ?? {});
    if (keys.length) {
      result.format(context[1], phrase, { open: '{', close: '}' }, keys);
    }
  },
] as const satisfies Record<HelpItem, HelpFunction>;

/**
 * Keep this in-sync with {@link HelpItem}.
 */
const fieldNames = [
  'synopsis',
  'separator',
  'paramCount',
  'positional',
  'append',
  'choices',
  'regex',
  'unique',
  'limit',
  'requires',
  'required',
  'default',
  'deprecated',
  'link',
  'stdin',
  'sources',
  'requiredIf',
  'cluster',
  'useNested',
  'useFormat',
  'useFilter',
  'inline',
  'formats',
] as const satisfies Record<HelpItem, keyof OpaqueOption>;

/**
 * The Markdown text elements.
 */
const markdown: [sep: string, open: string, close: string] = [' | ', '| ', ' |'];

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements formatting of help messages for a set of option definitions.
 */
abstract class BaseFormatter implements HelpFormatter {
  protected readonly context: HelpContext;

  /**
   * Creates a help message formatter.
   * @param options The option definitions
   * @param config The formatter configuration
   */
  constructor(options: OpaqueOptions, config: PartialFormatterConfig = {}) {
    this.context = [options, mergeValues(defaultConfig, config)];
  }

  /**
   * Formats the help message of an option group.
   * Options are rendered in the same order as was declared in the option definitions.
   * @param name The group name (defaults to the default group)
   * @returns The help message, if the group exists; otherwise an empty message
   */
  abstract format(name?: string): HelpMessage;

  /**
   * Formats a help message with sections.
   * Options are rendered in the same order as was declared in the option definitions.
   * @param sections The help sections
   * @param progName The program name, if any
   * @returns The formatted help message
   */
  abstract sections(sections: HelpSections, progName?: string): HelpMessage;
}

/**
 * Implements formatting of ANSI help messages for a set of option definitions.
 */
export class AnsiFormatter extends BaseFormatter {
  protected readonly groups: EntriesByGroup<AnsiHelpEntry>;

  constructor(options: OpaqueOptions, config?: PartialFormatterConfig) {
    super(options, config);
    this.groups = buildAnsiEntries(this.context);
  }

  override format(name = ''): AnsiMessage {
    return formatAnsiEntries(this.groups[name] ?? []);
  }

  override sections(sections: HelpSections, progName = ''): AnsiMessage {
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
export class JsonFormatter extends BaseFormatter {
  protected readonly groups: EntriesByGroup<object>;

  constructor(options: OpaqueOptions, config?: PartialFormatterConfig) {
    super(options, config);
    this.groups = buildEntries(this.context, (opt) => opt);
  }

  override format(name = ''): JsonMessage {
    return new JsonMessage(...(this.groups[name] ?? []));
  }

  override sections(sections: HelpSections): JsonMessage {
    const result = new JsonMessage();
    formatGroupsSections(this.groups, sections, (_, entries) => result.push(...entries));
    return result;
  }
}

/**
 * Implements formatting of CSV help messages for a set of option definitions.
 */
export class CsvFormatter extends BaseFormatter {
  protected readonly groups: EntriesByGroup<CsvHelpEntry>;
  protected readonly fields: ReadonlyArray<keyof OpaqueOption>;

  constructor(
    options: OpaqueOptions,
    config?: PartialFormatterConfig,
    additionalFields: ReadonlyArray<keyof OpaqueOption> = ['type', 'group', 'names'],
  ) {
    super(options, config);
    this.fields = [...additionalFields, ...this.context[1].items.map((item) => fieldNames[item])];
    this.groups = buildEntries(this.context, (opt) =>
      this.fields.map((field) => `${opt[field] ?? ''}`),
    );
  }

  override format(name = ''): TextMessage {
    const entries = this.groups[name];
    return formatCsvEntries(entries ? [this.fields, ...entries] : []);
  }

  override sections(sections: HelpSections): TextMessage {
    const result = new TextMessage(this.fields.join('\t')); // single heading row for all groups
    formatGroupsSections(this.groups, sections, (_, entries) => formatCsvEntries(entries, result));
    return result;
  }
}

/**
 * Implements formatting of Markdown help messages for a set of option definitions.
 */
export class MdFormatter extends CsvFormatter {
  private readonly header: [CsvHelpEntry, CsvHelpEntry];

  constructor(options: OpaqueOptions, config?: PartialFormatterConfig) {
    super(options, config, ['type', 'names']);
    this.header = [this.fields, this.fields.map((field) => '-'.repeat(field.length))];
  }

  override format(name = ''): TextMessage {
    const entries = this.groups[name];
    return formatCsvEntries(entries ? [...this.header, ...entries] : [], undefined, ...markdown);
  }

  override sections(sections: HelpSections): TextMessage {
    const result = new TextMessage();
    formatGroupsSections(this.groups, sections, (group, entries, section) => {
      if (result.length) {
        result.push(''); // line feed between tables
      }
      const title = group || section.title;
      if (title) {
        result.push('## ' + title, ''); // section before table
      }
      formatCsvEntries([...this.header, ...entries], result, ...markdown);
    });
    return result;
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Formats a list of help groups sections to be included in the help message.
 * @template T The type of the help entries
 * @param groups The option groups
 * @param sections The help sections
 * @param formatFn The formatting function
 */
function formatGroupsSections<T>(
  groups: EntriesByGroup<T>,
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
  groups: EntriesByGroup<T>,
  section: HelpGroups,
  formatFn: GroupsFunction<T>,
) {
  const { filter, exclude } = section;
  const allNames = getKeys(groups);
  const names = exclude ? allNames : (filter ?? allNames);
  const excludeNames = new Set(exclude && filter);
  for (const name of names) {
    if (name in groups && !excludeNames.has(name)) {
      formatFn(name, groups[name], section);
    }
  }
}

/**
 * Build the help entries for a help message.
 * @template T The type of the help entries
 * @param context The help context
 * @param buildFn The building function
 * @returns The option groups
 */
function buildEntries<T>(
  context: HelpContext,
  buildFn: (option: OpaqueOption) => T,
): EntriesByGroup<T> {
  /** @ignore */
  function exclude(option: OpaqueOption): 0 | boolean {
    return (
      regexp &&
      !option.names?.find((name) => name?.match(regexp)) &&
      !option.synopsis?.match(regexp) &&
      !option.sources?.find((name) => `${name}`.match(regexp))
    );
  }
  const [options, config] = context;
  const regexp =
    config.filter.length && RegExp(`(${config.filter.map(escapeRegExp).join('|')})`, 'i');
  const groups: Record<string, Array<T>> = {};
  for (const option of getValues(options)) {
    if (option.group !== null && !exclude(option)) {
      const entry = buildFn(option);
      const name = option.group ?? '';
      if (name in groups) {
        groups[name].push(entry);
      } else {
        groups[name] = [entry];
      }
    }
  }
  return groups;
}

/**
 * Build the help entries for a help message using the ANSI format.
 * @param context The help context
 * @returns The option groups
 */
function buildAnsiEntries(context: HelpContext): EntriesByGroup<AnsiHelpEntry> {
  let nameWidths = getNameWidths(context);
  let paramWidth = 0;
  const groups = buildEntries(context, (option): AnsiHelpEntry => {
    const names = formatNames(context, option, nameWidths);
    const [param, paramLen] = formatParams(context, option);
    const descr = formatDescription(context, option);
    paramWidth = max(paramWidth, paramLen);
    return [names, param, descr];
  });
  if (typeof nameWidths !== 'number') {
    nameWidths = nameWidths.length ? nameWidths.reduce((acc, len) => acc + len + 2, -2) : 0;
  }
  const { names, param, descr } = context[1];
  const namesIndent = max(0, names.indent);
  const paramIndent = param.absolute
    ? max(0, param.indent)
    : namesIndent + nameWidths + param.indent;
  const descrIndent = descr.absolute
    ? max(0, descr.indent)
    : paramIndent + paramWidth + descr.indent;
  const paramRight = param.align === 'right';
  const paramMerge = param.align === 'merge';
  const descrMerge = descr.align === 'merge';
  for (const [names, param, descr] of getValues(groups).flat()) {
    if (descrMerge) {
      param.other(descr);
      descr.pop(descr.count);
    } else {
      descr.indent = descrIndent;
    }
    if (paramMerge) {
      if (names.length) {
        names[names.length - 1].other(param);
        param.pop(param.count);
      } else {
        param.indent = namesIndent;
      }
    } else {
      param.indent = paramIndent + (paramRight ? paramWidth - param.indent : 0);
    }
  }
  return groups;
}

/**
 * Formats an option's names to be printed on the terminal.
 * @param context The help context
 * @param option The option definition
 * @param nameWidths The name slot widths
 * @returns The list of formatted strings, one for each name
 */
function formatNames(
  context: HelpContext,
  option: OpaqueOption,
  nameWidths: Array<number> | number,
): Array<TerminalString> {
  const [, config] = context;
  let { indent, breaks } = config.names;
  const { align, hidden } = config.names;
  if (hidden || !option.names) {
    return [];
  }
  const { styles, connectives } = config;
  const style = option.styles?.names ?? styles.symbol;
  const sep = connectives[ConnectiveWord.optionSep];
  const slotted = typeof nameWidths !== 'number';
  const result: Array<TerminalString> = [];
  const sepLen = sep.length + 1;
  let str: TerminalString | undefined;
  indent = max(0, indent);
  let len = 0;
  option.names.forEach((name, i) => {
    if (name !== null) {
      if (str) {
        str.close(sep);
        len += sepLen;
      }
      if (!str || slotted) {
        str = new TerminalString(indent, breaks, false, styles.text);
        result.push(str);
        breaks = 0; // break only on the first name
      }
      str.style = style;
      str.word(name);
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
 * Formats an option's parameter to be printed on the terminal.
 * @param context The help context
 * @param option The option definition
 * @returns [the formatted string, the string length]
 */
function formatParams(context: HelpContext, option: OpaqueOption): [TerminalString, number] {
  const [, config] = context;
  const { hidden, breaks } = config.param;
  const result = new TerminalString(0, breaks, false, config.styles.text);
  if (!hidden) {
    formatParam(option, config, result);
  }
  const len = result.lengths.reduce((acc, len) => acc + (len ? len + 1 : 0), -1);
  if (len < 0) {
    return [result.pop(result.count), 0]; // this string does not contain any word
  }
  result.indent = len; // hack: save the length, since we will need it in `adjustEntries`
  return [result, len];
}

/**
 * Formats an option's description to be printed on the terminal.
 * The description always ends with a single line break.
 * @param context The help context
 * @param option The option definition
 * @returns The formatted string
 */
function formatDescription(context: HelpContext, option: OpaqueOption): TerminalString {
  const [, config] = context;
  const { descr, items } = config;
  const { hidden, breaks, align } = descr;
  const style = option.styles?.descr ?? config.styles.text;
  const result = new TerminalString(0, breaks, align === 'right', style);
  const count = result.count;
  if (!hidden) {
    for (const item of items) {
      helpFunctions[item](option, config.phrases[item], context, result);
    }
  }
  return (result.count === count ? result.pop(count) : result.clear()).break();
}

/**
 * Gets the required width of option names in a set of option definitions.
 * @param context The help context
 * @returns The name slot widths, or the maximum combined width
 */
function getNameWidths(context: HelpContext): Array<number> | number {
  const [options, config] = context;
  const { hidden, align } = config.names;
  if (hidden) {
    return 0;
  }
  const sepLen = config.connectives[ConnectiveWord.optionSep].length + 1;
  const slotted = align === 'slot';
  const slotWidths: Array<number> = [];
  let maxWidth = 0;
  for (const option of getValues(options)) {
    const names = option.names;
    if (option.group !== null && names) {
      if (slotted) {
        names.forEach((name, i) => {
          slotWidths[i] = max(slotWidths[i] ?? 0, name?.length ?? 0);
        });
      } else {
        const len = names.reduce((acc, name) => acc + sepLen + (name?.length ?? -sepLen), -sepLen);
        maxWidth = max(maxWidth, len);
      }
    }
  }
  return slotted ? slotWidths : maxWidth;
}

/**
 * Formats a help message from a list of ANSI help entries.
 * @param entries The help entries
 * @param result The resulting message
 * @returns The resulting message
 */
function formatAnsiEntries(
  entries: ReadonlyArray<AnsiHelpEntry>,
  result = new AnsiMessage(),
): AnsiMessage {
  for (const [names, param, descr] of entries) {
    result.push(...names, param, descr);
  }
  return result;
}

/**
 * Formats a help message from a list of CSV help entries.
 * Sequences of whitespace are collapsed to a single space, and styles are removed.
 * @param entries The help entries
 * @param result The resulting message
 * @param itemSep The help item delimiter
 * @param openChar The character to begin a help entry
 * @param closeChar The character to end a help entry
 * @returns The resulting message
 */
function formatCsvEntries(
  entries: ReadonlyArray<CsvHelpEntry>,
  result = new TextMessage(),
  itemSep = '\t',
  openChar = '',
  closeChar = '',
): TextMessage {
  result.push(
    ...entries.map(
      (entry) =>
        openChar +
        entry.map((item) => item.replace(regex.ws, ' ').replace(regex.sgr, '')).join(itemSep) +
        closeChar,
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
  groups: EntriesByGroup<AnsiHelpEntry>,
  context: HelpContext,
  section: HelpSection,
  progName: string,
  result: AnsiMessage,
) {
  let breaks = section.breaks ?? (result.length ? 2 : 0);
  if (section.type === 'groups') {
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
  } else {
    const { title, noWrap, style: sty } = section;
    if (title) {
      result.push(formatText(title, sty ?? style(tf.bold), 0, breaks, noWrap));
      breaks = 2;
    }
    const textStyle = context[1].styles.text;
    if (section.type === 'usage') {
      let { indent } = section;
      if (progName) {
        result.push(formatText(progName, textStyle, indent, breaks, true));
        indent = max(0, indent ?? 0) + progName.length + 1;
        breaks = 0;
      }
      result.push(formatUsage(context, section, indent, breaks));
    } else {
      const { text, indent } = section;
      if (text) {
        result.push(formatText(text, textStyle, indent, breaks, noWrap));
      }
    }
  }
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
  const result = new TerminalString(indent, breaks, false, defStyle);
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
  const [options, msgConfig] = context;
  const result = new TerminalString(indent, breaks, false, msgConfig.styles.text);
  const { filter, exclude, required, requires, comment } = section;
  const visited = new Set<string>(exclude && filter);
  const requiredKeys = new Set(required);
  const requiredBy = requires && getRequiredBy(requires);
  const allKeys = getKeys(options);
  const keys = exclude ? allKeys : (filter?.filter((key) => key in options) ?? allKeys);
  const count = result.count;
  for (const key of keys) {
    formatUsageOption(context, key, result, visited, requiredKeys, requires, requiredBy);
  }
  if (comment) {
    result.split(comment);
  }
  return result.count === count ? result.pop(count) : result.clear();
}

/**
 * Formats an option to be included in the the usage text.
 * @param context The help context
 * @param key The option key
 * @param result The resulting string
 * @param visited The set of visited options
 * @param requiredKeys The list of options to consider always required
 * @param requires The map of option keys to required options
 * @param requiredBy The adjacency list
 * @param preOrderFn The formatting function to execute before rendering the option names
 * @returns True if the option is considered always required
 */
function formatUsageOption(
  context: HelpContext,
  key: string,
  result: TerminalString,
  visited: Set<string>,
  requiredKeys: Set<string>,
  requires?: Readonly<Record<string, string>>,
  requiredBy?: Readonly<Record<string, Array<string>>>,
  preOrderFn?: (requiredKey?: string) => void,
): boolean {
  /** @ignore */
  function format(receivedKey?: string, isLast = false): boolean {
    const count = result.count;
    // if the received key is my own key, then I'm the junction point in a circular dependency:
    // reset it so that remaining options in the chain can be considered optional
    preOrderFn?.(key === receivedKey ? undefined : receivedKey);
    formatUsageNames(context, option, result);
    formatParam(option, msgConfig, result);
    if (!required) {
      // process requiring options in my dependency group (if they have not already been visited)
      list?.forEach((key) => {
        if (formatUsageOption(context, key, result, visited, requiredKeys, requires, requiredBy)) {
          required = true; // update my status, since I'm required by an always required option
        }
      });
      // if I'm not always required and I'm the last option in a dependency chain, ignore the
      // received key, so I can be considered optional
      if (!required && (isLast || !receivedKey)) {
        result.open('[', count).close(']');
      }
    }
    return required;
  }
  let required = requiredKeys.has(key);
  if (visited.has(key)) {
    return required;
  }
  visited.add(key);
  const [options, msgConfig] = context;
  const option = options[key];
  if (!required && option.required) {
    required = true;
    requiredKeys.add(key);
  }
  const list = requiredBy?.[key];
  const requiredKey = requires?.[key];
  if (requiredKey) {
    if (required) {
      requiredKeys.add(requiredKey); // transitivity of always required options
    }
    // this check is needed, so we can fallback to the normal format call in the negative case
    if (!visited.has(requiredKey)) {
      return formatUsageOption(
        context,
        requiredKey,
        result,
        visited,
        requiredKeys,
        requires,
        requiredBy,
        format,
      );
    }
  }
  return format(requiredKey, true);
}

/**
 * Formats an option's names to be included in the usage text.
 * @param context The help context
 * @param option The option definition
 * @param result The resulting string
 */
function formatUsageNames(context: HelpContext, option: OpaqueOption, result: TerminalString) {
  const [, msgConfig] = context;
  const names = getOptionNames(option);
  if (names.length) {
    const count = result.count;
    const enclose = names.length > 1;
    const flags = {
      sep: msgConfig.connectives[ConnectiveWord.optionAlt],
      open: enclose ? msgConfig.connectives[ConnectiveWord.exprOpen] : '',
      close: enclose ? msgConfig.connectives[ConnectiveWord.exprClose] : '',
      mergeNext: true,
    };
    fmt.a(names.map(getSymbol), msgConfig, result, flags);
    if (option.positional) {
      result.open('[', count).close(']');
    }
  }
}

/**
 * Formats an option's parameter to be included in the description or the usage text.
 * @param option The option definition
 * @param config The message configuration
 * @param result The resulting string
 */
function formatParam(option: OpaqueOption, config: MessageConfig, result: TerminalString) {
  const [min, max] = getParamCount(option);
  const equals = option.inline ? '=' : '';
  const ellipsis = max > 1 && !equals ? '...' : '';
  if (equals) {
    result.merge = true;
  }
  let param;
  let example = option.example;
  if (example !== undefined) {
    const separator = option.separator;
    if (separator && isReadonlyArray(example)) {
      const sep = typeof separator === 'string' ? separator : separator.source;
      example = example.join(sep);
    }
    fmt.v(example, config, result.open(equals), { sep: '', open: '', close: '' });
    if (ellipsis) {
      param = ellipsis;
      result.merge = true;
    }
  } else {
    const type = option.type;
    if (type === 'command') {
      param = '...';
    } else if (max) {
      const param0 = option.paramName ?? 'param';
      const param1 = param0.includes('<') ? param0 : `<${param0}>`;
      const param2 = equals + param1 + ellipsis;
      param = min <= 0 ? `[${param2}]` : param2;
    }
  }
  if (param) {
    result.style = option.styles?.param ?? config.styles.value;
    result.word(param);
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
  /** @ignore */
  function custom1(item: Requires) {
    formatRequirements(context, item, result, negate);
  }
  /** @ignore */
  function custom2([key, value]: RequiresEntry) {
    formatRequiredValue(context, context[0][key], value, result, negate);
  }
  visitRequirements(
    requires,
    (req) => formatRequiredKey(context, req, result, negate),
    (req) => formatRequirements(context, req.item, result, !negate),
    (req) => formatRequiresExp(context, req.items, result, negate, true, custom1),
    (req) => formatRequiresExp(context, req.items, result, negate, false, custom1),
    (req) => formatRequiresExp(context, getEntries(req), result, negate, true, custom2),
    (req) => formatRequiresCallback(context, req, result, negate),
  );
}

/**
 * Formats a required option key to be included in the description.
 * Assumes that the options were validated.
 * @param context The help context
 * @param requiredKey The required option key
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequiredKey(
  context: HelpContext,
  requiredKey: string,
  result: TerminalString,
  negate: boolean,
) {
  const [options, config] = context;
  if (negate) {
    result.word(config.connectives[ConnectiveWord.no]);
  }
  const name = options[requiredKey].preferredName ?? '';
  fmt.m(getSymbol(name), config, result);
}

/**
 * Formats a requirement expression to be included in the description.
 * Assumes that the options were validated.
 * @param context The help context
 * @param items The expression items
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 * @param isAll True if the requirement is an "all" expression
 * @param custom The custom format callback
 */
function formatRequiresExp<T>(
  context: HelpContext,
  items: Array<T>,
  result: TerminalString,
  negate: boolean,
  isAll: boolean,
  custom: FormattingFlags['custom'],
) {
  const [, config] = context;
  const connectives = config.connectives;
  const enclose = items.length > 1;
  const flags = {
    open: enclose ? connectives[ConnectiveWord.exprOpen] : '',
    close: enclose ? connectives[ConnectiveWord.exprClose] : '',
  };
  const sep = isAll === negate ? connectives[ConnectiveWord.or] : connectives[ConnectiveWord.and];
  fmt.a(items, config, result, { ...flags, sep, custom, mergePrev: false });
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
  value: unknown,
  result: TerminalString,
  negate: boolean,
) {
  const [, config] = context;
  const connectives = config.connectives;
  const requireAbsent = value === null;
  const requirePresent = value === undefined;
  if ((requireAbsent && !negate) || (requirePresent && negate)) {
    result.word(connectives[ConnectiveWord.no]);
  }
  const name = option.preferredName ?? '';
  fmt.m(getSymbol(name), config, result);
  if (!requireAbsent && !requirePresent) {
    const connective = negate
      ? connectives[ConnectiveWord.notEquals]
      : connectives[ConnectiveWord.equals];
    result.word(connective);
    fmt.v(value, config, result, {});
  }
}

/**
 * Formats a requirement callback to be included in the description.
 * Assumes that the options were validated.
 * @param context The help context
 * @param callback The requirement callback
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequiresCallback(
  context: HelpContext,
  callback: RequiresCallback,
  result: TerminalString,
  negate: boolean,
) {
  const [, config] = context;
  if (negate) {
    result.word(config.connectives[ConnectiveWord.not]);
  }
  fmt.v(callback, config, result, {});
}
