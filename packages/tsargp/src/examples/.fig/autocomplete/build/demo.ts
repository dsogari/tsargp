import { demo as options } from 'tsargp/examples';
import { createGenerator } from './generator.js';

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
