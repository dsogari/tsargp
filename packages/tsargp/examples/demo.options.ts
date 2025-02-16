import type { Options, OptionValues } from 'tsargp';
import { AnsiFormatter, fg, style, req, tf, fg8 } from 'tsargp';

/**
 * The hello option definitions.
 */
const helloOpts = {
  /**
   * A strings option that receives positional arguments for the hello command.
   */
  strings: {
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
    formats: { ansi: AnsiFormatter },
    config: {
      param: { align: 'merge' },
      descr: { indent: -10 },
    },
    useFormat: true,
    useFilter: true,
  },
  /**
   * A recursive command option that logs the arguments passed after it.
   */
  hello: {
    type: 'command',
    names: ['hello'],
    synopsis: 'A recursive command option. Logs the arguments passed after it.',
    options: (): Options => helloOpts,
    parse(param): number {
      const vals = param as OptionValues<typeof helloOpts>;
      const calls = vals.hello ?? 0;
      console.log(`[tail call #${calls}]`, ...vals.strings);
      return calls + 1;
    },
  },
} as const satisfies Options;

/**
 * The main option definitions.
 */
export default {
  /**
   * A help option that throws the help message of the main command.
   */
  help: {
    type: 'help',
    names: ['-h', '--help'],
    synopsis: 'A help option. Prints this help message.',
    formats: { ansi: AnsiFormatter },
    sections: [
      {
        type: 'text',
        text: `${style(tf.bold)}Argument parser for TypeScript.`,
      },
      {
        type: 'groups',
      },
      {
        type: 'usage',
        title: 'Usage:',
        indent: 2,
        filter: ['help', 'version', 'helpCmd'],
        comment: `${style(fg.green)}# get help`,
      },
      {
        type: 'usage',
        indent: 2,
        breaks: 1,
        filter: ['hello'],
        comment: `${style(fg.green)}# execute the hello command`,
        required: ['hello'],
      },
      {
        type: 'usage',
        indent: 2,
        breaks: 1,
        filter: ['help', 'version', 'helpCmd', 'hello'],
        exclude: true,
        requires: { boolean: 'stringEnum' },
      },
      {
        type: 'text',
        text: `MIT License.
Copyright (c) 2024-2025 ${style(tf.bold, tf.italic)}Diego Sogari${style(tf.clear)}

Report a bug: ${style(fg.brightBlack)}https://github.com/dsogari/tsargp/issues`,
        noWrap: true,
      },
    ],
    useNested: true,
    useFormat: true,
    useFilter: true,
  },
  /**
   * A version option that throws the package version.
   */
  version: {
    type: 'version',
    names: ['-v', '--version'],
    synopsis: 'A version option. Prints the package version.',
    resolve: import.meta.resolve,
  },
  /**
   * A flag option that is deprecated for some reason.
   */
  flag: {
    type: 'flag',
    names: ['-f', '--no-flag'],
    synopsis: 'A flag option.',
    deprecated: 'some reason',
    parse(_, { name }) {
      return name !== this.names?.[1];
    },
    styles: {
      names: style(tf.clear, tf.inverse, fg8(138)),
      descr: style(tf.clear, tf.italic, tf.crossedOut),
    },
  },
  /**
   * A command option that logs the arguments passed after it.
   */
  hello: helloOpts.hello,
  /**
   * A boolean option that has inline styles and requirements.
   */
  boolean: {
    type: 'single',
    names: ['-b', '--boolean'],
    synopsis: `A boolean option
    with:
    * a paragraph
    - ${style(tf.underlined, fg8(223))}inline styles${style(fg.default, tf.notUnderlined)}
    1. and a list
    
    `,
    sources: ['BOOLEAN'],
    choices: { yes: true, no: false },
    default: false,
    requires: req.one('stringEnum', req.all({ strings: ['a', 'b'] }, req.not({ numbers: [1, 2] }))),
  },
  /**
   * A string option that has a regex constraint.
   */
  stringRegex: {
    type: 'single',
    names: ['-s', '--stringRegex'],
    synopsis: 'A string option.',
    group: 'String options:',
    regex: /^\d+$/,
    default: '123456789',
    paramName: 'my str',
    cluster: 's',
  },
  /**
   * A number option that has a range constraint.
   */
  numberRange: {
    type: 'single',
    names: ['-n', '--numberRange'],
    synopsis: 'A number option.',
    group: 'Number options:',
    parse: Number,
    default: -1.23,
    paramName: 'my num',
    cluster: 'n',
  },
  /**
   * A string option that has an enumeration constraint.
   */
  stringEnum: {
    type: 'single',
    names: ['-se', '--stringEnum'],
    synopsis: 'A string option.',
    group: 'String options:',
    choices: ['one', 'two'],
    example: 'one',
    inline: false,
  },
  /**
   * A number option that has an enumeration constraint.
   */
  numberEnum: {
    type: 'single',
    names: ['-ne', '--numberEnum'],
    synopsis: 'A number option.',
    group: 'Number options:',
    choices: ['1', '2'],
    parse: Number,
    example: 1,
    inline: 'always',
  },
  /**
   * A delimited strings option whose values are trimmed and converted to uppercase.
   */
  strings: {
    type: 'array',
    names: ['-ss', '--strings'],
    synopsis: 'A strings option.',
    group: 'String options:',
    default: ['one'],
    separator: ',',
  },
  /**
   * A variadic numbers option whose values are rounded to the nearest integer.
   */
  numbers: {
    type: 'array',
    names: ['-ns', '--numbers'],
    synopsis: 'A numbers option.',
    group: 'Number options:',
    parse: Number,
    default: [1, 2],
  },
  /**
   * A variadic strings option that accepts positional arguments, but no more than 3 values.
   */
  stringsLimit: {
    type: 'array',
    names: [null, '--stringsLimit'],
    synopsis: 'A strings option.',
    group: 'String options:',
    example: ['one'],
    positional: '--',
    limit: 3,
  },
  /**
   * A delimited numbers option whose values are unique and can be specified multiple times.
   */
  numbersUnique: {
    type: 'array',
    names: [null, '--numbersUnique'],
    synopsis: 'A numbers option.',
    group: 'Number options:',
    example: [1, 2],
    parse: Number,
    separator: ',',
    append: true,
    unique: true,
  },
} as const satisfies Options;
