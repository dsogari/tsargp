import { describe, expect, it } from 'bun:test';
import type { HelpSections, Options } from '../../src/library';
import { format, config } from '../../src/library';

describe('format', () => {
  it('not break columns in the help message when configured with non-positive values', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { breaks: 0 },
          param: { breaks: -1 },
          descr: { breaks: NaN },
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
        paramName: '<param>',
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
      /^\n\n {15}A flag option\n\n {2}-s\n {6}<param>\n {15}A string option\n$/,
    );
  });

  it('break columns in the help message when configured with absolute indentation', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
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

  it('break columns in the help message when configured non-positive indentation', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { breaks: 1, indent: 0 },
          param: { breaks: 1, indent: -1 },
          descr: { breaks: 1, indent: NaN },
        },
      },
    ];
    expect(format(options, sections).wrap()).toMatch(/^\n-s\n <param>\n {8}A string option\n$/);
  });

  it('hide the option names from the help message when configured to do so', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { names: null },
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
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { param: null },
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
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { descr: null },
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
        layout: { names: { align: 'left' } },
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
        layout: { names: { align: 'left' } },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f, --flag\n  --flag2\n');
  });

  it('align option names to the right boundary in the same group', () => {
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
        layout: { names: { align: 'right' } },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f, --flag\n     --flag2\n');
  });

  it('align option names to the right boundary in different groups', () => {
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
        layout: { names: { align: 'right' } },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('     --flag2\n  -f, --flag\n');
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
        layout: { names: { slotIndent: 1 } },
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
        layout: { names: { slotIndent: 1 } },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f,         --flag\n      --flag2\n');
  });

  it('align option names within slots to the right boundary', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f1', '--flag1'],
      },
      flag2: {
        type: 'flag',
        names: ['--flag2', '-f2'],
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { names: { align: 'right', slotIndent: 1 } },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('      -f1, --flag1\n  --flag2,     -f2\n');
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
        paramName: '<param>',
      },
      single2: {
        type: 'single',
        paramName: 'long-parameter-name',
      },
      single3: {
        type: 'single',
        names: [null, '-s3'],
        inline: 'always',
        paramName: '<param>',
      },
      array: {
        type: 'array',
        names: ['--array'],
        inline: 'always',
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { param: { merge: true } },
        items: [],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '  -s1, --single <param>\n  long-parameter-name\n  -s3=<param>\n  --array[=<param>]\n',
    );
  });

  it('merge option parameters with slotted option names', () => {
    const options = {
      single1: {
        type: 'single',
        names: ['-s1', '--single'],
        paramName: '<param>',
      },
      single2: {
        type: 'single',
        paramName: 'long-parameter-name',
      },
      single3: {
        type: 'single',
        names: [null, '-s3'],
        inline: 'always',
        paramName: '<param>',
      },
      array: {
        type: 'array',
        names: ['--array'],
        inline: 'always',
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { slotIndent: 1 }, // ignored by the formatter
          param: { merge: true },
        },
        items: [],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s1, --single <param>\n  long-parameter-name\n  -s3=<param>\n  --array[=<param>]\n`,
    );
  });

  it('merge option parameters with right-aligned option names', () => {
    const options = {
      single1: {
        type: 'single',
        names: ['-s1', '--single'],
        paramName: '<param>',
      },
      single2: {
        type: 'single',
        paramName: 'long-parameter-name',
      },
      single3: {
        type: 'single',
        names: [null, '-s3'],
        inline: 'always',
        paramName: '<param>',
      },
      array: {
        type: 'array',
        names: ['--array'],
        inline: 'always',
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: {
          names: { align: 'right' },
          param: { merge: true },
        },
        items: [],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '  -s1, --single <param>\n' +
        '    long-parameter-name\n' +
        '            -s3=<param>\n' +
        '      --array[=<param>]\n',
    );
  });

  it('merge option parameters with option names, with leading line feeds', () => {
    const options = {
      single1: {
        type: 'single',
        names: ['-s1', '--single'],
        paramName: '<param>',
      },
      single2: {
        type: 'single',
        paramName: 'long-parameter-name',
      },
      single3: {
        type: 'single',
        names: [null, '-s3'],
        inline: 'always',
        paramName: '<param>',
      },
      array: {
        type: 'array',
        names: ['--array'],
        inline: 'always',
        paramName: '<param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        layout: { param: { merge: true, breaks: 1 } },
        items: [],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '  -s1, --single\n  <param>\n' +
        '\n  long-parameter-name\n' +
        '  -s3\n  =<param>\n' +
        '  --array\n  [=<param>]\n',
    );
  });

  it('merge option descriptions with left-aligned option parameters', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
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
        layout: { descr: { merge: true } },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s  <param> A string option\n  -f  A flag option\n`,
    );
  });

  it('merge option descriptions with right-aligned option parameters', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
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
          param: { align: 'right' },
          descr: { merge: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s  <param> A string option\n  -f            A flag option\n`,
    );
  });

  it('merge option descriptions with option parameters, with leading line feeds', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
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
        layout: { descr: { merge: true, breaks: 1 } },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s  <param>\n      A string option\n  -f\n      A flag option\n`,
    );
  });

  it('merge option descriptions with slotted option names', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s', null],
        synopsis: 'A string option',
        paramName: '<param>',
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
          names: { slotIndent: 1 }, // ignored by the formatter
          param: null,
          descr: { merge: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(`  -s A string option\n  A flag option\n`);
  });

  it('merge option descriptions and parameters with left-aligned option names', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
      },
      single2: {
        type: 'single',
        synopsis: 'A string option',
        paramName: '<param>',
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
          param: { merge: true },
          descr: { merge: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s <param> A string option\n  <param> A string option\n  -f A flag option\n`,
    );
  });

  it('merge option descriptions and parameters with right-aligned option names', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
      },
      single2: {
        type: 'single',
        synopsis: 'A string option',
        paramName: '<param>',
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
          names: { align: 'right' },
          param: { merge: true },
          descr: { merge: true },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s <param> A string option\n     <param> A string option\n            -f A flag option\n`,
    );
  });

  it('merge option descriptions and parameters with option names, with leading line feeds', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        synopsis: 'A string option',
        paramName: '<param>',
      },
      single2: {
        type: 'single',
        synopsis: 'A string option',
        paramName: '<param>',
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
          param: { merge: true, breaks: 1 },
          descr: { merge: true, breaks: 1 },
        },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      `  -s\n  <param>\n  A string option\n\n  <param>\n  A string option\n  -f\n  A flag option\n`,
    );
  });
});
