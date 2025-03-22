import type { Options, OptionValues } from 'tsargp';
import { allHelpItems, HelpItem, style, tf } from 'tsargp';

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
    paramName: '',
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
      {
        type: 'usage',
        heading: { text: 'Usage:', style: style(tf.bold) },
        content: { indent: 2, breaks: 2 },
      },
      {
        type: 'groups',
        heading: { text: 'Options:', style: style(tf.bold), breaks: 1 },
        content: { breaks: 2 },
        layout: { param: { align: 'merge' } },
        items: allHelpItems.filter((item) => item !== HelpItem.positional),
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
    paramName: '',
    options: (): Options => options,
    parse(param): number {
      const vals = param as OptionValues<typeof options>;
      const calls = vals.hello ?? 0;
      console.log(`[tail call #${calls}]`, ...vals.args);
      return calls + 1;
    },
  },
} as const satisfies Options;

export default options;
