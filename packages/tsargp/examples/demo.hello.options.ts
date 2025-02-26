import type { Options, OptionValues, OpaqueOptionValues } from 'tsargp';

/**
 * The option definitions for the hello subcommand.
 */
const options = {
  /**
   * A string array option that receives positional arguments for the hello command.
   */
  args: {
    type: 'array',
    default: ['world'],
    positional: true,
    group: 'Arguments:',
    stdin: true,
  },
  /**
   * A help option that throws the help message of the hello command.
   */
  help: {
    type: 'help',
    names: ['-h', '--help'],
    synopsis: 'The help option for the hello command. Prints this help message.',
    sections: [
      { type: 'usage', title: 'Usage:', indent: 2 },
      {
        type: 'groups',
        title: 'Options:',
        layout: { param: { align: 'merge' } },
      },
    ],
    useFilter: true,
  },
  /**
   * A subcommand that logs the arguments passed after it.
   */
  hello: {
    type: 'command',
    names: ['hello'],
    synopsis: 'A subcommand. Logs the arguments passed after it.',
    options: (): Options => options,
    parse(param: OpaqueOptionValues): number {
      const vals = param as OptionValues<typeof options>;
      const calls = vals.hello ?? 0;
      console.log(`[tail call #${calls}]`, ...vals.args);
      return calls + 1;
    },
  },
} as const satisfies Options;

export default options;
