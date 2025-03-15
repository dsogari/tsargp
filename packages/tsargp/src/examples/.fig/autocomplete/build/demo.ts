import { createGenerator } from './generator.js';
import options from '../../../demo.options.js';

/**
 * The completion specification for the Demo command.
 */
export default {
  name: 'demo',
  description: 'Execute the tsargp Demo CLI',
  args: {
    name: 'args',
    generators: createGenerator(options, {
      clusterPrefix: '-',
      optionPrefix: '-',
    }),
  },
} as const satisfies Fig.Subcommand;
