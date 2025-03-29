//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  HelpGroupsSection,
  HelpItems,
  HelpSection,
  HelpSectionFilter,
  HelpSections,
  HelpTextBlock,
  HelpUsageSection,
  OpaqueOption,
  OpaqueOptions,
  OptionDependencies,
  RequirementCallback,
  Requires,
  RequiresEntry,
  WithBasicLayout,
  WithMergedLayout,
} from './options.js';
import type { FormattingFlags, TextAlignment } from './styles.js';
import type { RecordKeyMap, UsageStatement } from './utils.js';

import { config } from './config.js';
import { HelpItem } from './enums.js';
import { AnsiMessage, AnsiString } from './styles.js';
import {
  checkInline,
  createUsage,
  getEntries,
  getLastOptionName,
  getOptionEnvVars,
  getOptionNames,
  getParamCount,
  getSymbol,
  getValues,
  hasTemplate,
  isArray,
  isEnvironmentOnly,
  isPositional,
  isString,
  max,
  min,
  stronglyConnected,
  visitRequirements,
} from './utils.js';

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * The formatter flags.
 */
export type FormatterFlags = {
  /**
   * The program name.
   * If not present or empty, usage statements will contain no program name.
   */
  readonly progName?: string;
  /**
   * The cluster argument prefix.
   * If not present, cluster letters will not appear in usage statements.
   */
  readonly clusterPrefix?: string;
  /**
   * The option filter.
   * If not present, all options will be included respecting the order of their definitions.
   */
  readonly optionFilter?: ReadonlyArray<string>;
  /**
   * The symbol for the standard input (e.g., '-') to display in usage statements.
   * If not present, the standard input will not appear in usage statements.
   */
  readonly stdinSymbol?: string;
};

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * The precomputed ANSI strings for a help column. Each item represents a slot in the column.
 */
type HelpColumn = Array<AnsiString>;

/**
 * The precomputed ANSI strings for a help entry. Each item represents a help column.
 */
type HelpEntry = [
  /**
   * The formatted option names.
   */
  names: HelpColumn,
  /**
   * The formatted option parameter.
   */
  param: HelpColumn,
  /**
   * The formatted option description.
   */
  descr: HelpColumn,
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

/**
 * The common layout settings for a help column.
 */
type ColumnLayout = WithBasicLayout | null | WithMergedLayout;

/**
 * The key of an option and its corresponding group.
 */
type OptionKey = readonly [key: string, group: string];

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The complete list of help items.
 */
export const allHelpItems: HelpItems = Array(HelpItem._count)
  .fill(0)
  .map((_, index) => HelpItem.synopsis + index);

/**
 * The list of help items that are useful for help messages with environment variables only.
 */
export const envHelpItems: HelpItems = [
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
 * The formatting flags for arrays and objects with no brackets.
 */
const openArrayFlags: FormattingFlags = { open: '', close: '' };

/**
 * The formatting flags for arrays and objects without merging the separator.
 */
const openArrayNoMergeFlags: FormattingFlags = { ...openArrayFlags, mergePrev: false };

/**
 * The formatting functions for {@link HelpItem}.
 */
const helpFunctions: HelpFunctions = {
  [HelpItem.synopsis]: (option, phrase, _options, result) => {
    const { synopsis } = option;
    if (synopsis) {
      const str = isString(synopsis) ? new AnsiString().split(synopsis) : synopsis;
      result.format(phrase, {}, str);
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
      result.format(phrase, { alt, sep, ...openArrayNoMergeFlags }, val);
    }
  },
  [HelpItem.positional]: (option, phrase, _options, result) => {
    const { positional } = option;
    const [alt, name] = isString(positional) ? [1, getSymbol(positional)] : positional ? [0] : [-1];
    if (alt >= 0) {
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
      const str = isString(deprecated) ? new AnsiString().split(deprecated) : deprecated;
      result.format(phrase, {}, str);
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
      result.format(phrase, { alt: isEnvironmentOnly(option) ? 1 : 0 });
    }
  },
  [HelpItem.sources]: (option, phrase, _options, result) => {
    const { sources } = option;
    if (sources?.length) {
      const values = sources.map((name) => (isString(name) ? getSymbol(name) : name));
      const sep = config.connectives.or;
      result.format(phrase, { sep, ...openArrayNoMergeFlags }, values);
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
      const letters = [...cluster].map(getSymbol);
      const sep = config.connectives.or;
      result.format(phrase, { sep, ...openArrayNoMergeFlags }, letters);
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
 * Options are rendered in the order specified in their definitions.
 * @param options The option definitions (should be validated first)
 * @param sections The help sections (defaults to a single groups section)
 * @param flags The formatter flags, if any
 * @returns The formatted help message
 */
export function format(
  options: OpaqueOptions,
  sections: HelpSections = [{ type: 'groups' }],
  flags: FormatterFlags = {},
): AnsiMessage {
  const keys = filterOptions(options, flags.optionFilter);
  const help = new AnsiMessage();
  for (const section of sections) {
    formatHelpSection(options, section, keys, flags, help);
  }
  return help;
}

/**
 * Filter the options, preserving the order specified in their definitions.
 * @param options The option definitions
 * @param filter The option filter
 * @returns The filtered option keys
 */
function filterOptions(
  options: OpaqueOptions,
  filter: ReadonlyArray<string> = [],
): Array<OptionKey> {
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
      !(synopsis && matches('' + synopsis)) &&
      !sources?.find((name) => isString(name) && matches(name))
    );
  }
  filter = filter.map((pattern) => pattern.toLowerCase());
  const result: Array<OptionKey> = [];
  for (const [key, option] of getEntries(options)) {
    if (option.group !== null && !exclude(option)) {
      result.push([key, option.group ?? '']);
    }
  }
  return result;
}

/**
 * Builds the help entries for the selected option groups.
 * @param options The option definitions
 * @param keys The filtered option keys
 * @param buildFn The building function
 * @returns The option groups
 */
function buildEntries(
  options: OpaqueOptions,
  keys: ReadonlyArray<OptionKey>,
  buildFn: (option: OpaqueOption) => HelpEntry | undefined,
): EntriesByGroup {
  const groups: Record<string, Array<HelpEntry>> = {};
  for (const [key, group] of keys) {
    const option = options[key];
    const { styles } = config;
    const saved = styles.symbol;
    try {
      styles.symbol = option.styles?.names ?? saved; // use configured style, if any
      const entry = buildFn(option);
      if (entry) {
        (groups[group] ??= []).push(entry);
      }
    } finally {
      styles.symbol = saved;
    }
  }
  return groups;
}

/**
 * Refilters options and groups according to a section filter.
 * @param keys The filtered option keys
 * @param filter The section filter
 * @returns The refiltered option keys
 */
function refilterKeys(
  keys: ReadonlyArray<OptionKey>,
  filter: HelpSectionFilter = {},
): Array<OptionKey> {
  const { includeOptions, includeGroups, excludeOptions, excludeGroups } = filter;
  const includeOptionsSet = new Set(includeOptions);
  const includeGroupsSet = new Set(includeGroups);
  const excludeOptionsSet = new Set(excludeOptions);
  const excludeGroupsSet = new Set(excludeGroups);
  return keys.filter(
    ([key, group]) =>
      (!(includeOptions || includeGroups) ||
        includeOptionsSet.has(key) ||
        includeGroupsSet.has(group)) &&
      !(excludeOptionsSet.has(key) || excludeGroupsSet.has(group)),
  );
}

/**
 * Formats the help entries for a groups section.
 * @param options The option definitions
 * @param section The groups section
 * @param keys The filtered option keys
 * @param flags The formatter flags
 * @returns The option groups
 */
function formatGroups(
  options: OpaqueOptions,
  section: HelpGroupsSection,
  keys: ReadonlyArray<OptionKey>,
  flags: FormatterFlags,
): EntriesByGroup {
  /** @ignore */
  function merge(into: HelpColumn, from: HelpColumn) {
    into.push(...from.splice(0)); // extract strings
    into.splice(1).forEach((str) => into[0].other(str));
  }
  /** @ignore */
  function compute(column: HelpColumn, widths: Array<number>) {
    column.forEach((str, i) => (widths[i] = max(widths[i] ?? 0, str.lineWidth)));
  }
  /** @ignore */
  function build(option: OpaqueOption): HelpEntry | undefined {
    const namesColumn = formatNames(names, option, useEnv);
    if (useEnv && namesColumn.length === 1 && !namesColumn[0].maxLength) {
      return; // skip options without environment variable names, in this case
    }
    const paramColumn = formatParams(param, option);
    const descrColumn = formatDescription(descr, options, option, flags, items);
    if (descr === null || descr?.merge) {
      merge(paramColumn, descrColumn);
    }
    if (param === null || param?.merge) {
      merge(namesColumn, paramColumn);
    }
    compute(namesColumn, namesWidths);
    compute(paramColumn, paramWidths);
    compute(descrColumn, descrWidths);
    return [namesColumn, paramColumn, descrColumn];
  }
  const namesWidths: Array<number> = [];
  const paramWidths: Array<number> = [];
  const descrWidths: Array<number> = [];
  const { filter, items, useEnv, names, param, descr } = section;
  const groups = buildEntries(options, refilterKeys(keys, filter), build);
  adjustEntries(section, groups, namesWidths, paramWidths, descrWidths);
  return groups;
}

/**
 * Adjust the help entries for a help message.
 * @param section The groups section
 * @param groups The option groups and their help entries
 * @param namesWidths The width of each slot in the names column
 * @param paramWidths The width of each slot in the parameter column
 * @param descrWidths The width of each slot in the description column
 */
function adjustEntries(
  section: HelpGroupsSection,
  groups: EntriesByGroup,
  namesWidths: Array<number>,
  paramWidths: Array<number>,
  descrWidths: Array<number>,
) {
  /** @ignore */
  function adjustColumn(
    column: HelpColumn,
    widths: Array<number>,
    start: number,
    slotIndent?: number,
    maxWidth: number = Infinity,
  ) {
    column.forEach((str, i) => {
      str.indent = start;
      str.width = min(widths[i], maxWidth);
      start += str.width + (slotIndent || 0);
    });
  }
  /** @ignore */
  function getStartAndWidth(
    column: ColumnLayout = {},
    widths: Array<number>,
    prevEnd: number,
    slotIndent?: number,
    absolute?: boolean,
  ): [start: number, width: number] {
    if (!column || column.merge) {
      return [prevEnd, 0];
    }
    const indent = (column.indent ?? 2) || 0;
    const maxWidth = column.maxWidth || Infinity;
    return [
      absolute ? max(0, indent) : prevEnd + indent,
      widths.reduce(
        (acc, width) => acc + min(width, maxWidth),
        ((widths.length || 1) - 1) * (slotIndent || 0),
      ),
    ];
  }
  /** @ignore */
  function hook(column: HelpColumn, prev: AnsiString, from: number = 0): AnsiString {
    column.splice(from).forEach((str) => (prev = prev.hook = str));
    return prev;
  }
  const { names, param, descr, responsive } = section;
  const [namesStart, namesWidth] = getStartAndWidth(names, namesWidths, 0, names?.slotIndent);
  const [paramStart, paramWidth] = getStartAndWidth(
    param,
    paramWidths,
    namesStart + namesWidth,
    0, // non-slotted
    param?.absolute,
  );
  const [descrStart] = getStartAndWidth(
    descr,
    descrWidths,
    paramStart + paramWidth,
    0, // non-slotted
    descr?.absolute,
  );
  for (const [namesColumn, paramColumn, descrColumn] of getValues(groups).flat()) {
    adjustColumn(namesColumn, namesWidths, namesStart, names?.slotIndent, names?.maxWidth);
    adjustColumn(paramColumn, paramWidths, paramStart, 0, param?.maxWidth);
    adjustColumn(descrColumn, descrWidths, descrStart, 0, descr?.maxWidth);
    if (responsive === false) {
      const str = hook(descrColumn, hook(paramColumn, hook(namesColumn, namesColumn[0], 1)));
      str.hook = new AnsiString(); // tail of wrapping chain
    }
  }
}

/**
 * Gets the text alignment setting from a column layout.
 * @param column The column layout
 * @returns [The text alignment, The number of leading line feeds]
 */
function getAlignment(column: ColumnLayout = {}): [align?: TextAlignment, breaks?: number] {
  if (!column) {
    return [];
  }
  const { align, breaks } = column;
  return [align, breaks ?? 0]; // breaks are used to determine if the column is present
}

/**
 * Formats an option's names to be printed in a groups section.
 * This does not include the positional marker.
 * @param layout The column layout settings
 * @param option The option definition
 * @param useEnv Whether option names should be replaced by environment variable names
 * @returns The help column
 */
function formatNames(
  layout: HelpGroupsSection['names'],
  option: OpaqueOption,
  useEnv: boolean = false,
): HelpColumn {
  const [align, breaks] = getAlignment(layout);
  let str = new AnsiString(0, align);
  const result: HelpColumn = [str];
  if (breaks !== undefined) {
    const names = useEnv ? getOptionEnvVars(option) : option.names;
    if (names?.length) {
      const { styles, connectives } = config;
      const sty = option.styles?.names ?? styles.symbol;
      const slotted = !!layout?.slotIndent;
      let sep: string | undefined; // no separator before first name
      str.break(breaks).pushSty(styles.base);
      if (slotted) {
        result.pop(); // will be re-added within the loop
      }
      for (const name of names) {
        if (name !== null) {
          if (sep !== undefined) {
            str.close(sep);
            if (slotted) {
              str.popSty(); // pop style of the last string
              str = new AnsiString(0, align).pushSty(styles.base);
            }
          }
          if (slotted) {
            result.push(str);
          }
          str.word(name, sty); // do not split the name
          sep = connectives.optionSep;
        } else if (slotted) {
          result.push(new AnsiString()); // skip a slot
        }
      }
      str.popSty(); // pop style of the last string
    }
  }
  return result;
}

/**
 * Formats an option's parameter to be printed in a groups section.
 * @param layout The column layout settings
 * @param option The option definition
 * @returns The help column
 */
function formatParams(layout: HelpGroupsSection['param'], option: OpaqueOption): HelpColumn {
  const [align, breaks] = getAlignment(layout);
  const result = new AnsiString(0, align);
  if (breaks !== undefined && hasTemplate(option, false)) {
    result.break(breaks).pushSty(config.styles.base);
    formatParam(option, false, result);
    result.popSty();
  }
  return [result];
}

/**
 * Formats an option's description to be printed in a groups section.
 * The description always ends with a single line break.
 * @param layout The column layout settings
 * @param options The option definitions
 * @param option The option definition
 * @param flags The formatter flags
 * @param items The help items
 * @returns The help column
 */
function formatDescription(
  layout: HelpGroupsSection['descr'],
  options: OpaqueOptions,
  option: OpaqueOption,
  flags: FormatterFlags,
  items: HelpItems = allHelpItems,
): HelpColumn {
  const [align, breaks] = getAlignment(layout);
  const result = new AnsiString(0, align);
  if (breaks !== undefined) {
    result.break(breaks).pushSty(config.styles.base).pushSty(option.styles?.descr);
    for (const item of items) {
      if (item !== HelpItem.cluster || flags.clusterPrefix !== undefined) {
        helpFunctions[item](option, config.helpPhrases[item], options, result);
      }
    }
    result.popSty().popSty();
  }
  return [result.break()]; // include trailing line feed
}

/**
 * Formats a help section to be included in the help message.
 * @param options The option definitions
 * @param section The help section
 * @param keys The filtered option keys
 * @param flags The formatter flags
 * @param result The resulting message
 */
function formatHelpSection(
  options: OpaqueOptions,
  section: HelpSection,
  keys: ReadonlyArray<OptionKey>,
  flags: FormatterFlags,
  result: AnsiMessage,
) {
  const { type, heading, content } = section;
  if (type === 'groups') {
    const groups = formatGroups(options, section, keys, flags);
    for (const [group, entries] of getEntries(groups)) {
      // there is always at least one entry per group
      if (heading) {
        formatTextBlock({ ...heading, text: group || heading.text }, result);
      }
      if (content) {
        formatTextBlock({ ...content, text: group ? '' : content.text }, result, 2);
      }
      result.push(...entries.flat().flat());
    }
  } else {
    if (heading) {
      formatTextBlock(heading, result);
    }
    if (type === 'usage') {
      formatUsageSection(options, section, keys, flags, result);
    } else if (content) {
      formatTextBlock(content, result, 1); // include trailing line feed
    }
  }
}

/**
 * Formats a usage section to be included in the help message.
 * @param options The option definitions
 * @param section The help section
 * @param keys The filtered option keys
 * @param flags The formatter flags
 * @param result The resulting message
 */
function formatUsageSection(
  options: OpaqueOptions,
  section: HelpUsageSection,
  keys: ReadonlyArray<OptionKey>,
  flags: FormatterFlags,
  result: AnsiMessage,
) {
  const { text, style, align, noSplit, noBreakFirst } = section.content ?? {};
  const progName = text ?? flags.progName;
  const baseSty = config.styles.base;
  const prev: Array<AnsiString> = [];
  let indent = section.content?.indent ?? 0;
  let breaks = noBreakFirst && !result.length ? 0 : (section.content?.breaks ?? 0);
  if (progName) {
    const str = new AnsiString(indent)
      .break(breaks)
      .pushSty(baseSty)
      .pushSty(style)
      .append(progName, !noSplit)
      .popSty()
      .popSty();
    prev.push(str);
    indent += str.lineWidth + 1; // get last column with indentation
    breaks = 0; // avoid breaking between program name and usage
  }
  const str = new AnsiString(indent, align).break(breaks).pushSty(baseSty);
  formatUsage(keys, options, section, flags, str);
  if (str.maxLength) {
    if (section.comment) {
      str.append(section.comment, !noSplit);
    }
    result.push(...prev, str.popSty().break()); // include trailing line feed
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
  const str = new AnsiString(indent, align).break(breaksBefore);
  if (text) {
    str
      .pushSty(config.styles.base)
      .pushSty(style)
      .append(text, !noSplit)
      .popSty()
      .popSty()
      .break(breaksAfter);
  }
  result.push(str);
}

/**
 * Formats a usage statement to be included in a usage section.
 * @param keys The filtered option keys
 * @param options The option definitions
 * @param section The usage section
 * @param flags The formatter flags
 * @param result The resulting string
 */
function formatUsage(
  keys: ReadonlyArray<OptionKey>,
  options: OpaqueOptions,
  section: HelpUsageSection,
  flags: FormatterFlags,
  result: AnsiString,
) {
  const { filter, required, inclusive, compact } = section;
  const requiredSet = new Set(required?.filter((key) => key in options));
  const deps = normalizeDependencies(refilterKeys(keys, filter), requiredSet, options, inclusive);
  const [, components, adjacency] = stronglyConnected(deps);
  const withMarkerSet = new Set<string>(); // set of components that include a positional marker
  for (const [comp, keys] of getEntries(components)) {
    const index = keys.findIndex((key) => isString(options[key].positional));
    if (index >= 0) {
      keys.push(...keys.splice(index, 1)); // leave positional marker for last
      withMarkerSet.add(comp);
    }
  }
  const usage = createUsage(adjacency);
  sortUsageStatement(withMarkerSet, usage);
  formatUsageStatement(requiredSet, options, flags, result, components, usage, compact);
}

/**
 * Normalizes the option dependencies for a usage statement.
 * @param keys The filtered option keys
 * @param requiredKeys The set of options to consider always required (may be updated)
 * @param options The option definitions
 * @param dependencies The option dependencies
 * @returns The normalized dependencies
 */
function normalizeDependencies(
  keys: ReadonlyArray<OptionKey>,
  requiredKeys: Set<string>,
  options: OpaqueOptions,
  dependencies: OptionDependencies = {},
): RecordKeyMap {
  const result: RecordKeyMap = {};
  const filteredSet = new Set(keys.map(([key]) => key));
  for (const key of filteredSet) {
    if (options[key].required) {
      requiredKeys.add(key);
    }
    const deps = dependencies[key] ?? [];
    result[key] = (isString(deps) ? [deps] : deps).filter((dep) => dep in options);
    result[key].forEach((key) => filteredSet.add(key)); // update with extra options
  }
  for (const key of filteredSet) {
    result[key].push(...requiredKeys); // options depended upon by all other options
  }
  return result;
}

/**
 * Sorts a usage statement to leave the positional marker for last.
 * @param withMarker The set of components that include a positional marker
 * @param usage The usage statement
 * @returns True if the usage includes a positional marker
 */
function sortUsageStatement(withMarker: ReadonlySet<string>, usage: UsageStatement): boolean {
  let containsMarker = false;
  for (let i = 0, length = usage.length; i < length; ) {
    const element = usage[i];
    if (isArray(element) ? sortUsageStatement(withMarker, element) : withMarker.has(element)) {
      usage.push(...usage.splice(i, 1)); // leave positional marker for last
      containsMarker = true;
      length--;
    } else {
      i++;
    }
  }
  return containsMarker;
}

/**
 * Formats a usage statement to be included in the the usage section.
 * @param requiredKeys The set of options to consider always required
 * @param options The option definitions
 * @param flags The formatter flags
 * @param result The resulting string
 * @param components The option components
 * @param usage The usage statement
 * @param compact Whether to keep alternatives compact
 */
function formatUsageStatement(
  requiredKeys: ReadonlySet<string>,
  options: OpaqueOptions,
  flags: FormatterFlags,
  result: AnsiString,
  components: Readonly<RecordKeyMap>,
  usage: Readonly<UsageStatement>,
  compact: boolean = true,
) {
  let alwaysRequired = false;
  let renderBrackets = false;
  const count = result.count;
  for (const element of usage) {
    if (isArray(element)) {
      formatUsageStatement(requiredKeys, options, flags, result, components, element, compact);
      continue;
    }
    const keys = components[element];
    for (const key of keys) {
      const option = options[key];
      const { styles } = config;
      const saved = styles.symbol;
      try {
        styles.symbol = option.styles?.names ?? saved; // use configured style, if any
        const isAlone = usage.length === 1 && keys.length === 1;
        const isRequired = option.required || requiredKeys.has(key);
        const hasRequiredPart = formatUsageOption(
          option,
          flags,
          isAlone,
          isRequired,
          compact,
          result,
        );
        alwaysRequired ||= isRequired;
        renderBrackets ||= hasRequiredPart;
      } finally {
        styles.symbol = saved;
      }
    }
  }
  if (!alwaysRequired && renderBrackets) {
    const { optionalOpen, optionalClose } = config.connectives;
    result.openAt(optionalOpen, count).close(optionalClose);
  }
}

/**
 * Formats an option to be included in the usage statement.
 * @param option The option definition
 * @param flags The formatter flags
 * @param isAlone True if the option is alone in a dependency group
 * @param isRequired True if the option is considered always required
 * @param compact Whether to keep alternatives compact
 * @param result The resulting string
 * @returns True if a non-optional part was rendered
 */
function formatUsageOption(
  option: OpaqueOption,
  flags: FormatterFlags,
  isAlone: boolean,
  isRequired: boolean,
  compact: boolean,
  result: AnsiString,
): boolean {
  const { exprOpen, exprClose, optionAlt, optionalOpen, optionalClose } = config.connectives;
  const { stdinSymbol } = flags;
  const count = result.count;
  const hasParam = hasTemplate(option, true);
  const hasStdin = option.stdin && stdinSymbol !== undefined;
  const nameCount = formatUsageNames(option, flags, compact, result);
  let hasRequiredPart = !!nameCount;
  if (isPositional(option)) {
    if (nameCount && (hasParam || !isAlone)) {
      result.openAt(optionalOpen, count).close(optionalClose);
      hasRequiredPart = false; // names are optional
    }
  } else if (nameCount > 1 && (hasParam || (!hasStdin && (!isAlone || isRequired)))) {
    result.openAt(exprOpen, count).close(exprClose);
  }
  if (hasParam && formatParam(option, true, result)) {
    hasRequiredPart = true; // parameter is required
  }
  if (hasStdin) {
    let enclose = false;
    if (result.count > count) {
      if (compact) {
        result.close(optionAlt).merge = true;
      } else {
        result.word(optionAlt);
      }
      enclose = !isAlone || !hasRequiredPart || isRequired;
    } else {
      hasRequiredPart = true; // stdin is required
    }
    result.value(getSymbol(stdinSymbol));
    if (enclose) {
      result.openAt(exprOpen, count).close(exprClose);
    }
  }
  return hasRequiredPart;
}

/**
 * Formats an option's names to be included in the usage statement.
 * @param option The option definition
 * @param flags The formatter flags
 * @param compact Whether to keep alternatives compact
 * @param result The resulting string
 * @returns The number of names rendered
 */
function formatUsageNames(
  option: OpaqueOption,
  flags: FormatterFlags,
  compact: boolean,
  result: AnsiString,
): number {
  const { clusterPrefix } = flags;
  const uniqueNames = new Set(getOptionNames(option));
  if (clusterPrefix !== undefined) {
    for (const letter of option.cluster ?? '') {
      uniqueNames.add(clusterPrefix + letter);
    }
  }
  if (uniqueNames.size) {
    const flags: FormattingFlags = {
      sep: config.connectives.optionAlt,
      ...openArrayFlags,
      mergePrev: compact,
      mergeNext: compact,
    };
    result.value([...uniqueNames].map(getSymbol), flags);
  }
  return uniqueNames.size;
}

/**
 * Formats an option's parameter to be included in the description or the usage statement.
 * @param option The option definition
 * @param isUsage Whether the parameter appears in a usage statement
 * @param result The resulting string
 * @returns True if a non-optional part was rendered
 */
function formatParam(option: OpaqueOption, isUsage: boolean, result: AnsiString): boolean {
  const { optionalOpen, optionalClose } = config.connectives;
  const { example, separator, paramName, usageParamName } = option;
  const name = isUsage ? (usageParamName ?? paramName) : paramName;
  const inline = checkInline(option, getLastOptionName(option) ?? '') === 'always';
  const [min, max] = getParamCount(option);
  const optional = !min && !!max;
  const ellipsis = !inline && (!max || !isFinite(max)) ? '...' : '';
  const [openBracket, closeBracket] = optional ? [optionalOpen, optionalClose] : ['', ''];
  const sty = option.styles?.param ?? config.styles.value;
  const count = result.count;
  if (inline) {
    result.merge = true; // to merge with names column, if required
  }
  result
    .pushSty(sty)
    .open(openBracket)
    .open(inline ? '=' : '');
  if (name === undefined) {
    let param = example;
    if (separator && isArray(param)) {
      const sep = isString(separator) ? separator : separator.source;
      param = param.join(sep);
    }
    result.value(param, { sep: '', ...openArrayNoMergeFlags });
  } else {
    result.append(name); // split parameter name, if necessary
  }
  if (result.count > count) {
    result.close(ellipsis);
  } else {
    result.word(ellipsis);
  }
  result.close(closeBracket).popSty();
  return !optional;
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
  result.value(getSymbol(name));
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
  result.value(items, { ...flags, sep, custom, mergePrev: false });
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
  result.value(getSymbol(name));
  if (!requireAbsent && !requirePresent) {
    const connective = negate ? connectives.notEquals : connectives.equals;
    result.word(connective).value(value);
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
  result.value(callback);
}
