import { createGenerator } from './generator.js';
import options from '../calc.options.js';

/**
 * The completion specification for the Calc command.
 */
export default {
  name: 'calc',
  description: 'Execute the tsargp Calc CLI',
  args: {
    name: 'args',
    generators: createGenerator(options),
  },
} as const satisfies Fig.Subcommand;
