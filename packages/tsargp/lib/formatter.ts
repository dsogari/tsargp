//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  HelpLayout,
  MessageConfig,
  PartialHelpLayout,
  PartialMessageConfig,
} from './config.js';
import type {
  HelpGroupsSection,
  HelpSection,
  HelpUsageSection,
  HelpSections,
  OpaqueOption,
  OpaqueOptions,
  Requires,
  RequiresCallback,
  RequiresEntry,
} from './options.js';
import type { FormattingFlags, Style } from './styles.js';

import { defaultHelpLayout, defaultMessageConfig } from './config.js';
import { ConnectiveWord, HelpItem, tf } from './enums.js';
import { fmt, style, AnsiString, AnsiMessage } from './styles.js';
import { getParamCount, getOptionNames, visitRequirements } from './options.js';
import {
  mergeValues,
  getSymbol,
  isReadonlyArray,
  getKeys,
  escapeRegExp,
  getValues,
  max,
  getEntries,
  getRequiredBy,
} from './utils.js';

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * Precomputed texts used by the help formatter.
 */
type HelpEntry = [names: ReadonlyArray<AnsiString>, param: AnsiString, descr: AnsiString];

/**
 * Information about the current help message.
 */
type HelpContext = [options: OpaqueOptions, config: MessageConfig, layout: HelpLayout];

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
  result: AnsiString,
) => void;

/**
 * A function to format a help groups section.
 * @template T The type of the help entry
 */
type GroupsFunction<T> = (
  group: string,
  entries: ReadonlyArray<T>,
  section: HelpGroupsSection,
) => void;

/**
 * A map of option groups to help entries.
 * @template T The type of the help entry
 */
type EntriesByGroup<T> = Readonly<Record<string, ReadonlyArray<T>>>;

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
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
      result.format(context[1], phrase, {}, new AnsiString().split(desc));
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
      result.format(context[1], phrase, {}, new AnsiString().split(deprecated));
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
   * Formats a help option's useCommand to be included in the description.
   * @ignore
   */
  (option, phrase, _, result) => {
    if (option.useCommand) {
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
] as const satisfies Record<HelpItem, HelpFunction>;

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements formatting of help messages for a set of option definitions.
 */
export class HelpFormatter {
  protected readonly context: HelpContext;
  protected readonly groups: EntriesByGroup<HelpEntry>;

  /**
   * Creates a help message formatter.
   * @param options The option definitions
   * @param config The message configuration
   * @param layout The help layout
   * @param filter The option filter
   */
  constructor(
    options: OpaqueOptions,
    config: PartialMessageConfig = {},
    layout: PartialHelpLayout = {},
    filter: ReadonlyArray<string> = [],
  ) {
    this.context = [
      options,
      mergeValues(defaultMessageConfig, config),
      mergeValues(defaultHelpLayout, layout),
    ];
    this.groups = buildHelpEntries(this.context, filter);
  }

  /**
   * Formats the help message of an option group.
   * Options are rendered in the same order as was declared in the option definitions.
   * @param name The group name (defaults to the default group)
   * @returns The help message, if the group exists; otherwise an empty message
   */
  format(name = ''): AnsiMessage {
    return formatHelpEntries(this.groups[name] ?? []);
  }

  /**
   * Formats a help message with sections.
   * Options are rendered in the same order as was declared in the option definitions.
   * @param sections The help sections
   * @param progName The program name, if any
   * @returns The formatted help message
   */
  sections(sections: HelpSections, progName = ''): AnsiMessage {
    const help = new AnsiMessage();
    for (const section of sections) {
      formatHelpSection(this.groups, this.context, section, progName, help);
    }
    return help;
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Formats a help groups section to be included in the help message.
 * @template T The type of the help entries
 * @param groups The option groups
 * @param section The help section
 * @param formatFn The formatting function
 */
function formatGroups<T>(
  groups: EntriesByGroup<T>,
  section: HelpGroupsSection,
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
 * @param filter The option filter
 * @param buildFn The building function
 * @returns The option groups
 */
function buildEntries<T>(
  context: HelpContext,
  filter: ReadonlyArray<string>,
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
  const regexp = filter.length && RegExp(`(${filter.map(escapeRegExp).join('|')})`, 'i');
  const groups: Record<string, Array<T>> = {};
  for (const option of getValues(context[0])) {
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
 * Build the help entries for a help message.
 * @param context The help context
 * @param filter The option filter
 * @returns The option groups
 */
function buildHelpEntries(
  context: HelpContext,
  filter: ReadonlyArray<string>,
): EntriesByGroup<HelpEntry> {
  /** @ignore */
  function getNextIndent(column: HelpLayout['param'], prevIndent: number): number {
    return column.absolute && !column.hidden
      ? max(0, column.indent)
      : prevIndent + (column.hidden ? 0 : column.indent);
  }
  let nameWidths = getNameWidths(context);
  let paramWidth = 0;
  const groups = buildEntries(context, filter, (option): HelpEntry => {
    const names = formatNames(context, option, nameWidths);
    const [param, paramLen] = formatParams(context, option);
    const descr = formatDescription(context, option);
    paramWidth = max(paramWidth, paramLen);
    return [names, param, descr];
  });
  if (typeof nameWidths !== 'number') {
    nameWidths = nameWidths.length ? nameWidths.reduce((acc, len) => acc + len + 2, -2) : 0;
  }
  const { names, param, descr } = context[2];
  const namesIndent = names.hidden ? 0 : max(0, names.indent);
  const paramIndent = getNextIndent(param, namesIndent + nameWidths);
  const descrIndent = getNextIndent(descr, paramIndent + paramWidth);
  const paramRight = param.align === 'right';
  const paramMerge = param.align === 'merge' || param.hidden;
  const descrMerge = descr.align === 'merge' || descr.hidden;
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
): Array<AnsiString> {
  const [, config, layout] = context;
  let { indent, breaks } = layout.names;
  const { align, hidden } = layout.names;
  if (hidden || !option.names) {
    return [];
  }
  const { styles, connectives } = config;
  const style = option.styles?.names ?? styles.symbol;
  const sep = connectives[ConnectiveWord.optionSep];
  const slotted = typeof nameWidths !== 'number';
  const result: Array<AnsiString> = [];
  const sepLen = sep.length + 1;
  let str: AnsiString | undefined;
  indent = max(0, indent);
  let len = 0;
  option.names.forEach((name, i) => {
    if (name !== null) {
      if (str) {
        str.close(sep);
        len += sepLen;
      }
      if (!str || slotted) {
        str = new AnsiString(indent, breaks, false, styles.text);
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
function formatParams(context: HelpContext, option: OpaqueOption): [AnsiString, number] {
  const [, config, layout] = context;
  const { hidden, breaks } = layout.param;
  const result = new AnsiString(0, breaks, false, config.styles.text);
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
function formatDescription(context: HelpContext, option: OpaqueOption): AnsiString {
  const [, config, layout] = context;
  const { descr, items } = layout;
  const { hidden, breaks, align } = descr;
  const style = option.styles?.descr ?? config.styles.text;
  const result = new AnsiString(0, breaks, align === 'right', style);
  const count = result.count;
  if (!hidden) {
    for (const item of items) {
      helpFunctions[item](option, config.helpPhrases[item], context, result);
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
  const [options, config, layout] = context;
  const { hidden, align } = layout.names;
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
 * Formats a help message from a list of help entries.
 * @param entries The help entries
 * @param result The resulting message
 * @returns The resulting message
 */
function formatHelpEntries(
  entries: ReadonlyArray<HelpEntry>,
  result = new AnsiMessage(),
): AnsiMessage {
  for (const [names, param, descr] of entries) {
    result.push(...names, param, descr);
  }
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
function formatHelpSection(
  groups: EntriesByGroup<HelpEntry>,
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
        : new AnsiString(0, breaks);
      result.push(heading);
      formatHelpEntries(entries, result);
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
 * @returns The ANSI string
 */
function formatText(
  text: string,
  defStyle: Style,
  indent?: number,
  breaks?: number,
  noWrap = false,
): AnsiString {
  const result = new AnsiString(indent, breaks, false, defStyle);
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
 * @returns The ANSI string
 */
function formatUsage(
  context: HelpContext,
  section: HelpUsageSection,
  indent?: number,
  breaks?: number,
): AnsiString {
  const [options, config] = context;
  const result = new AnsiString(indent, breaks, false, config.styles.text);
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
  result: AnsiString,
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
    formatParam(option, config, result);
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
  const [options, config] = context;
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
function formatUsageNames(context: HelpContext, option: OpaqueOption, result: AnsiString) {
  const [, config] = context;
  const names = getOptionNames(option);
  if (names.length) {
    const count = result.count;
    const enclose = names.length > 1;
    const flags = {
      sep: config.connectives[ConnectiveWord.optionAlt],
      open: enclose ? config.connectives[ConnectiveWord.exprOpen] : '',
      close: enclose ? config.connectives[ConnectiveWord.exprClose] : '',
      mergeNext: true,
    };
    fmt.a(names.map(getSymbol), config, result, flags);
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
function formatParam(option: OpaqueOption, config: MessageConfig, result: AnsiString) {
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
  result: AnsiString,
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
  result: AnsiString,
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
  result: AnsiString,
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
  result: AnsiString,
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
  result: AnsiString,
  negate: boolean,
) {
  const [, config] = context;
  if (negate) {
    result.word(config.connectives[ConnectiveWord.not]);
  }
  fmt.v(callback, config, result, {});
}
