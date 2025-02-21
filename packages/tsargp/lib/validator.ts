//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type { OpaqueOption, Requires, RequiresVal, OpaqueOptions } from './options.js';
import type { Args, NamingRules } from './utils.js';

import { ErrorItem } from './enums.js';
import { getParamCount, getOptionNames, visitRequirements, isMessage } from './options.js';
import { WarnMessage, ErrorFormatter } from './styles.js';
import { findSimilar, getEntries, getSymbol, getValues, matchNamingRules, regex } from './utils.js';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The naming convention rules.
 */
const namingConventions = {
  cases: {
    lowercase: (name, lower, upper) => name === lower && name !== upper, // has at least one lower
    UPPERCASE: (name, lower, upper) => name !== lower && name === upper, // has at least one upper
    Capitalized: (name, lower, upper) => name[0] !== lower[0] && name !== upper, // has at least one lower
  },
  dashes: {
    noDash: (name) => name[0] !== '-',
    '-singleDash': (name) => name[0] === '-' && name[1] !== '-',
    '--doubleDash': (name) => name[0] === '-' && name[1] === '-',
  },
  delimiters: {
    'kebab-case': (name) => !!name.match(/[^-]+-[^-]+/),
    snake_case: (name) => !!name.match(/[^_]+_[^_]+/),
    'colon:case': (name) => !!name.match(/[^:]+:[^:]+/),
  },
} as const satisfies NamingRules;

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * The validation flags.
 */
export type ValidationFlags = {
  /**
   * Whether the validation procedure should skip detection of naming inconsistencies.
   */
  readonly noNamingIssues?: boolean;
  /**
   * Whether the validation procedure should skip recursion into nested options.
   */
  readonly noRecurse?: boolean;
};

/**
 * The validation result.
 */
export type ValidationResult = {
  /**
   * The warnings generated by the validator, if any.
   */
  readonly warning?: WarnMessage;
};

//--------------------------------------------------------------------------------------------------
// Internal types
//--------------------------------------------------------------------------------------------------
/**
 * The validation context.
 */
type ValidateContext = [
  /**
   * The option definitions.
   */
  options: OpaqueOptions,
  /**
   * The error formatter instance.
   */
  formatter: ErrorFormatter,
  /**
   * The validation flags.
   */
  flags: ValidationFlags,
  /**
   * The list of warnings.
   */
  warning: WarnMessage,
  /**
   * An internal flag to avoid cyclic recurrence.
   */
  visited: Set<OpaqueOptions>,
  /**
   * The current option prefix.
   */
  prefix: string,
];

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Implements validation of option definitions.
 */
export class OptionValidator extends ErrorFormatter {
  /**
   * Creates an option registry based on a set of option definitions.
   * @param options The option definitions
   */
  constructor(readonly options: OpaqueOptions) {
    super();
  }

  /**
   * Validates all options' definitions, including command options recursively.
   * @param flags The validation flags
   * @returns The validation result
   */
  async validate(flags: ValidationFlags = {}): Promise<ValidationResult> {
    const warning = new WarnMessage();
    const visited = new Set<OpaqueOptions>();
    const context: ValidateContext = [this.options, this, flags, warning, visited, ''];
    await validate(context);
    return warning.length ? { warning } : {};
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Validates all options' definitions, including command options recursively.
 * @param context The validation context
 * @throws On duplicate positional option
 */
async function validate(context: ValidateContext) {
  const [options, formatter, flags, , , prefix] = context;
  const names = new Map<string, string>();
  const letters = new Map<string, string>();
  let positional = ''; // to check for duplicate positional options
  for (const [key, option] of getEntries(options)) {
    validateNames(context, names, letters, key, option);
    await validateOption(context, key, option);
    if (option.positional !== undefined) {
      if (positional) {
        throw formatter.error(
          ErrorItem.duplicatePositionalOption,
          {},
          getSymbol(prefix + key),
          getSymbol(prefix + positional),
        );
      }
      positional = key;
    }
  }
  if (!flags.noNamingIssues) {
    detectNamingIssues(context, names);
  }
}

/**
 * Registers or validates an option's names.
 * @param context The validation context
 * @param nameToKey The map of option names to keys
 * @param letterToKey The map of cluster letters to key
 * @param key The option key
 * @param option The option definition
 * @throws On invalid option name, duplicate name, invalid cluster letter or duplicate letter
 */
function validateNames(
  context: ValidateContext,
  nameToKey: Map<string, string>,
  letterToKey: Map<string, string>,
  key: string,
  option: OpaqueOption,
) {
  const [, formatter, , , , prefix] = context;
  const prefixedKey = getSymbol(prefix + key);
  const names = getOptionNames(option);
  for (const name of names) {
    if (name.match(regex.name)) {
      throw formatter.error(ErrorItem.invalidOptionName, {}, prefixedKey, name);
    }
    if (nameToKey.has(name)) {
      throw formatter.error(ErrorItem.duplicateOptionName, {}, prefixedKey, name);
    }
    nameToKey.set(name, key);
  }
  for (const letter of option.cluster ?? '') {
    if (letter.match(regex.name)) {
      throw formatter.error(ErrorItem.invalidClusterLetter, {}, prefixedKey, letter);
    }
    if (letterToKey.has(letter)) {
      throw formatter.error(ErrorItem.duplicateClusterLetter, {}, prefixedKey, letter);
    }
    letterToKey.set(letter, key);
  }
}

/**
 * Detects option naming issues.
 * @param context The validation context
 * @param nameToKey The map of option names to keys
 */
function detectNamingIssues(context: ValidateContext, nameToKey: Map<string, string>) {
  /** @ignore */
  function warn(kind: ErrorItem, ...args: Args) {
    warning.push(formatter.create(kind, { open: '', close: '' }, ...args));
  }
  const [options, formatter, , warning, , prefix] = context;
  const prefix2 = getSymbol(prefix.slice(0, -1)); // remove trailing dot
  const visited = new Set<string>();
  for (const name of nameToKey.keys()) {
    if (!visited.has(name)) {
      const similar = findSimilar(name, nameToKey.keys(), 0.8);
      if (similar.length) {
        warn(ErrorItem.tooSimilarOptionNames, prefix2, name, similar);
        for (const similarName of similar) {
          visited.add(similarName);
        }
      }
    }
  }
  const slots: Array<Array<string>> = [];
  for (const option of getValues(options)) {
    option.names?.forEach((name, i) => {
      if (name !== null) {
        if (i < slots.length) {
          slots[i].push(name);
        } else {
          slots[i] = [name];
        }
      }
    });
  }
  slots.forEach((slot, i) => {
    const match = matchNamingRules(slot, namingConventions);
    // produce a warning for each naming rule category with more than one match,
    // with a list of key-value pairs (rule name, first match) as info
    for (const entries of getValues(match).map(getEntries)) {
      if (entries.length > 1) {
        const list = entries.map(([rule, name]) => rule + ': ' + name);
        warn(ErrorItem.mixedNamingConvention, prefix2, i, list);
      }
    }
  });
}

/**
 * Validates an option's attributes.
 * @param context The validation context
 * @param key The option key
 * @param option The option definition
 * @throws On invalid constraint definition, invalid default/example value or invalid requirements
 */
async function validateOption(context: ValidateContext, key: string, option: OpaqueOption) {
  const [, formatter, flags, warning, visited, prefix] = context;
  const prefixedKey = getSymbol(prefix + key);
  validateConstraints(context, prefixedKey, option);
  if (option.requires) {
    validateRequirements(context, key, option.requires);
  }
  if (option.requiredIf) {
    validateRequirements(context, key, option.requiredIf);
  }
  if (!flags.noRecurse && option.type === 'command') {
    if (option.options) {
      // do not destructure `options`, because the callback might need to use `this`
      const resolved =
        typeof option.options === 'function' ? await option.options() : option.options;
      if (!visited.has(resolved)) {
        visited.add(resolved);
        // create a new context, to avoid changing the behavior of functions up in the call stack
        await validate([resolved, formatter, flags, warning, visited, prefix + key + '.']);
      }
    }
  }
}

/**
 * Validates an option's requirements.
 * @param context The validation context
 * @param key The option key
 * @param requires The option requirements
 */
function validateRequirements(context: ValidateContext, key: string, requires: Requires) {
  /** @ignore */
  function validateItem(item: Requires) {
    validateRequirements(context, key, item);
  }
  visitRequirements(
    requires,
    (req) => validateRequirement(context, key, req),
    (req) => validateItem(req.item),
    (req) => req.items.forEach(validateItem),
    (req) => req.items.forEach(validateItem),
    (req) => getEntries(req).forEach((entry) => validateRequirement(context, key, ...entry)),
    () => {}, // requirement callbacks are ignored
  );
}

/**
 * Validates an option requirement.
 * @param context The validation context
 * @param key The option key
 * @param requiredKey The required option key
 * @param requiredValue The required value, if any
 * @throws On option requiring itself, unknown required option, invalid required option, invalid
 * or incompatible required value
 */
function validateRequirement(
  context: ValidateContext,
  key: string,
  requiredKey: string,
  requiredValue?: RequiresVal[string],
) {
  const [options, formatter, , , , prefix] = context;
  const prefixedKey = getSymbol(prefix + requiredKey);
  if (requiredKey === key) {
    throw formatter.error(ErrorItem.invalidSelfRequirement, {}, prefixedKey);
  }
  if (!(requiredKey in options)) {
    throw formatter.error(ErrorItem.unknownRequiredOption, {}, prefixedKey);
  }
  const option = options[requiredKey];
  if (isMessage(option.type)) {
    throw formatter.error(ErrorItem.invalidRequiredOption, {}, prefixedKey);
  }
  const noValue = {};
  if ((requiredValue ?? noValue) === noValue && (option.required || option.default !== undefined)) {
    throw formatter.error(ErrorItem.invalidRequiredValue, {}, prefixedKey);
  }
}

/**
 * Checks the sanity of the option's constraints.
 * @param context The validation context
 * @param key The option key (plus the prefix, if any)
 * @param option The option definition
 * @throws On duplicate choice value, invalid parameter count or invalid inline constraint
 */
function validateConstraints(context: ValidateContext, key: symbol, option: OpaqueOption) {
  const [, formatter, , warning] = context;
  const choices = option.choices;
  if (Array.isArray(choices)) {
    const set = new Set(choices);
    if (set.size !== choices.length) {
      const dup = choices.find((val) => !set.delete(val));
      if (dup) {
        throw formatter.error(ErrorItem.duplicateChoiceValue, {}, key, dup);
      }
    }
  }
  const paramCount = option.paramCount;
  let valid;
  if (typeof paramCount === 'object') {
    const [min, max] = paramCount;
    valid = min >= 0 && min < max;
  } else {
    valid = paramCount === undefined || paramCount > 1;
  }
  if (!valid) {
    throw formatter.error(ErrorItem.invalidParamCount, {}, key, paramCount);
  }
  const [min, max] = getParamCount(option);
  if (max > 1 && !option.separator && !option.append && option.inline) {
    throw formatter.error(ErrorItem.invalidInlineConstraint, {}, key);
  }
  if (min < max && option.cluster) {
    warning.push(formatter.create(ErrorItem.variadicWithClusterLetter, {}, key));
  }
}
