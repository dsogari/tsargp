import { describe, expect, it } from 'bun:test';
import type { HelpSection, HelpSections, Options } from '../../src/library';
import { ansi, format, tf } from '../../src/library';

const boldStr = '\x1b[1m';
const italicStr = '\x1b[3m';
const notBoldStr = '\x1b[22m';
const notItalicStr = '\x1b[23m';
const yellowStr = '\x1b[33m';
const magentaStr = '\x1b[35m';
const noColorStr = '\x1b[39m';

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
      '' +
        '  ,        A phantom option.\n' +
        '   ,       A phantom option.\n' +
        '   ,       A phantom option.\n',
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
          names: [tf.bold],
          descr: [tf.italic],
        },
      },
    } as const satisfies Options;
    expect(format(options).wrap(0, true)).toEqual(
      '  ' +
        boldStr + // activate bold style
        '-f' +
        notBoldStr + // cancel bold style
        ', ' +
        boldStr + // each name has its own ANSI string
        '--flag' +
        notBoldStr +
        ', ' +
        boldStr +
        '--flag1' +
        notBoldStr +
        '    ' +
        italicStr + // activate italic style
        'A flag option. Defaults to ' +
        yellowStr +
        '1' +
        noColorStr + // italic remains active
        '.\n' +
        notItalicStr, // cancel italic style
    );
  });

  it('handle an option with styles in the description', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: ansi`A ${ansi.style(tf.bold)`flag`} option`,
      },
    } as const satisfies Options;
    expect(format(options).wrap(0, true)).toEqual(
      '  ' +
        magentaStr +
        '-f' +
        noColorStr +
        '    A ' +
        boldStr +
        'flag' +
        notBoldStr +
        ' option\n',
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
    expect(format(options).wrap()).toEqual(
      '  -f    A flag option with line breaks, tabs and ...\n\n        paragraphs\n',
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
    expect(format(options).wrap()).toEqual(
      '' +
        '  -f    A flag option with lists:\n' +
        '        - item1\n' +
        '        * item2\n' +
        '        1. item3\n',
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
      heading: { text: `section ${boldStr} heading`, noSplit: true },
      content: { text: `section ${boldStr} content`, noSplit: true },
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

  it('wrap option parameters when the largest word does not fit the width', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        paramName: 'param_name',
      },
    } as const satisfies Options;
    expect(format(options).wrap(10, false, true)).toEqual('  -s\nparam_name\n');
  });
});
