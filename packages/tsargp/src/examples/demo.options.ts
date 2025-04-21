import type { Options } from 'tsargp';
import {
  allHelpItems,
  allOf,
  ansi,
  envHelpItems,
  ext8,
  fg,
  HelpItem,
  not,
  numberInRange,
  oneOf,
  rgb,
  tf,
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
        heading: {
          text: 'Argument parser for TypeScript.',
          style: [tf.bold],
          breaks: 1,
          noBreakFirst: true,
        },
        content: { breaks: 2 },
        layout: {
          names: { align: 'right' },
          items: allHelpItems.filter((item) => item !== HelpItem.sources),
        },
      },
      {
        type: 'usage',
        heading: { text: 'Usage:', style: [tf.bold], breaks: 1 },
        content: { indent: 2, breaks: 2 },
        filter: { includeOptions: ['help', 'version', 'helpEnv'] },
        comment: ansi.style(fg.green)`# get help`,
      },
      {
        type: 'usage',
        content: { indent: 2 },
        filter: { includeOptions: ['hello'] },
        comment: ansi.style(fg.green)`# execute the hello command`,
        required: ['hello'],
      },
      {
        type: 'usage',
        content: { indent: 2 },
        filter: { excludeOptions: ['help', 'version', 'helpEnv', 'hello'] },
        inclusive: { boolean: 'strChoice' },
        showMarker: true,
      },
    ],
    useCommand: true,
    useFilter: true,
  },
  /**
   * A help option that throws a help message containing only environment variable names.
   */
  helpEnv: {
    type: 'help',
    names: ['--env'],
    synopsis: 'A help option. Prints the available environment variables.',
    sections: [
      {
        type: 'groups',
        heading: {
          text: 'Argument parser for TypeScript.',
          style: [tf.bold],
          breaks: 1,
          noBreakFirst: true,
        },
        content: { breaks: 2 },
        layout: { param: null, items: envHelpItems },
        useEnv: true,
      },
    ],
    useFilter: true,
  },
  /**
   * A version option that throws the package version.
   */
  version: {
    type: 'version',
    names: ['-v', '--version'],
    synopsis: 'A version option. Prints the package version.',
    version: 'unavailable in the browser', // will be injected from demo.ts
  },
  /**
   * A flag option that is deprecated for some reason.
   */
  flag: {
    type: 'flag',
    names: ['-f', '--no-flag'],
    sources: ['FLAG', 'NO_FLAG'],
    synopsis: 'A flag option.',
    deprecated: 'some reason',
    parse(_, { name }) {
      return name !== this.names?.[1] && name !== this.sources?.[1];
    },
    styles: {
      names: [fg.extended, rgb(160, 100, 64)],
      descr: [tf.italic, tf.crossedOut],
    },
  },
  /**
   * A command option that logs the arguments passed after it.
   */
  hello: helloOpts.hello,
  /**
   * A boolean option that has styles and requirements.
   */
  boolean: {
    type: 'single',
    names: ['-b', '--boolean'],
    sources: ['BOOLEAN'],
    synopsis: ansi`A boolean option
    with:
    * a paragraph;
    - ${ansi.style(tf.underlined, fg.extended, ext8(223))`a style`}; and
    1. a list
    
    `,
    paramName: '<param>',
    choices: ['yes', 'no'],
    mapping: { yes: true, no: false },
    normalize: (param) => param.toLowerCase(),
    default: false,
    requires: oneOf('strChoice', allOf({ strArray: ['a', 'b'] }, not({ numArray: [1, 2] }))),
  },
  /**
   * A string option that has a regex constraint.
   */
  strRegex: {
    type: 'single',
    names: ['-sr', '--strRegex'],
    sources: ['STR_REGEX'],
    synopsis: 'A string option.',
    group: 'String options:',
    regex: /^\d+$/,
    default: '123456789',
    paramName: 'my str',
    cluster: 's',
    styles: { param: [fg.brightBlack, tf.underlined] },
  },
  /**
   * A number option that has a range constraint.
   */
  numRange: {
    type: 'single',
    names: ['-nr', '--numRange'],
    sources: ['NUM_RANGE'],
    synopsis: ansi`A number option. The minimum accepted value is ${-2}.`,
    group: 'Number options:',
    parse: numberInRange(
      [-2, Infinity],
      'Invalid parameter to #0: #1. Value must be within the range #2.',
    ),
    default: -1.23,
    paramName: 'my num',
    cluster: 'n',
    styles: { param: [fg.brightBlack, tf.underlined] },
  },
  /**
   * A string option that has a choices constraint and disallows inline parameters.
   */
  strChoice: {
    type: 'single',
    names: ['-sc', '--strChoice'],
    sources: ['STR_CHOICE'],
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
    sources: ['NUM_CHOICE'],
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
    sources: ['STR_ARRAY'],
    synopsis: 'A string array option.',
    group: 'String options:',
    paramName: '<str>',
    cluster: 'S',
    default: ['one'],
    separator: ',',
    stdin: true,
  },
  /**
   * A number array option with a default value.
   */
  numArray: {
    type: 'array',
    names: ['-na', '--numArray'],
    sources: ['NUM_ARRAY'],
    synopsis: 'A number array option.',
    group: 'Number options:',
    paramName: '<num>',
    cluster: 'N',
    parse: Number,
    default: [1, 2],
  },
  /**
   * A string array option that accepts positional arguments, but no more than 3 elements.
   */
  strArrayLimit: {
    type: 'array',
    names: [null, '--strArrayLimit'],
    sources: ['STR_ARRAY_LIMIT'],
    synopsis: 'A string array option.',
    group: 'String options:',
    example: ['one'],
    positional: true,
    limit: 3,
  },
  /**
   * A number array option that can be supplied multiple times, whose elements are unique.
   */
  numArrayUnique: {
    type: 'array',
    names: [null, '--numArrayUnique'],
    sources: ['NUM_ARRAY_UNIQUE'],
    synopsis: 'A number array option.',
    group: 'Number options:',
    example: [1, 2],
    parse: Number,
    separator: ',',
    append: true,
    unique: true,
  },
} as const satisfies Options;
