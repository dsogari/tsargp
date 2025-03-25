import { describe, expect, it } from 'bun:test';
import type { HelpSection, HelpSections, Options } from '../../src/library';
import { format, tf, style } from '../../src/library';

describe('format', () => {
  it('handle zero options', () => {
    expect(format({}).wrap()).toEqual('');
  });

  it('handle zero sections', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;
    expect(format(options, []).wrap()).toEqual('');
  });

  it('hide an option when it asks so', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f', '--flag'],
        synopsis: 'A flag option',
        group: null,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual('');
  });

  it('handle a command option', () => {
    const options = {
      command: {
        type: 'command',
        names: ['-c'],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -c\n`);
  });

  it('handle an option with no names or description', () => {
    const options = {
      flag: {
        type: 'flag',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual('\n');
  });

  it('handle an option with no description', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual('  -f\n');
  });

  it('handle an option with empty names array', () => {
    const options = {
      flag: {
        type: 'flag',
        names: [],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual('\n');
  });

  it('handle options with phantom names', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['', ' ', null],
        synopsis: 'A phantom option.',
      },
      flag2: {
        type: 'flag',
        names: [' ', '', null],
        synopsis: 'A phantom option.',
      },
      flag3: {
        type: 'flag',
        names: [' ', null, '  '],
        synopsis: 'A phantom option.',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      '  ,        A phantom option.\n' + // one unquoted name with spaces
        '   ,       A phantom option.\n' + // one unquoted name with spaces
        '   ,       A phantom option.\n', // two unquoted names with spaces
    );
  });

  it('handle an option with custom styles', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f', '--flag', '--flag1'],
        synopsis: 'A flag option.',
        default: 1,
        styles: {
          names: style(tf.bold),
          descr: style(tf.italic),
        },
      },
    } as const satisfies Options;
    expect(format(options).wrap(0, true)).toEqual(
      '  \x1b[1m' + // activate bold style
        '-f' +
        '\x1b[22m' + // cancel bold style
        ', ' +
        '\x1b[1m' + // each name has its own ANSI string
        '--flag' +
        '\x1b[22m' +
        ', ' +
        '\x1b[1m' +
        '--flag1' +
        '\x1b[22m' +
        '    ' +
        '\x1b[3m' + // activate italic style
        'A flag option. Defaults to ' +
        '\x1b[33m' +
        '1' +
        '\x1b[39m' + // italic remains active
        '.' +
        '\x1b[23m' + // cancel italic style
        '\n',
    );
  });

  it('handle an option with inline styles in the description', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: `A ${style(tf.bold)}flag${style(tf.clear)} option`,
      },
    } as const satisfies Options;
    expect(format(options).wrap(0, true)).toEqual(
      '  \x1b[35m' + '-f' + '\x1b[39m' + '    A ' + '\x1b[1m' + 'flag' + '\x1b[0m' + ' option\n',
    );
  });

  it('handle an option with paragraphs in the description', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: `A flag option with
          line breaks,\ttabs and ...

          paragraphs`,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toMatch(
      /^ {2}-f {4}A flag option with line breaks, tabs and ...\n\n {8}paragraphs\n$/,
    );
  });

  it('handle an option with lists in the description', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: `A flag option with lists:
          - item1
          * item2
          1. item3`,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toMatch(
      /^ {2}-f {4}A flag option with lists:\n {8}- item1\n {8}\* item2\n {8}1\. item3\n$/,
    );
  });

  it('avoid splitting section texts when explicitly asked', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;
    const section: HelpSection = {
      type: 'text',
      heading: { text: `section ${style(tf.clear)} heading`, noSplit: true },
      content: { text: `section ${style(tf.clear)} content`, noSplit: true },
    };
    const sections: HelpSections = [
      { ...section, type: 'text' },
      { ...section, type: 'usage' },
      { ...section, type: 'groups' },
    ];
    expect(format(options, sections).wrap(10, false, true)).toEqual(
      'section  heading\n' +
        'section  content\n' +
        'section  heading\n' +
        'section  content\n' +
        '[-f]\n' +
        'section  heading\n' +
        'section  content\n\n' +
        '  -f\n',
    );
  });
});
