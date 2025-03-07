import type { Options, ParsingFlags, ParserSuggestion } from 'tsargp';
import { parse, JsonMessage } from 'tsargp';

/**
 * Converts a suggestion emitted by parser to another that can be consumed by Fig.
 * @param suggestion The parser suggestion
 * @returns The Fig suggestion
 */
function convertSuggestion(suggestion: object): Fig.Suggestion {
  const { type, name, displayName, synopsis } = suggestion as ParserSuggestion;
  return {
    name,
    type: type === 'parameter' ? 'arg' : type === 'command' ? 'subcommand' : 'option',
    displayName,
    description: synopsis,
  };
}

/**
 * Creates a suggestion generator for a command.
 * @param options The option definitions
 * @param flags The parsing flags
 * @returns The suggestion generator
 */
export function createGenerator(options: Options, flags: ParsingFlags): Fig.Generator {
  return {
    custom: async (tokens) => {
      try {
        // this will run in the completion engine process
        process.env['COMP_JSON'] = '1';
        process.env['COMP_POINT'] = '1';
        await parse(options, tokens.slice(1), flags);
      } catch (err) {
        if (err instanceof JsonMessage) {
          return err.map(convertSuggestion);
        }
      }
      return [];
    },
  };
}
