//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  OpaqueOption,
  Requires,
  RequiresVal,
  OpaqueOptions,
  NestedOptions,
  ModuleResolutionCallback,
} from './options.js';
import type { NamingRules } from './utils.js';

import { ErrorItem } from './enums.js';
import {
  getParamCount,
  getOptionNames,
  visitRequirements,
  isMessage,
  getNestedOptions,
} from './options.js';
import { ErrorMessage, WarnMessage } from './styles.js';
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
    'kebab-case': (name) => regex.kebab.test(name),
    snake_case: (name) => regex.snake.test(name),
    'colon:case': (name) => regex.colon.test(name),
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
  /**
   * A resolution function for JavaScript modules.
   * Use `import.meta.resolve.bind(import.meta)`. Use in non-browser environments only.
   */
  readonly resolve?: ModuleResolutionCallback;
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
type ValidationContext = [
  /**
   * The option definitions.
   */
  options: OpaqueOptions,
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
  visited: Set<NestedOptions>,
  /**
   * The current option prefix.
   */
  prefix: string,
];

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * Validates a set of option definitions.
 * @param options The option definitions
 * @param flags The validation flags
 * @returns The validation result
 */
export async function validate(
  options: OpaqueOptions,
  flags: ValidationFlags = {},
): Promise<ValidationResult> {
  const warning = new WarnMessage();
  const visited = new Set<NestedOptions>();
  await validateOptions([options, flags, warning, visited, '']);
  return warning.length ? { warning } : {};
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/**
 * Validates all option definitions, including nested options recursively.
 * @param context The validation context
 * @throws On duplicate positional option
 */
async function validateOptions(context: ValidationContext) {
  const [options, flags, , , prefix] = context;
  const names = new Map<string, string>();
  const letters = new Map<string, string>();
  let positional = ''; // to check for duplicate positional options
  for (const [key, option] of getEntries(options)) {
    validateNames(context, names, letters, key, option);
    await validateOption(context, key, option);
    if (option.positional !== undefined) {
      if (positional) {
        throw ErrorMessage.create(
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
  context: ValidationContext,
  nameToKey: Map<string, string>,
  letterToKey: Map<string, string>,
  key: string,
  option: OpaqueOption,
) {
  const [, , , , prefix] = context;
  const prefixedKey = getSymbol(prefix + key);
  const names = getOptionNames(option);
  for (const name of names) {
    if (name.includes('=')) {
      throw ErrorMessage.create(ErrorItem.invalidOptionName, {}, prefixedKey, name);
    }
    if (nameToKey.has(name)) {
      throw ErrorMessage.create(ErrorItem.duplicateOptionName, {}, prefixedKey, name);
    }
    nameToKey.set(name, key);
  }
  for (const letter of option.cluster ?? '') {
    if (letter.includes('=')) {
      throw ErrorMessage.create(ErrorItem.invalidClusterLetter, {}, prefixedKey, letter);
    }
    if (letterToKey.has(letter)) {
      throw ErrorMessage.create(ErrorItem.duplicateClusterLetter, {}, prefixedKey, letter);
    }
    letterToKey.set(letter, key);
  }
}

/**
 * Detects option naming issues.
 * @param context The validation context
 * @param nameToKey The map of option names to keys
 */
function detectNamingIssues(context: ValidationContext, nameToKey: Map<string, string>) {
  const formatFlags = { open: '', close: '' };
  const [options, , warning, , prefix] = context;
  const prefix2 = getSymbol(prefix.slice(0, -1)); // remove trailing dot
  const visited = new Set<string>();
  for (const name of nameToKey.keys()) {
    if (!visited.has(name)) {
      const similar = findSimilar(name, nameToKey.keys(), 0.8);
      if (similar.length) {
        warning.add(ErrorItem.tooSimilarOptionNames, formatFlags, prefix2, name, similar);
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
        warning.add(ErrorItem.mixedNamingConvention, formatFlags, prefix2, i, list);
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
async function validateOption(context: ValidationContext, key: string, option: OpaqueOption) {
  const [, flags, warning, visited, prefix] = context;
  const prefixedKey = getSymbol(prefix + key);
  validateConstraints(context, prefixedKey, option);
  const { requires, requiredIf, type, options } = option;
  if (requires) {
    validateRequirements(context, key, requires);
  }
  if (requiredIf) {
    validateRequirements(context, key, requiredIf);
  }
  if (!flags.noRecurse && type === 'command' && options && !visited.has(options)) {
    visited.add(options);
    const cmdOptions = await getNestedOptions(option, flags.resolve);
    // create a new context, to avoid changing the behavior of functions up in the call stack
    await validateOptions([cmdOptions, flags, warning, visited, prefix + key + '.']);
  }
}

/**
 * Validates an option's requirements.
 * @param context The validation context
 * @param key The option key
 * @param requires The option requirements
 */
function validateRequirements(context: ValidationContext, key: string, requires: Requires) {
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
  context: ValidationContext,
  key: string,
  requiredKey: string,
  requiredValue?: RequiresVal[string],
) {
  const [options, , , , prefix] = context;
  const prefixedKey = getSymbol(prefix + requiredKey);
  if (requiredKey === key) {
    throw ErrorMessage.create(ErrorItem.invalidSelfRequirement, {}, prefixedKey);
  }
  if (!(requiredKey in options)) {
    throw ErrorMessage.create(ErrorItem.unknownRequiredOption, {}, prefixedKey);
  }
  const option = options[requiredKey];
  if (isMessage(option.type)) {
    throw ErrorMessage.create(ErrorItem.invalidRequiredOption, {}, prefixedKey);
  }
  const noValue = {};
  if ((requiredValue ?? noValue) === noValue && (option.required || option.default !== undefined)) {
    throw ErrorMessage.create(ErrorItem.invalidRequiredValue, {}, prefixedKey);
  }
}

/**
 * Checks the sanity of the option's constraints.
 * @param context The validation context
 * @param key The option key (plus the prefix, if any)
 * @param option The option definition
 * @throws On duplicate choice value, invalid parameter count or invalid inline constraint
 */
function validateConstraints(context: ValidationContext, key: symbol, option: OpaqueOption) {
  const [, , warning] = context;
  const { choices } = option;
  if (choices) {
    const set = new Set(choices);
    if (set.size !== choices.length) {
      const dup = choices.find((val) => !set.delete(val));
      if (dup) {
        throw ErrorMessage.create(ErrorItem.duplicateChoiceValue, {}, key, dup);
      }
    }
  }
  const { paramCount } = option;
  if (typeof paramCount === 'object' && (paramCount[0] < 0 || paramCount[0] >= paramCount[1])) {
    throw ErrorMessage.create(ErrorItem.invalidParamCount, {}, key, paramCount);
  }
  const [min, max] = getParamCount(option);
  if ((!max || max > 1) && !option.separator && !option.append && option.inline) {
    throw ErrorMessage.create(ErrorItem.invalidInlineConstraint, {}, key);
  }
  if (min < max && option.cluster) {
    warning.add(ErrorItem.variadicWithClusterLetter, {}, key);
  }
}
