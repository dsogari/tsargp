import { describe, expect, it } from 'bun:test';
import type { HelpSections, Options } from '../../lib/options';
import { config } from '../../lib/config';
import { HelpItem, tf } from '../../lib/enums';
import { format } from '../../lib/formatter';
import { style } from '../../lib/styles';

describe('format', () => {
  it('handle an option with no names or description', () => {
    const options = {
      flag: { type: 'flag' },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual('\n');
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
      '           A phantom option.\n' + // one unquoted name with spaces
        '           A phantom option.\n' + // one unquoted name with spaces
        '   ,       A phantom option.\n', // two unquoted names with spaces
    );
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

  it('handle an option with custom styles', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f', '--flag', '--flag1'],
        synopsis: 'A flag option.',
        default: 1,
        styles: {
          names: style(tf.bold),
          descr: style(tf.clear, tf.faint),
        },
      },
    } as const satisfies Options;
    expect(format(options).wrap(0, true)).toEqual(
      '  \x1b[0;1m' + // tf.clear comes from default config
        '-f' +
        '\x1b[0m' +
        ', ' +
        '\x1b[0;1m' + // each name has its own ANSI string
        '--flag' +
        '\x1b[0m' +
        ', ' +
        '\x1b[0;1m' +
        '--flag1' +
        '\x1b[0m' +
        '    ' +
        '\x1b[0;2m' + // custom style merged with default one
        'A flag option.' +
        '\x1b[0;2m' + // each help item starts afresh
        ' Defaults to ' +
        '\x1b[33m' +
        '1' +
        '\x1b[0;2m' +
        '.' +
        '\x1b[0;2m' +
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
      '  \x1b[0;35m' +
        '-f' +
        '\x1b[0m' +
        '    ' +
        '\x1b[0m' +
        'A ' +
        '\x1b[1m' +
        'flag' +
        '\x1b[0m' +
        ' option' +
        '\x1b[0m' +
        '\n',
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

  it('hide an option from the help message when it asks so', () => {
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

  it('not break columns in the help message when configured with negative values', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { breaks: -1 },
          param: { breaks: -1 },
          descr: { breaks: -1 },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -s  <param>  A string option\n');
  });

  it('break columns in the help message when configured with positive indentation', () => {
    const options = {
      flag: {
        type: 'flag',
        names: [''],
        synopsis: 'A flag option',
      },
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { breaks: 1 },
          param: { breaks: 1 },
          descr: { breaks: 1 },
        },
      },
    ];
    expect(format(options, sections).wrap()).toMatch(
      /^\n {15}A flag option\n\n {2}-s\n {6}<param>\n {15}A string option\n$/,
    );
  });

  it('break columns in the help message when configured with absolute indentation', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { breaks: 1 },
          param: { breaks: 1, absolute: true },
          descr: { breaks: 1, absolute: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toMatch(`\n  -s\n  <param>\n  A string option\n`);
  });

  it('break columns in the help message when configured with negative indentation', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { breaks: 1, indent: -1 },
          param: { breaks: 1, indent: -1 },
          descr: { breaks: 1, indent: -1 },
        },
      },
    ];
    expect(format(options, sections).wrap()).toMatch(/^\n-s\n <param>\n {7}A string option\n$/);
  });

  it('hide the option names from the help message when configured to do so', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { hidden: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  <param>  A string option\n');
  });

  it('hide the option parameter from the help message when configured to do so', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          param: { hidden: true, absolute: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -s  A string option\n');
  });

  it('hide the option description from the help message when configured to do so', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          descr: { hidden: true, absolute: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -s  <param>\n');
  });

  it('align option names to the left boundary without separator', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f', null, '--flag'],
        synopsis: 'A flag option',
      },
      flag2: {
        type: 'flag',
        names: [null, '--flag2', null],
        synopsis: 'A flag option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'left' },
        },
      },
    ];
    config.connectives.optionSep = '';
    try {
      expect(format(options, sections).wrap()).toEqual(
        '  -f --flag    A flag option\n  --flag2      A flag option\n',
      );
    } finally {
      config.connectives.optionSep = ',';
    }
  });

  it('align option names to the left boundary with a separator', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f', null, '--flag'],
      },
      flag2: {
        type: 'flag',
        names: [null, '--flag2', null],
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'left' },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f, --flag\n  --flag2\n');
  });

  it('align option names to the right boundary', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f', null, '--flag'],
      },
      flag2: {
        type: 'flag',
        names: [null, '--flag2', null],
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'right' },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f, --flag\n     --flag2\n');
  });

  it('align option names to the right boundary with different groups', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f', null, '--flag'],
      },
      flag2: {
        type: 'flag',
        names: [null, '--flag2', null],
        group: 'group',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        filter: ['group', ''], // change the group order
        layout: {
          names: { align: 'right' },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('group\n\n     --flag2\n\n  -f, --flag\n');
  });

  it('align option names within slots without separator', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f', null, '--flag'],
      },
      flag2: {
        type: 'flag',
        names: [null, '--flag2', null],
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'slot' },
        },
      },
    ];
    config.connectives.optionSep = '';
    try {
      expect(format(options, sections).wrap()).toEqual('  -f         --flag\n     --flag2\n');
    } finally {
      config.connectives.optionSep = ',';
    }
  });

  it('align option names within slots with a separator', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f', null, '--flag'],
      },
      flag2: {
        type: 'flag',
        names: [null, '--flag2', null],
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'slot' },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f,          --flag\n      --flag2\n');
  });

  it('align option parameters to the right boundary', () => {
    const options = {
      single1: {
        type: 'single',
        names: ['-s1'],
        example: 'abcde',
      },
      single2: {
        type: 'single',
        names: ['-s2'],
        example: 'ab',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { param: { align: 'right' } },
        items: [],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(`  -s1  'abcde'\n  -s2     'ab'\n`);
  });

  it('align option descriptions to the right boundary', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: 'A flag option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { descr: { align: 'right' } },
      },
    ];
    expect(format(options, sections).wrap(14, false, true)).toEqual(
      '  -f    A flag\n        option\n',
    );
  });

  it('merge option parameters with left-aligned option names', () => {
    const options = {
      single1: {
        type: 'single',
        names: ['-s1', '--single'],
      },
      single2: {
        type: 'single',
        paramName: 'long-parameter-name',
      },
      single3: {
        type: 'single',
        names: [null, '-s3'],
        inline: 'always',
      },
      array: {
        type: 'array',
        names: ['--array'],
        inline: 'always',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { param: { align: 'merge' } },
        items: [HelpItem.synopsis],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '  -s1, --single <param>\n  <long-parameter-name>\n  -s3=<param>\n  --array[=<param>]\n',
    );
  });

  it('merge option parameters with slotted option names', () => {
    const options = {
      single1: {
        type: 'single',
        names: ['-s1', '--single'],
      },
      single2: {
        type: 'single',
        paramName: 'long-parameter-name',
      },
      single3: {
        type: 'single',
        names: [null, '-s3'],
        inline: 'always',
      },
      array: {
        type: 'array',
        names: ['--array'],
        inline: 'always',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'slot' }, // ignored by the formatter
          param: { align: 'merge' },
        },
        items: [HelpItem.synopsis],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s1, --single <param>\n  <long-parameter-name>\n  -s3=<param>\n  --array[=<param>]\n`,
    );
  });

  it('merge option parameters with right-aligned option names', () => {
    const options = {
      single1: {
        type: 'single',
        names: ['-s1', '--single'],
      },
      single2: {
        type: 'single',
        paramName: 'long-parameter-name',
      },
      single3: {
        type: 'single',
        names: [null, '-s3'],
        inline: 'always',
      },
      array: {
        type: 'array',
        names: ['--array'],
        inline: 'always',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'right' },
          param: { align: 'merge' },
        },
        items: [HelpItem.synopsis],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '  -s1, --single <param>\n' +
        '                <long-parameter-name>\n' +
        '            -s3=<param>\n' +
        '        --array[=<param>]\n',
    );
  });

  it('merge option descriptions with option parameters', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: 'A flag option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          descr: { align: 'merge' },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s  <param> A string option\n  -f  A flag option\n`,
    );
  });

  it('merge option descriptions with slotted option names', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s', null],
        synopsis: 'A string option',
      },
      flag: {
        type: 'flag',
        synopsis: 'A flag option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'slot' }, // ignored by the formatter
          param: { hidden: true },
          descr: { align: 'merge' },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(`  -s A string option\n  A flag option\n`);
  });

  it('merge option descriptions with option parameters and option names', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
      },
      single2: {
        type: 'single',
        synopsis: 'A string option',
      },
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: 'A flag option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          param: { align: 'merge' },
          descr: { align: 'merge' },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s <param> A string option\n  <param> A string option\n  -f A flag option\n`,
    );
  });
});
