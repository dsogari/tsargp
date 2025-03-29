import { describe, expect, it } from 'bun:test';
import type { HelpSections, Options } from '../../../src/library';
import { format, config } from '../../../src/library';

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
        names: { breaks: 0 },
        param: { breaks: -1 },
        descr: { breaks: NaN },
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
        names: { breaks: 1 },
        param: { breaks: 1 },
        descr: { breaks: 1 },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '\n\n' +
        '               A flag option\n\n' +
        '  -s\n' +
        '      <param>\n' +
        '               A string option\n',
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
        names: { breaks: 1 },
        param: { breaks: 1, absolute: true },
        descr: { breaks: 1, absolute: true },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(`\n  -s\n  <param>\n  A string option\n`);
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
        names: { breaks: 1, indent: 0 },
        param: { breaks: 1, indent: -1 },
        descr: { breaks: 1, indent: NaN },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('\n-s\n <param>\n        A string option\n');
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
        names: null,
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
        param: null,
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
        descr: null,
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
        names: { align: 'left' },
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
        names: { align: 'left' },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f, --flag\n  --flag2\n');
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
        names: { slotIndent: 2 },
      },
    ];
    config.connectives.optionSep = '';
    try {
      expect(format(options, sections).wrap()).toEqual('  -f           --flag\n      --flag2\n');
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
        names: { slotIndent: 1 },
      },
    ];
    expect(format(options, sections).wrap()).toEqual('  -f,         --flag\n      --flag2\n');
  });

  it('force the width of all columns with left-alignment', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s', '--single'],
        synopsis: 'A single option with big synopsis.',
        paramName: '<param>',
      },
      array: {
        type: 'array',
        names: ['-a', '--array'],
        paramName: '<param> <param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        names: { maxWidth: 8 },
        param: { maxWidth: 12 },
        descr: { maxWidth: 20 },
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '' +
        '  -s,\n' +
        '  --single  <param>       A single option with\n' +
        '                          big synopsis.\n' +
        '  -a,\n' +
        '  --array   [<param>\n' +
        '            <param>...]   Accepts multiple\n' +
        '                          parameters.\n',
    );
  });

  it('force the width of all columns with left-alignment and non-responsive layout', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s', '--single'],
        synopsis: 'A single option with big synopsis.',
        paramName: '<param>',
      },
      array: {
        type: 'array',
        names: ['-a', '--array'],
        paramName: '<param> <param>',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        names: { maxWidth: 8 },
        param: { maxWidth: 12 },
        descr: { maxWidth: 20 },
        responsive: false,
      },
    ];
    expect(format(options, sections).wrap()).toEqual(
      '' +
        '  -s,       <param>       A single option with\n' +
        '  --single                big synopsis.\n' +
        '  -a,       [<param>      Accepts multiple\n' +
        '  --array   <param>...]   parameters.\n',
    );
  });
});
