import {
  type Options,
  fg,
  style,
  allOf,
  oneOf,
  notOf,
  tf,
  fg8,
  numberInRange,
  config,
} from 'tsargp';
import helloOpts from './demo.hello.options.js';

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
    sections: [
      {
        type: 'groups',
        title: `Argument parser for TypeScript.`,
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
        breaks: 0,
        filter: ['hello'],
        comment: `${style(fg.green)}# execute the hello command`,
        required: ['hello'],
      },
      {
        type: 'usage',
        indent: 2,
        breaks: 0,
        filter: ['help', 'version', 'helpCmd', 'hello'],
        exclude: true,
        requires: { boolean: 'strChoice' },
      },
      {
        type: 'text',
        text: `MIT License.
Copyright (c) 2024-2025 ${style(tf.bold, tf.italic)}Diego Sogari${style(tf.clear)}

Report a bug: ${style(fg.brightBlack)}https://github.com/dsogari/tsargp/issues`,
        noWrap: true,
      },
    ],
    useCommand: true,
    useFilter: true,
  },
  /**
   * A version option that throws the package version.
   */
  version: {
    type: 'version',
    names: ['-v', '--version'],
    synopsis: 'A version option. Prints the package version.',
    version: '../../package.json',
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
      names: style(fg8(138)),
      descr: style(tf.italic, tf.crossedOut),
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
    choices: ['yes', 'no'],
    mapping: { yes: true, no: false },
    normalize: (param) => param.toLowerCase(),
    default: false,
    requires: oneOf('strChoice', allOf({ strArray: ['a', 'b'] }, notOf({ numArray: [1, 2] }))),
  },
  /**
   * A string option that has a regex constraint.
   */
  strRegex: {
    type: 'single',
    names: ['-sr', '--strRegex'],
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
  numRange: {
    type: 'single',
    names: ['-nr', '--numRange'],
    synopsis: `A number option. The minimum accepted value is ${config.styles.number}-2${config.styles.text}.`,
    group: 'Number options:',
    parse: numberInRange(
      [-2, Infinity],
      'Invalid parameter to #0: #1. Value must be within the range #2.',
    ),
    default: -1.23,
    paramName: 'my num',
    cluster: 'n',
  },
  /**
   * A string option that has a choices constraint and disallows inline parameters.
   */
  strChoice: {
    type: 'single',
    names: ['-sc', '--strChoice'],
    synopsis: 'A string option.',
    group: 'String options:',
    choices: ['one', 'two'],
    example: 'one',
    inline: false,
  },
  /**
   * A number option that has a choices constraint and requires inline parameters.
   */
  numChoice: {
    type: 'single',
    names: ['-nc', '--numChoice'],
    synopsis: 'A number option.',
    group: 'Number options:',
    choices: ['1', '2'],
    parse: Number,
    example: 1,
    inline: 'always',
  },
  /**
   * A string array option with comma-delimited parameters.
   */
  strArray: {
    type: 'array',
    names: ['-sa', '--strArray'],
    synopsis: 'A string array option.',
    group: 'String options:',
    default: ['one'],
    separator: ',',
  },
  /**
   * A number array option with a default value.
   */
  numArray: {
    type: 'array',
    names: ['-na', '--numArray'],
    synopsis: 'A number array option.',
    group: 'Number options:',
    parse: Number,
    default: [1, 2],
  },
  /**
   * A string array option that accepts positional arguments, but no more than 3 elements.
   */
  strArrayLimit: {
    type: 'array',
    names: [null, '--strArrayLimit'],
    synopsis: 'A string array option.',
    group: 'String options:',
    example: ['one'],
    positional: '--',
    limit: 3,
  },
  /**
   * A number array option that can be specified multiple times, whose elements are unique.
   */
  numArrayUnique: {
    type: 'array',
    names: [null, '--numArrayUnique'],
    synopsis: 'A number array option.',
    group: 'Number options:',
    example: [1, 2],
    parse: Number,
    separator: ',',
    append: true,
    unique: true,
  },
} as const satisfies Options;
