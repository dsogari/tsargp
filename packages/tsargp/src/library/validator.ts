//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import type {
  NestedOptions,
  OpaqueOption,
  OpaqueOptions,
  Requires,
  RequiresVal,
} from './options.js';
import type { NamingRules } from './utils.js';

import { ErrorItem } from './enums.js';
import { ErrorMessage } from './styles.js';
import {
  error,
  findSimilar,
  getEntries,
  getKeys,
  getNestedOptions,
  getOptionEnvVars,
  getOptionNames,
  getParamCount,
  getSymbol,
  getValues,
  hasSuppliableName,
  isCommand,
  isEnvironmentOnly,
  isMessage,
  isObject,
  matchNamingRules,
  normalizeArray,
  regex,
  visitRequirements,
} from './utils.js';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
/**
 * The naming convention rules.
 */
const namingConventions: NamingRules = {
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
};

//--------------------------------------------------------------------------------------------------
// Public types
//--------------------------------------------------------------------------------------------------
/**
 * The validation flags.
 */
export type ValidationFlags = {
  /**
   * Whether the validation procedure should skip generation of warnings.
   */
  readonly noWarn?: boolean;
  /**
   * Whether the validation procedure should skip recursion into nested options.
   */
  readonly noRecurse?: boolean;
  /**
   * The similarity threshold for similar option name validation.
   * Values are given in percentage (e.g., `0.8`). Zero or `NaN` means disabled.
   * @default NaN
   */
  readonly similarity?: number;
};

/**
 * The validation result.
 */
export type ValidationResult = {
  /**
   * The warnings generated by the validator, if any.
   */
  readonly warning?: ErrorMessage;
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
  warning: ErrorMessage,
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
// Functions
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
  const warning = new ErrorMessage();
  const visited = new Set<NestedOptions>();
  await validateOptions([options, flags, warning, visited, '']);
  return warning.length ? { warning } : {};
}

/**
 * Validates all option definitions, including nested options recursively.
 * @param context The validation context
 */
async function validateOptions(context: ValidationContext) {
  const [options, flags] = context;
  const names = new Map<string, string>();
  const letters = new Map<string, string>();
  const envVars = new Map<string, string>();
  for (const [key, option] of getEntries(options)) {
    validateNames(context, names, getOptionNames(option), key);
    validateNames(context, letters, option.cluster ?? '', key);
    validateNames(context, envVars, getOptionEnvVars(option) ?? [], key);
    await validateOption(context, key, option);
  }
  if (!flags.noWarn) {
    detectNamingIssues(context, names);
  }
}

/**
 * Registers and validates names.
 * @param context The validation context
 * @param nameToKey The map of names to keys
 * @param names The list of names
 * @param key The option key
 * @throws On invalid name or duplicate name
 */
function validateNames(
  context: ValidationContext,
  nameToKey: Map<string, string>,
  names: string | ReadonlyArray<string>,
  key: string,
) {
  const prefix = context[4];
  for (const name of names) {
    if (name.includes('=')) {
      throw error(ErrorItem.invalidOptionName, prefix + key, {}, name);
    }
    if (nameToKey.has(name)) {
      throw error(ErrorItem.duplicateOptionName, prefix + key, {}, name);
    }
    nameToKey.set(name, key);
  }
}

/**
 * Detects option naming issues.
 * @param context The validation context
 * @param nameToKey The map of option names to keys
 */
function detectNamingIssues(context: ValidationContext, nameToKey: Map<string, string>) {
  const formatFlags = { open: '', close: '' };
  const [options, flags, warning, , prefix] = context;
  const prefix2 = getSymbol(prefix.slice(0, -1)); // remove trailing dot
  if (flags.similarity) {
    const visited = new Set<string>();
    for (const name of nameToKey.keys()) {
      if (!visited.has(name)) {
        const similar = findSimilar(name, nameToKey.keys(), flags.similarity);
        if (similar.length) {
          warning.add(ErrorItem.tooSimilarOptionNames, formatFlags, prefix2, name, similar);
          for (const similarName of similar) {
            visited.add(similarName);
          }
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
 * @throws On invalid constraint or invalid requirements
 */
async function validateOption(context: ValidationContext, key: string, option: OpaqueOption) {
  const [, flags, warning, visited, prefix] = context;
  validateConstraints(context, key, option);
  const { requires, requiredIf, type, options, stdin, sources } = option;
  if (requires) {
    validateRequirements(context, key, requires);
  }
  if (requiredIf) {
    validateRequirements(context, key, requiredIf);
  }
  if (!flags.noRecurse && isCommand(type) && options && !visited.has(options)) {
    visited.add(options);
    const cmdOptions = await getNestedOptions(option);
    // create a new context, to avoid changing the behavior of functions up in the call stack
    await validateOptions([cmdOptions, flags, warning, visited, prefix + key + '.']);
  }
  if (isEnvironmentOnly(option) && !stdin && !sources?.length) {
    throw error(ErrorItem.invalidOption, prefix + key);
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
  if (requiredKey === key) {
    throw error(ErrorItem.invalidSelfRequirement, prefix + requiredKey);
  }
  if (!(requiredKey in options)) {
    throw error(ErrorItem.unknownRequiredOption, prefix + requiredKey);
  }
  const option = options[requiredKey];
  if (isMessage(option.type)) {
    throw error(ErrorItem.invalidRequiredOption, prefix + requiredKey);
  }
  const noValue = {};
  if ((requiredValue ?? noValue) === noValue && (option.required || option.default !== undefined)) {
    throw error(ErrorItem.invalidRequiredValue, prefix + requiredKey);
  }
}

/**
 * Checks the sanity of the option's constraints.
 * @param context The validation context
 * @param key The option key
 * @param option The option definition
 * @throws On duplicate choice value, invalid parameter count or invalid inline constraint
 */
function validateConstraints(context: ValidationContext, key: string, option: OpaqueOption) {
  const [, flags, warning, , prefix] = context;
  const { type, choices, paramCount, example, inline, append, separator, cluster, names } = option;
  if (choices) {
    const set = new Set(choices);
    if (set.size !== choices.length) {
      const dup = choices.find((val) => !set.delete(val));
      if (dup !== undefined) {
        throw error(ErrorItem.duplicateParameterChoice, prefix + key, {}, dup);
      }
    }
  }
  if (
    paramCount !== undefined &&
    (isObject(paramCount)
      ? !(paramCount[0] >= 0) || !(paramCount[0] < paramCount[1])
      : !(paramCount >= 0)) // handle NaN
  ) {
    throw error(ErrorItem.invalidParamCount, prefix + key, {}, paramCount);
  }
  const [min, max] = getParamCount(option);
  if (
    inline !== undefined &&
    (!hasSuppliableName(option) ||
      (inline === 'always'
        ? (!max || max > 1) && !separator && !append
        : inline && getKeys(inline).findIndex((key) => !names?.includes(key)) >= 0))
  ) {
    throw error(ErrorItem.invalidInlineConstraint, prefix + key);
  }
  if (!flags.noWarn && min < max && cluster) {
    warning.add(ErrorItem.variadicWithClusterLetter, {}, getSymbol(prefix + key));
  }
  if (type === 'array') {
    normalizeArray(option, prefix + key, example); // ignored if undefined
    normalizeArray(option, prefix + key, option.default); // ignored if undefined
  }
}
