//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  HelpColumnsLayout,
  WithColumnLayout,
  HelpSection,
  HelpUsageSection,
  HelpSections,
  OpaqueOption,
  OpaqueOptions,
  Requires,
  RequirementCallback,
  RequiresEntry,
} from './options.js';
import type { FormattingFlags, Style } from './styles.js';

import { config } from './config.js';
import { HelpItem, tf } from './enums.js';
import { fmt, style, AnsiString, AnsiMessage } from './styles.js';
import { getParamCount, getOptionNames, visitRequirements, isCommand } from './options.js';
import {
  getSymbol,
  isArray,
  getValues,
  max,
  getEntries,
  getRequiredBy,
  isString,
  mergeValues,
} from './utils.js';

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * The precomputed strings used by the formatter.
 */
type HelpEntry = [
  /**
   * The list of formatted option names.
   */
  names: ReadonlyArray<AnsiString>,
  /**
   * The formatted option parameter.
   */
  param: AnsiString,
  /**
   * The formatted option description.
   */
  descr: AnsiString,
];

/**
 * A function to format a help item.
 * @param option The option definition
 * @param phrase The help item phrase
 * @param options The option definitions
 * @param result The resulting string
 */
type HelpFunction = (
  option: OpaqueOption,
  phrase: string,
  options: OpaqueOptions,
  result: AnsiString,
) => void;

/**
 * A map of option groups to help entries.
 */
type EntriesByGroup = Readonly<Record<string, ReadonlyArray<HelpEntry>>>;

/**
 * A set of formatting functions for {@link HelpItem}.
 */
type HelpFunctions = Readonly<Record<HelpItem, HelpFunction>>;

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The default help column layout.
 */
const defaultColumnLayout: WithColumnLayout = {
  align: 'left',
  indent: 2,
  breaks: 0,
  hidden: false,
};

/**
 * The complete list of help items.
 */
export const allHelpItems: ReadonlyArray<HelpItem> = Array(HelpItem._count)
  .fill(0)
  .map((_, index) => HelpItem.synopsis + index);

/**
 * The list of help items that are useful for help messages with environment variables only.
 */
export const envHelpItems: ReadonlyArray<HelpItem> = [
  HelpItem.synopsis,
  HelpItem.separator,
  HelpItem.choices,
  HelpItem.regex,
  HelpItem.unique,
  HelpItem.limit,
  HelpItem.required,
  HelpItem.default,
  HelpItem.deprecated,
  HelpItem.link,
];

/**
 * The default help layout.
 */
const defaultLayout: HelpColumnsLayout = {
  names: defaultColumnLayout,
  param: { ...defaultColumnLayout, absolute: false },
  descr: { ...defaultColumnLayout, absolute: false },
};

/**
 * The default help sections.
 */
const defaultSections: HelpSections = [{ type: 'groups' }];

/**
 * The formatting functions for {@link HelpItem}.
 */
const helpFunctions: HelpFunctions = {
  [HelpItem.synopsis]: (option, phrase, _options, result) => {
    const { synopsis } = option;
    if (synopsis) {
      result.format(phrase, {}, new AnsiString().split(synopsis));
    }
  },
  [HelpItem.separator]: (option, phrase, _options, result) => {
    const { separator } = option;
    if (separator) {
      result.format(phrase, {}, separator);
    }
  },
  [HelpItem.paramCount]: (option, phrase, _options, result) => {
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
      const sep = config.connectives.and;
      result.format(phrase, { alt, sep, open: '', close: '', mergePrev: false }, val);
    }
  },
  [HelpItem.positional]: (option, phrase, _options, result) => {
    const { positional } = option;
    if (positional) {
      const [alt, name] = positional === true ? [0] : [1, getSymbol(positional)];
      result.format(phrase, { alt }, name);
    }
  },
  [HelpItem.append]: (option, phrase, _options, result) => {
    if (option.append) {
      result.split(phrase);
    }
  },
  [HelpItem.choices]: (option, phrase, _options, result) => {
    const { choices } = option;
    if (choices?.length) {
      result.format(phrase, { open: '{', close: '}' }, choices);
    }
  },
  [HelpItem.regex]: (option, phrase, _options, result) => {
    const { regex } = option;
    if (regex) {
      result.format(phrase, {}, regex);
    }
  },
  [HelpItem.unique]: (option, phrase, _options, result) => {
    if (option.unique) {
      result.split(phrase);
    }
  },
  [HelpItem.limit]: (option, phrase, _options, result) => {
    const { limit } = option;
    if (limit !== undefined) {
      result.format(phrase, {}, limit);
    }
  },
  [HelpItem.requires]: (option, phrase, options, result) => {
    const { requires } = option;
    if (requires) {
      result.split(phrase, () => formatRequirements(options, requires, result));
    }
  },
  [HelpItem.required]: (option, phrase, _options, result) => {
    if (option.required) {
      result.split(phrase);
    }
  },
  [HelpItem.default]: (option, phrase, _options, result) => {
    const def = option.default;
    if (def !== undefined) {
      result.format(phrase, {}, def);
    }
  },
  [HelpItem.deprecated]: (option, phrase, _options, result) => {
    const { deprecated } = option;
    if (deprecated) {
      result.format(phrase, {}, new AnsiString().split(deprecated));
    }
  },
  [HelpItem.link]: (option, phrase, _options, result) => {
    const { link } = option;
    if (link) {
      result.format(phrase, {}, link);
    }
  },
  [HelpItem.stdin]: (option, phrase, _options, result) => {
    if (option.stdin) {
      result.split(phrase);
    }
  },
  [HelpItem.sources]: (option, phrase, _options, result) => {
    const { sources } = option;
    if (sources?.length) {
      const values = sources.map((name) => (isString(name) ? getSymbol(name) : name));
      result.format(phrase, { open: '', close: '' }, values);
    }
  },
  [HelpItem.requiredIf]: (option, phrase, options, result) => {
    const requiredIf = option.requiredIf;
    if (requiredIf) {
      result.split(phrase, () => formatRequirements(options, requiredIf, result));
    }
  },
  [HelpItem.cluster]: (option, phrase, _options, result) => {
    const { cluster } = option;
    if (cluster) {
      result.format(phrase, {}, cluster);
    }
  },
  [HelpItem.useCommand]: (option, phrase, _options, result) => {
    if (option.useCommand) {
      result.split(phrase);
    }
  },
  [HelpItem.useFilter]: (option, phrase, _options, result) => {
    if (option.useFilter) {
      result.split(phrase);
    }
  },
  [HelpItem.inline]: (option, phrase, _options, result) => {
    const { inline } = option;
    if (inline !== undefined) {
      result.format(phrase, { alt: inline ? 1 : 0 });
    }
  },
  [HelpItem._count]: () => {},
};

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Formats a help message with sections.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param options The option definitions (should be validated first)
 * @param sections The help sections
 * @param filter The option filter
 * @param progName The program name, if any
 * @returns The formatted help message
 */
export function format(
  options: OpaqueOptions,
  sections: HelpSections = defaultSections,
  filter: ReadonlyArray<string> = [],
  progName: string = '',
): AnsiMessage {
  const keys = filterOptions(options, filter);
  const help = new AnsiMessage();
  for (const section of sections) {
    formatHelpSection(options, section, keys, progName, help);
  }
  return help;
}

/**
 * Filter the options.
 * @param options The option definitions
 * @param filter The option filter
 * @returns The filtered option keys
 */
function filterOptions(options: OpaqueOptions, filter: ReadonlyArray<string>): Array<string> {
  /** @ignore */
  function matches(str: string): boolean {
    str = str.toLowerCase();
    return filter.findIndex((pattern) => str.includes(pattern)) >= 0;
  }
  /** @ignore */
  function exclude(option: OpaqueOption): 0 | boolean {
    const { names, synopsis, sources } = option;
    return (
      filter.length && // has at least one pattern
      !(synopsis && matches(synopsis)) &&
      !names?.find((name) => name && matches(name)) &&
      !sources?.find((name) => isString(name) && matches(name))
    );
  }
  filter = filter.map((pattern) => pattern.toLowerCase());
  const keys: Array<string> = [];
  for (const [key, option] of getEntries(options)) {
    if (option.group !== null && !exclude(option)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Build the help entries for a help message.
 * @param options The option definitions
 * @param keys The filtered option keys
 * @param groupFilter The option group filter
 * @param exclude True if the filter should exclude
 * @param buildFn The building function
 * @returns The option groups
 */
function buildGroups(
  options: OpaqueOptions,
  keys: ReadonlyArray<string>,
  groupFilter: ReadonlyArray<string>,
  exclude: boolean,
  buildFn: (option: OpaqueOption) => HelpEntry | undefined,
): EntriesByGroup {
  const groups: Record<string, Array<HelpEntry>> = {};
  const names = new Set(getValues(options).map((opt) => opt.group ?? ''));
  groupFilter.forEach(
    exclude
      ? (name) => names.delete(name)
      : (name) => (names.has(name) ? (groups[name] = []) : void 0),
  );
  if (!groupFilter.length || exclude) {
    names.forEach((name) => (groups[name] = []));
  }
  for (const key of keys) {
    const option = options[key];
    const name = option.group ?? '';
    if (name in groups) {
      const entry = buildFn(option);
      if (entry) {
        groups[name].push(entry);
      }
    }
  }
  return groups;
}

/**
 * Build the help entries for a help message.
 * @param options The option definitions
 * @param layout The help layout
 * @param keys The filtered option keys
 * @param items The help items
 * @param groupFilter The option group filter
 * @param exclude True if the filter should exclude
 * @param useEnv Whether option names should be replaced by environment variable names
 * @returns The option groups
 */
function buildEntries(
  options: OpaqueOptions,
  layout: HelpColumnsLayout,
  keys: ReadonlyArray<string>,
  items: ReadonlyArray<HelpItem> = allHelpItems,
  groupFilter: ReadonlyArray<string> = [],
  exclude: boolean = false,
  useEnv: boolean = false,
): EntriesByGroup {
  const { optionSep } = config.connectives;
  const slotWidths: Array<number> = [];
  const nameWidths: Array<number> = [];
  let namesWidth = 0;
  let paramWidth = 0;
  let mergedWidth = 0;
  const groups = buildGroups(options, keys, groupFilter, exclude, (option) => {
    const names = formatNames(layout, option, useEnv);
    if (useEnv && !names.length) {
      return undefined;
    }
    const param = formatParams(layout, option);
    const descr = formatDescription(options, layout, items, option);
    const paramLen = param.totalLen;
    param.indent = paramLen; // TODO: save the length, since we will need it in `adjustEntries`
    let prev: AnsiString | undefined;
    let namesLen = 0;
    names.forEach((str, i) => {
      const nameLen = str.totalLen;
      if (nameLen) {
        if (prev) {
          prev.close(optionSep);
          prev.indent += optionSep.length + 1;
          namesLen += optionSep.length + 1;
        }
        prev = str;
      }
      const inc = i < names.length - 1 ? optionSep.length + 1 : 0;
      slotWidths[i] = max(slotWidths[i] ?? 0, nameLen + inc);
      str.indent = nameLen; // TODO: save the length, since we will need it in `adjustEntries`
      namesLen += nameLen;
    });
    nameWidths.push(namesLen);
    namesWidth = max(namesWidth, namesLen);
    paramWidth = max(paramWidth, paramLen);
    mergedWidth = max(
      mergedWidth,
      namesLen + paramLen + (namesLen && paramLen && !param.mergeLeft ? 1 : 0),
    );
    return [names, param, descr];
  });
  adjustEntries(layout, groups, slotWidths, nameWidths, namesWidth, paramWidth, mergedWidth);
  return groups;
}

/**
 * Adjust the help entries for a help message.
 * @param layout The help layout
 * @param groups The option groups
 * @param slotWidths The widths of the name slots
 * @param nameWidths The widths of the names column for each entry
 * @param namesWidth The width of the names column
 * @param paramWidth The width of the parameter column
 * @param mergedWidth The width of the names and parameter columns merged
 */
function adjustEntries(
  layout: HelpColumnsLayout,
  groups: EntriesByGroup,
  slotWidths: ReadonlyArray<number>,
  nameWidths: ReadonlyArray<number>,
  namesWidth: number,
  paramWidth: number,
  mergedWidth: number,
) {
  /** @ignore */
  function getStart(column: HelpColumnsLayout['param'], prevEnd: number): number {
    return column.absolute && !column.hidden
      ? max(0, column.indent)
      : prevEnd + (column.hidden ? 0 : column.indent);
  }
  const { names, param, descr } = layout;
  const namesSlotted = names.align === 'slot';
  const namesRight = names.align === 'right';
  const paramRight = param.align === 'right';
  const paramMerge = param.align === 'merge';
  const descrMerge = descr.align === 'merge';
  const paramHidden = param.hidden;
  const namesStart = names.hidden ? 0 : max(0, names.indent);
  const namesEnd = namesStart + namesWidth;
  const paramStart = getStart(param, namesEnd);
  const paramEnd = paramStart + paramWidth;
  const descrStart = getStart(descr, paramMerge ? namesStart + mergedWidth : paramEnd);
  let j = 0;
  for (const [names, param, descr] of getValues(groups).flat()) {
    const width = nameWidths[j++];
    let indent = namesRight ? namesEnd - width : namesStart;
    names.forEach((str, i) => {
      const saved = str.indent; // TODO: fix length hack
      str.indent = indent;
      indent += namesSlotted && !paramMerge ? slotWidths[i] : saved;
    });
    if (descrMerge) {
      param.other(descr);
      descr.clear();
    } else {
      descr.indent = descrStart;
    }
    if ((paramMerge || paramHidden) && names.length) {
      names.at(-1)?.other(param);
      param.clear();
    } else {
      param.indent = paramMerge
        ? namesRight
          ? namesEnd + 1
          : namesStart
        : paramRight
          ? paramEnd - param.indent // TODO: fix length hack
          : paramStart;
    }
  }
}

/**
 * Formats an option's names to be printed on the terminal.
 * This does not include the positional marker.
 * @param layout The help layout
 * @param option The option definition
 * @param useEnv Whether option names should be replaced by environment variable names
 * @returns The list of formatted strings, one for each name
 */
function formatNames(
  layout: HelpColumnsLayout,
  option: OpaqueOption,
  useEnv: boolean,
): Array<AnsiString> {
  const { breaks, hidden } = layout.names;
  const names = useEnv ? option.sources?.filter(isString) : option.names;
  if (hidden || !names?.length) {
    return [];
  }
  const defSty = config.styles.text;
  const sty = option.styles?.names ?? config.styles.symbol;
  const result: Array<AnsiString> = [];
  let str: AnsiString | undefined;
  names.forEach((name) => {
    if (name) {
      str = new AnsiString(0, str ? 0 : breaks, false, defSty);
      result.push(str.word(name, sty));
    } else {
      result.push(new AnsiString());
    }
  });
  return result;
}

/**
 * Formats an option's parameter to be printed on the terminal.
 * @param layout The help layout
 * @param option The option definition
 * @returns The formatted string
 */
function formatParams(layout: HelpColumnsLayout, option: OpaqueOption): AnsiString {
  const { hidden, breaks } = layout.param;
  const defSty = option.styles?.param ?? config.styles.value;
  const result = new AnsiString(0, breaks, false, defSty);
  const count = result.count;
  if (!hidden) {
    const names = getOptionNames(option);
    formatParam(option, names, result);
  }
  return result.count === count ? result.clear() : result;
}

/**
 * Formats an option's description to be printed on the terminal.
 * The description always ends with a single line break.
 * @param options The option definitions
 * @param layout The help layout
 * @param items The help items
 * @param option The option definition
 * @returns The formatted string
 */
function formatDescription(
  options: OpaqueOptions,
  layout: HelpColumnsLayout,
  items: ReadonlyArray<HelpItem>,
  option: OpaqueOption,
): AnsiString {
  const { hidden, breaks, align } = layout.descr;
  const defSty = option.styles?.descr ?? config.styles.text;
  const result = new AnsiString(0, breaks, align === 'right', defSty);
  const count = result.count;
  if (!hidden) {
    for (const item of items) {
      helpFunctions[item](option, config.helpPhrases[item], options, result);
    }
  }
  return (result.count === count ? result.clear() : result).break();
}

/**
 * Formats a help section to be included in the full help message.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param options The option definitions
 * @param section The help section
 * @param keys The filtered option keys
 * @param progName The program name
 * @param result The resulting message
 */
function formatHelpSection(
  options: OpaqueOptions,
  section: HelpSection,
  keys: ReadonlyArray<string>,
  progName: string,
  result: AnsiMessage,
) {
  const { type, title, breaks, noWrap, style: sty } = section;
  let curBreaks = breaks ?? (result.length ? 1 : 0); // to account for the first section
  if (type === 'groups') {
    const { layout, filter, exclude, items, useEnv } = section;
    const headingStyle = sty ?? style(tf.bold);
    const mergedLayout = mergeValues(defaultLayout, layout ?? {});
    const groups = buildEntries(options, mergedLayout, keys, items, filter, exclude, useEnv);
    for (const [name, entries] of getEntries(groups)) {
      const title2 = name || title;
      const heading = title2
        ? formatText(title2, headingStyle, 0, curBreaks, noWrap).break(2)
        : new AnsiString(0, curBreaks);
      result.push(heading);
      for (const [names, param, descr] of entries) {
        result.push(...names, param, descr);
      }
      curBreaks = 1; // to account for the last option description
    }
  } else {
    if (title) {
      result.push(formatText(title, sty ?? style(tf.bold), 0, curBreaks, noWrap).break());
      curBreaks = 1; // to account for the space between title and content
    }
    const textStyle = config.styles.text;
    if (type === 'usage') {
      const count = result.length;
      let { indent } = section;
      if (progName) {
        result.push(formatText(progName, textStyle, indent, curBreaks, true));
        indent = max(0, indent ?? 0) + progName.length + 1;
        curBreaks = 0; // to avoid breaking between program name and usage text
      }
      const str = formatUsage(keys, options, section, indent, curBreaks);
      if (str.count) {
        result.push(str.break());
      } else {
        result.length = count; // skip usage if there are no options
      }
    } else {
      const { text, indent } = section;
      if (text) {
        result.push(formatText(text, textStyle, indent, curBreaks, noWrap).break());
      }
    }
  }
}

/**
 * Formats a custom text to be included in a help section.
 * @param text The heading title or section text
 * @param defSty The default style
 * @param indent The indentation level (negative values are replaced by zero)
 * @param breaks The number of line breaks (non-positive values are ignored)
 * @param noWrap True if the provided text should not be split
 * @returns The ANSI string
 */
function formatText(
  text: string,
  defSty: Style,
  indent?: number,
  breaks?: number,
  noWrap: boolean = false,
): AnsiString {
  const result = new AnsiString(indent, breaks, false, defSty);
  if (noWrap) {
    result.word(text); // warning: may be larger than the terminal width
  } else {
    result.split(text);
  }
  return result;
}

/**
 * Formats a usage text to be included in a help section.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param allKeys The filtered option keys
 * @param options The option definitions
 * @param section The help section
 * @param indent The indentation level (negative values are replaced by zero)
 * @param breaks The number of line breaks (non-positive values are ignored)
 * @returns The ANSI string
 */
function formatUsage(
  allKeys: ReadonlyArray<string>,
  options: OpaqueOptions,
  section: HelpUsageSection,
  indent?: number,
  breaks?: number,
): AnsiString {
  const result = new AnsiString(indent, breaks, false, config.styles.text);
  const { filter, exclude, required, requires, comment } = section;
  const visited = new Set<string>(exclude && filter);
  const requiredKeys = new Set(required);
  const requiredBy = requires && getRequiredBy(requires);
  const keys = exclude || !filter ? allKeys : filter.filter((key) => allKeys.includes(key));
  const count = result.count;
  for (const key of keys) {
    formatUsageOption(options, key, result, visited, requiredKeys, requires, requiredBy);
  }
  return result.count === count ? result.clear() : comment ? result.split(comment) : result;
}

/**
 * Formats an option to be included in the the usage text.
 * @param options The option definitions
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
  options: OpaqueOptions,
  key: string,
  result: AnsiString,
  visited: Set<string>,
  requiredKeys: Set<string>,
  requires?: Readonly<Record<string, string>>,
  requiredBy?: Readonly<Record<string, Array<string>>>,
  preOrderFn?: (requiredKey?: string) => void,
): boolean {
  /** @ignore */
  function format(receivedKey?: string, isLast: boolean = false): boolean {
    const count = result.count;
    const names = getOptionNames(option);
    // if the received key is my own key, then I'm the junction point in a circular dependency:
    // reset it so that remaining options in the chain can be considered optional
    preOrderFn?.(key === receivedKey ? undefined : receivedKey);
    formatUsageNames(option, names, result);
    const defSty = option.styles?.param ?? config.styles.value;
    const param = new AnsiString(0, 0, false, defSty);
    formatParam(option, names, param);
    result.other(param).close('', result.defSty);
    if (!required) {
      // process requiring options in my dependency group (if they have not already been visited)
      list?.forEach((key) => {
        if (formatUsageOption(options, key, result, visited, requiredKeys, requires, requiredBy)) {
          required = true; // update my status, since I'm required by an always required option
        }
      });
      // if I'm not always required and I'm the last option in a dependency chain, ignore the
      // received key, so I can be considered optional
      if (!required && (isLast || !receivedKey)) {
        result.openAtPos('[', count).close(']');
      }
    }
    return required;
  }
  let required = requiredKeys.has(key);
  if (visited.has(key)) {
    return required;
  }
  visited.add(key);
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
        options,
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
 * @param option The option definition
 * @param names The valid option names
 * @param result The resulting string
 */
function formatUsageNames(option: OpaqueOption, names: ReadonlyArray<string>, result: AnsiString) {
  if (names.length) {
    const count = result.count;
    const enclose = names.length > 1;
    const flags = {
      sep: config.connectives.optionAlt,
      open: enclose ? config.connectives.exprOpen : '',
      close: enclose ? config.connectives.exprClose : '',
      mergeNext: true,
    };
    fmt.a(names.map(getSymbol), result, flags);
    if (option.positional) {
      result.openAtPos('[', count).close(']');
    }
  }
}

/**
 * Formats an option's parameter to be included in the description or the usage text.
 * @param option The option definition
 * @param names The valid option names
 * @param result The resulting string
 */
function formatParam(option: OpaqueOption, names: ReadonlyArray<string>, result: AnsiString) {
  const { type, inline, example, separator, positional, paramName } = option;
  const [min, max] = getParamCount(option);
  const optional = !min && max && !(positional && !names.length);
  const ellipsis =
    isCommand(type) || (!max && type === 'function') || (max > 1 && !inline) ? '...' : '';
  if (inline) {
    result.merge = true; // to merge with names column, if required
  }
  result.open(optional ? '[' : '').open(inline ? '=' : '');
  if (example !== undefined) {
    let param = example;
    if (separator && isArray(param)) {
      const sep = isString(separator) ? separator : separator.source;
      param = param.join(sep);
    }
    fmt.v(param, result, { sep: '', open: '', close: '' });
    result.close(ellipsis);
  } else {
    const param = !max ? '' : paramName?.includes('<') ? paramName : `<${paramName || 'param'}>`;
    result.word(param + ellipsis);
  }
  result.close(optional ? ']' : '');
}

/**
 * Recursively formats an option's requirements to be included in the description.
 * Assumes that the options were validated.
 * @param options The option definitions
 * @param requires The option requirements
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequirements(
  options: OpaqueOptions,
  requires: Requires,
  result: AnsiString,
  negate: boolean = false,
) {
  /** @ignore */
  function custom1(item: Requires) {
    formatRequirements(options, item, result, negate);
  }
  /** @ignore */
  function custom2([key, value]: RequiresEntry) {
    formatRequiredValue(options[key], value, result, negate);
  }
  visitRequirements(
    requires,
    (req) => formatRequiredKey(options, req, result, negate),
    (req) => formatRequirements(options, req.item, result, !negate),
    (req) => formatRequiresExp(req.items, result, negate, true, custom1),
    (req) => formatRequiresExp(req.items, result, negate, false, custom1),
    (req) => formatRequiresExp(getEntries(req), result, negate, true, custom2),
    (req) => formatRequirementCallback(req, result, negate),
  );
}

/**
 * Formats a required option key to be included in the description.
 * Assumes that the options were validated.
 * @param options The option definitions
 * @param requiredKey The required option key
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequiredKey(
  options: OpaqueOptions,
  requiredKey: string,
  result: AnsiString,
  negate: boolean,
) {
  if (negate) {
    result.word(config.connectives.no);
  }
  const name = options[requiredKey].preferredName ?? '';
  fmt.m(getSymbol(name), result, {});
}

/**
 * Formats a requirement expression to be included in the description.
 * Assumes that the options were validated.
 * @template T The type of requirement item
 * @param items The expression items
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 * @param isAll True if the requirement is an "all" expression
 * @param custom The custom format callback
 */
function formatRequiresExp<T>(
  items: Array<T>,
  result: AnsiString,
  negate: boolean,
  isAll: boolean,
  custom: FormattingFlags['custom'],
) {
  const { connectives } = config;
  const enclose = items.length > 1;
  const flags = {
    open: enclose ? connectives.exprOpen : '',
    close: enclose ? connectives.exprClose : '',
  };
  const sep = isAll === negate ? connectives.or : connectives.and;
  fmt.a(items, result, { ...flags, sep, custom, mergePrev: false });
}

/**
 * Formats an option's required value to be included in the description.
 * Assumes that the options were validated.
 * @param option The option definition
 * @param value The option value
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequiredValue(
  option: OpaqueOption,
  value: unknown,
  result: AnsiString,
  negate: boolean,
) {
  const { connectives } = config;
  const requireAbsent = value === null;
  const requirePresent = value === undefined;
  if ((requireAbsent && !negate) || (requirePresent && negate)) {
    result.word(connectives.no);
  }
  const name = option.preferredName ?? '';
  fmt.m(getSymbol(name), result, {});
  if (!requireAbsent && !requirePresent) {
    const connective = negate ? connectives.notEquals : connectives.equals;
    result.word(connective);
    fmt.v(value, result, {});
  }
}

/**
 * Formats a requirement callback to be included in the description.
 * Assumes that the options were validated.
 * @param callback The requirement callback
 * @param result The resulting string
 * @param negate True if the requirement should be negated
 */
function formatRequirementCallback(
  callback: RequirementCallback,
  result: AnsiString,
  negate: boolean,
) {
  if (negate) {
    result.word(config.connectives.not);
  }
  fmt.v(callback, result, {});
}
