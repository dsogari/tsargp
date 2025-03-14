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
  HelpTextBlock,
} from './options.js';
import type { FormattingFlags } from './styles.js';

import { config } from './config.js';
import { HelpItem } from './enums.js';
import {
  getParamCount,
  getOptionNames,
  getOptionEnvVars,
  visitRequirements,
  isCommand,
  checkInline,
} from './options.js';
import { formatFunctions, AnsiString, AnsiMessage } from './styles.js';
import {
  getSymbol,
  isArray,
  getValues,
  max,
  getEntries,
  getRequiredBy,
  isString,
  mergeValues,
  regex,
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
  names: Array<AnsiString>,
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
 * A set of formatting functions for {@link HelpItem}.
 */
type HelpFunctions = Readonly<Record<HelpItem, HelpFunction>>;

/**
 * A map of option groups to help entries.
 */
type EntriesByGroup = Readonly<Record<string, ReadonlyArray<HelpEntry>>>;

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
 * The default help columns layout.
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
    if (max > 1 && option.inline !== 'always') {
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
    const alt = inline === 'always' ? 1 : inline === false ? 0 : -1;
    if (alt >= 0) {
      result.format(phrase, { alt });
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
  progName?: string,
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
      !names?.find((name) => name && matches(name)) &&
      !(synopsis && matches(synopsis)) &&
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
 * Builds the help entries for the selected option groups.
 * @param options The option definitions
 * @param keys The filtered option keys
 * @param buildFn The building function
 * @param filter The option group filter
 * @param exclude True if the filter should exclude
 * @returns The option groups
 */
function buildEntries(
  options: OpaqueOptions,
  keys: ReadonlyArray<string>,
  buildFn: (option: OpaqueOption) => HelpEntry | undefined,
  filter?: ReadonlyArray<string>,
  exclude?: boolean,
): EntriesByGroup {
  const groups: Record<string, Array<HelpEntry>> = {};
  const allNames = new Set(keys.map((key) => options[key].group ?? ''));
  const visited = new Set<string>(exclude ? filter : []);
  const include = exclude || !filter ? allNames : filter.filter((name) => allNames.has(name));
  include.forEach((name) => (visited.has(name) ? void 0 : (groups[name] = [])));
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
 * Formats the help entries for a groups section.
 * @param options The option definitions
 * @param layout The help columns layout
 * @param keys The filtered option keys
 * @param items The help items
 * @param groupFilter The option group filter
 * @param exclude True if the filter should exclude
 * @param useEnv Whether option names should be replaced by environment variable names
 * @returns The option groups
 */
function formatGroups(
  options: OpaqueOptions,
  layout: HelpColumnsLayout,
  keys: ReadonlyArray<string>,
  items?: ReadonlyArray<HelpItem>,
  groupFilter?: ReadonlyArray<string>,
  exclude?: boolean,
  useEnv?: boolean,
): EntriesByGroup {
  /** @ignore */
  function build(option: OpaqueOption): HelpEntry | undefined {
    const names = formatNames(layout, option, useEnv);
    if (useEnv && !names.length) {
      return undefined; // skip options without environment variable names, in this case
    }
    const param = formatParams(layout, option);
    const descr = formatDescription(options, layout, option, items);
    const paramLen = param.totalLen;
    param.indent = paramLen; // TODO: save the length, since we will need it in `adjustEntries`
    let prev: AnsiString | undefined;
    let namesLen = 0;
    names.forEach((str, i) => {
      const nameLen = str.totalLen;
      if (nameLen) {
        if (prev) {
          prev.close(optionSep).popSty(); // pop the base text style
          prev.indent += slotInc; // length in non-slotted alignment
          namesLen += slotInc; // length in non-slotted alignment
        }
        prev = str;
      }
      prev?.popSty(); // pop the base text style of the last name
      const inc = i < names.length - 1 ? slotInc : 0; // include sep in slot width
      slotWidths[i] = max(slotWidths[i] ?? 0, nameLen + inc); // longest across all entries
      str.indent = nameLen; // TODO: save the length, since we will need it in `adjustEntries`
      namesLen += nameLen;
    });
    namesWidth = max(namesWidth, namesLen); // longest across all entries
    paramWidth = max(paramWidth, paramLen); // longest across all entries
    mergedWidth = max(
      mergedWidth, // longest across all entries
      namesLen + paramLen + (namesLen && paramLen && !param.mergeLeft ? 1 : 0),
    );
    return [names, param, descr];
  }
  const { optionSep } = config.connectives;
  const slotInc = optionSep.length + 1; // include separator and space in slot width
  const slotWidths: Array<number> = [];
  let namesWidth = 0; // for non-slotted alignment
  let paramWidth = 0; // for non-slotted alignment
  let mergedWidth = 0; // names + param
  const groups = buildEntries(options, keys, build, groupFilter, exclude);
  adjustEntries(layout, groups, slotWidths, namesWidth, paramWidth, mergedWidth);
  return groups;
}

/**
 * Adjust the help entries for a help message.
 * @param layout The help columns layout
 * @param groups The option groups and their help entries
 * @param slotWidths The widths of the name slots
 * @param namesWidth The width of the names column
 * @param paramWidth The width of the parameter column
 * @param mergedWidth The width of the names and parameter columns merged
 */
function adjustEntries(
  layout: HelpColumnsLayout,
  groups: EntriesByGroup,
  slotWidths: ReadonlyArray<number>,
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
  const useSlot = namesSlotted && !paramMerge && !(paramHidden && descrMerge);
  for (const [names, param, descr] of getValues(groups).flat()) {
    let indent = namesRight
      ? namesEnd - names.reduce((acc, str) => acc + str.indent, 0) // compute width
      : namesStart;
    let lastName: AnsiString | undefined; // last non-empty name
    names.forEach((str, i) => {
      const saved = str.indent; // TODO: fix length hack
      if (saved) {
        str.indent = indent;
        lastName = str;
      }
      indent += useSlot ? slotWidths[i] : saved;
    });
    if (descrMerge) {
      param.other(descr); // no need to reset param style
      descr.clear();
    } else {
      descr.indent = descrStart;
    }
    if ((paramMerge || paramHidden) && lastName) {
      lastName.other(param); // no need to reset names style
      param.clear();
    } else {
      param.indent =
        paramMerge || paramHidden
          ? namesRight
            ? namesEnd + 1 // start column where it would normally (i.e., without mergeRight)
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
 * @param layout The help columns layout
 * @param option The option definition
 * @param useEnv Whether option names should be replaced by environment variable names
 * @returns The list of ANSI strings, one for each name
 */
function formatNames(
  layout: HelpColumnsLayout,
  option: OpaqueOption,
  useEnv: boolean = false,
): Array<AnsiString> {
  const { breaks, hidden } = layout.names;
  const names = useEnv ? getOptionEnvVars(option) : option.names;
  if (hidden || !names?.length) {
    return [];
  }
  const sty = option.styles?.names ?? config.styles.symbol;
  const result: Array<AnsiString> = [];
  let str: AnsiString | undefined;
  names.forEach((name) => {
    if (name) {
      str = new AnsiString()
        .break(str ? 0 : breaks) // break only on the first name
        .pushSty(config.styles.base) // base style will be popped later
        .word(name, sty);
      result.push(str);
    } else {
      result.push(new AnsiString());
    }
  });
  return result;
}

/**
 * Formats an option's parameter to be printed on the terminal.
 * @param layout The help columns layout
 * @param option The option definition
 * @returns The ANSI string
 */
function formatParams(layout: HelpColumnsLayout, option: OpaqueOption): AnsiString {
  const { hidden, breaks } = layout.param;
  const result = new AnsiString().break(breaks).pushSty(config.styles.base);
  if (!hidden) {
    formatParam(option, result);
  }
  return result.maxLength ? result.popSty() : result.clear();
}

/**
 * Formats an option's description to be printed on the terminal.
 * The description always ends with a single line break.
 * @param options The option definitions
 * @param layout The help columns layout
 * @param option The option definition
 * @param items The help items
 * @returns The ANSI string
 */
function formatDescription(
  options: OpaqueOptions,
  layout: HelpColumnsLayout,
  option: OpaqueOption,
  items: ReadonlyArray<HelpItem> = allHelpItems,
): AnsiString {
  const { hidden, breaks, align } = layout.descr;
  const result = new AnsiString(0, align === 'right')
    .break(breaks)
    .pushSty(config.styles.base)
    .pushSty(option.styles?.descr);
  if (!hidden) {
    for (const item of items) {
      helpFunctions[item](option, config.helpPhrases[item], options, result);
    }
  }
  return result.maxLength ? result.popSty().popSty() : result.clear();
}

/**
 * Formats a help section to be included in the full help message.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param options The option definitions
 * @param section The help section
 * @param keys The filtered option keys
 * @param progName The program name, if any
 * @param result The resulting message
 */
function formatHelpSection(
  options: OpaqueOptions,
  section: HelpSection,
  keys: ReadonlyArray<string>,
  progName: string = '',
  result: AnsiMessage,
) {
  const { type, heading, content } = section;
  if (type === 'groups') {
    const { layout, filter, exclude, items, useEnv } = section;
    const mergedLayout = mergeValues(defaultLayout, layout ?? {});
    const groups = formatGroups(options, mergedLayout, keys, items, filter, exclude, useEnv);
    for (const [group, entries] of getEntries(groups)) {
      // there is always at least one entry per group
      if (heading) {
        formatTextBlock({ ...heading, text: group || heading.text }, result);
      }
      if (content) {
        formatTextBlock({ ...content, text: group ? '' : content.text }, result, 2);
      }
      for (const [names, param, descr] of entries) {
        result.push(...names, param, descr.break()); // include trailing line feed
      }
    }
  } else {
    if (heading) {
      formatTextBlock(heading, result);
    }
    if (type === 'usage') {
      const baseSty = config.styles.base;
      const prev: Array<AnsiString> = [];
      let indent = content?.indent ?? 0;
      let breaks = content?.noBreakFirst && !result.length ? 0 : (content?.breaks ?? 0);
      progName = content?.text ?? progName;
      if (progName) {
        const str = new AnsiString(indent)
          .break(breaks)
          .pushSty(baseSty)
          .word(progName.replace(regex.sgr, ''), content?.style)
          .popSty();
        prev.push(str);
        indent = max(0, indent ?? 0) + progName.length + 1;
        breaks = 0; // avoid breaking between program name and usage
      }
      const str = new AnsiString(indent, content?.align === 'right').break(breaks).pushSty(baseSty);
      formatUsage(keys, options, section, str);
      if (str.maxLength) {
        result.push(...prev, str.popSty().break()); // include trailing line feed
      }
    } else if (content) {
      formatTextBlock(content, result, 1); // include trailing line feed
    }
  }
}

/**
 * Formats a text block to be included in a help section.
 * @param block The text block
 * @param result The resulting message
 * @param breaksAfter The number of trailing line feeds (only if there is text)
 */
function formatTextBlock(block: HelpTextBlock, result: AnsiMessage, breaksAfter: number = 0) {
  const { text, style, align, indent, breaks, noSplit, noBreakFirst } = block;
  const breaksBefore = noBreakFirst && !result.length ? 0 : (breaks ?? 0);
  const str = new AnsiString(indent, align === 'right').break(breaksBefore);
  if (text) {
    str.pushSty(config.styles.base).pushSty(style);
    if (noSplit) {
      str.add(text.replace(regex.sgr, ''), text);
    } else {
      str.split(text);
    }
    str.popSty().popSty().break(breaksAfter);
  }
  result.push(str);
}

/**
 * Formats a usage text to be included in a help section.
 * Options are rendered in the same order as was declared in the option definitions.
 * @param allKeys The filtered option keys
 * @param options The option definitions
 * @param section The help section
 * @param result The resulting string
 */
function formatUsage(
  allKeys: ReadonlyArray<string>,
  options: OpaqueOptions,
  section: HelpUsageSection,
  result: AnsiString,
) {
  const { filter, exclude, required, requires, comment } = section;
  const visited = new Set<string>(exclude ? filter : []);
  const requiredKeys = new Set(required);
  const requiredBy = requires && getRequiredBy(requires);
  const keys = exclude || !filter ? allKeys.slice() : filter.filter((key) => allKeys.includes(key));
  let hasPositional;
  for (const key of keys) {
    if (!hasPositional && isString(options[key].positional)) {
      hasPositional = true;
      keys.push(key);
      continue; // leave positional marker for last (ignore filter order in this case)
    }
    formatUsageOption(options, key, result, visited, requiredKeys, requires, requiredBy);
  }
  if (!result.maxLength) {
    result.clear();
  } else if (comment) {
    result.split(comment);
  }
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
    // if the received key is my own key, then I'm the junction point in a circular dependency:
    // reset it so that remaining options in the chain can be considered optional
    preOrderFn?.(key === receivedKey ? undefined : receivedKey);
    formatUsageNames(option, result);
    formatParam(option, result);
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
        const [min, max] = getParamCount(option);
        // skip enclosing brackets for positional option with optional parameters, because the names
        // are also optional, so it would not make sense, e.g.: [[-a] [<param>...]]
        if (!option.positional || min || !max) {
          result.openAt('[', count).close(']');
        }
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
 * @param result The resulting string
 */
function formatUsageNames(option: OpaqueOption, result: AnsiString) {
  const names = getOptionNames(option);
  if (names.length) {
    const count = result.count;
    const enclose = names.length > 1;
    const flags: FormattingFlags = {
      sep: config.connectives.optionAlt,
      open: enclose ? config.connectives.exprOpen : '',
      close: enclose ? config.connectives.exprClose : '',
      mergeNext: true, // keep names compact
    };
    const { styles } = config;
    const saved = styles.symbol;
    try {
      styles.symbol = option.styles?.names ?? saved; // use configured style, if any
      formatFunctions.a(names.map(getSymbol), result, flags);
    } finally {
      styles.symbol = saved;
    }
    if (option.positional) {
      result.openAt('[', count).close(']');
    }
  }
}

/**
 * Formats an option's parameter to be included in the description or the usage text.
 * @param option The option definition
 * @param result The resulting string
 */
function formatParam(option: OpaqueOption, result: AnsiString) {
  const { type, example, separator, paramName } = option;
  const inline = checkInline(option, option.names?.findLast(isString) ?? '') === 'always';
  const [min, max] = getParamCount(option);
  const optional = !min && max;
  const ellipsis =
    isCommand(type) || (!max && type === 'function') || (max > 1 && !inline) ? '...' : '';
  if (inline) {
    result.merge = true; // to merge with names column, if required
  }
  result
    .pushSty(option.styles?.param ?? config.styles.value)
    .open(optional ? '[' : '')
    .open(inline ? '=' : '');
  if (example !== undefined) {
    let param = example;
    if (separator && isArray(param)) {
      const sep = isString(separator) ? separator : separator.source;
      param = param.join(sep);
    }
    formatFunctions.v(param, result, { sep: '', open: '', close: '' });
    result.close(ellipsis);
  } else {
    const param = !max ? '' : paramName?.includes('<') ? paramName : `<${paramName || 'param'}>`;
    result.word(param + ellipsis);
  }
  result.close(optional ? ']' : '').popSty();
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
  formatFunctions.m(getSymbol(name), result, {});
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
  const flags: FormattingFlags = {
    open: enclose ? connectives.exprOpen : '',
    close: enclose ? connectives.exprClose : '',
  };
  const sep = isAll === negate ? connectives.or : connectives.and;
  formatFunctions.a(items, result, { ...flags, sep, custom, mergePrev: false });
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
  formatFunctions.m(getSymbol(name), result, {});
  if (!requireAbsent && !requirePresent) {
    const connective = negate ? connectives.notEquals : connectives.equals;
    result.word(connective);
    formatFunctions.v(value, result, {});
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
  formatFunctions.v(callback, result, {});
}
