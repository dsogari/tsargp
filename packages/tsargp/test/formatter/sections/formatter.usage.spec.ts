import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections, FormatterFlags } from '../../../src/library';
import { AnsiString, format, style, tf } from '../../../src/library';

describe('rendering a usage section', () => {
  const flags: FormatterFlags = { progName: 'prog', clusterPrefix: '-', stdinSymbol: '-' };

  it('skip a section with no heading and no content', () => {
    const sections: HelpSections = [{ type: 'usage' }];
    expect(format({}, sections).wrap()).toEqual('');
  });

  it('skip the program name and comment when there are no options', () => {
    const sections: HelpSections = [{ type: 'usage', comment: 'comment' }];
    expect(format({}, sections, flags).wrap()).toEqual('');
  });

  describe('rendering the section heading', () => {
    it('avoid braking the heading with text', () => {
      const sections: HelpSections = [{ type: 'usage', heading: { text: 'text' } }];
      expect(format({}, sections).wrap()).toEqual('text');
    });

    it('break the heading with no text', () => {
      const sections: HelpSections = [{ type: 'usage', heading: { breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\n');
    });

    it('break the heading with text', () => {
      const sections: HelpSections = [{ type: 'usage', heading: { text: 'text', breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\ntext');
    });

    it('avoid breaking before the heading with no text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'usage', heading: { breaks: 1, noBreakFirst: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('');
    });

    it('avoid breaking before the heading with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'usage', heading: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('text');
    });

    it('indent the heading with text', () => {
      const sections: HelpSections = [{ type: 'usage', heading: { text: 'text', indent: 2 } }];
      expect(format({}, sections).wrap()).toEqual('  text');
    });

    it('right-align the heading with text', () => {
      const sections: HelpSections = [{ type: 'usage', heading: { text: 'text', align: 'right' } }];
      expect(format({}, sections).wrap(10, false, true)).toEqual('      text');
    });

    it('avoid splitting the heading with text', () => {
      const sections: HelpSections = [
        { type: 'usage', heading: { text: `text ${style(tf.clear)} spaces`, noSplit: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('text  spaces');
    });
  });

  describe('rendering the section content', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;

    const options2 = {
      ...options,
      flag2: {
        type: 'flag',
        names: ['-f2'],
      },
    } as const satisfies Options;

    it('skip the content when there are no options', () => {
      const sections: HelpSections = [{ type: 'usage', content: { text: 'text' } }];
      expect(format({}, sections).wrap()).toEqual('');
    });

    it('avoid breaking the content with no text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'usage', content: { breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options, sections).wrap()).toEqual('[-f]\n');
    });

    it('avoid breaking the content with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'usage', content: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options, sections).wrap()).toEqual('text [-f]\n');
    });

    it('avoid braking the program name, but include a trailing break', () => {
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections, flags).wrap()).toEqual('prog [-f]\n');
    });

    it('break the program name, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'usage', content: { breaks: 1 } }];
      expect(format(options, sections, flags).wrap()).toEqual('\nprog [-f]\n');
    });

    it('indent the program name, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'usage', content: { indent: 2 } }];
      expect(format(options, sections, flags).wrap()).toEqual('  prog [-f]\n');
    });

    it('indent the options, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options2, sections, flags).wrap(10, false, true)).toEqual(
        'prog [-f]\n     [-f2]\n',
      );
    });

    it('replace the program name with a string content text', () => {
      const sections: HelpSections = [{ type: 'usage', content: { text: 'prog  name' } }];
      expect(format(options, sections).wrap()).toEqual('prog name [-f]\n');
      expect(format(options, sections, flags).wrap()).toEqual('prog name [-f]\n');
    });

    it('replace the program name with a AnsiString content text', () => {
      const sections: HelpSections = [
        { type: 'usage', content: { text: new AnsiString().split('prog  name') } },
      ];
      expect(format(options, sections).wrap()).toEqual('prog name [-f]\n');
      expect(format(options, sections, flags).wrap()).toEqual('prog name [-f]\n');
    });
  });

  describe('rendering the options', () => {
    it('render usage with comment and AnsiString parameter name', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          usageParamName: new AnsiString().split('my  param'),
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage', comment: 'this is a  comment' }];
      expect(format(options, sections).wrap()).toEqual('[-s my param] this is a comment\n');
    });

    it('render a positional option without template', () => {
      const options = {
        optional: {
          type: 'single',
          names: ['-s1'],
          positional: true,
        },
        alwaysRequired: {
          type: 'single',
          names: ['-s2'],
          positional: true,
          required: true,
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage', filter: ['optional'] }];
      const case1: HelpSections = [{ type: 'usage', filter: ['alwaysRequired'] }];
      expect(format(options, case0).wrap()).toEqual('[-s1]\n');
      expect(format(options, case1).wrap()).toEqual('-s2\n');
    });

    it('render a flag option', () => {
      const options = {
        singleName: {
          type: 'flag',
          names: ['-f1'],
        },
        alwaysRequired: {
          type: 'flag',
          names: ['-f2', '--flag2'],
          required: true, // should appear first
        },
        multipleNames: {
          type: 'flag',
          names: ['-f3', '--flag3'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual('(-f2|--flag2) [-f1] [-f3|--flag3]\n');
    });

    it('render a single-valued option', () => {
      const options = {
        clusterSameAsName: {
          type: 'single',
          names: ['-s'],
          cluster: 's', // merge with option name
          paramName: '<param>',
        },
        alwaysRequiredWithClusterAndOverrideParamName: {
          type: 'single',
          names: ['-s2'],
          cluster: 'x',
          required: true, // should appear first
          paramName: '<param>',
          usageParamName: '<arg>',
        },
        emptyMarker: {
          type: 'single',
          names: ['-s3'],
          positional: '', // should appear last
          paramName: '<arg>',
        },
        requiredInline: {
          type: 'single',
          names: ['-s4'],
          example: true,
          inline: 'always',
        },
        environmentOnly: {
          type: 'single',
          sources: ['SINGLE'], // should not appear
        },
        standardInput: {
          type: 'single',
          stdin: true,
        },
        positionalWithoutTemplate: {
          type: 'single',
          names: ['-s7'],
          positional: true,
        },
        unnamedPositionalWithoutTemplate: {
          type: 'single',
          positional: true, // should not appear
        },
        clusterOnlyAndOverrideExample: {
          type: 'single',
          cluster: 'x',
          example: true,
          paramName: '<arg>',
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections, flags).wrap()).toEqual(
        'prog (-s2|-x) <arg> [-s <param>] [-s4=true] [-] [-s7] [-x <arg>] [[-s3|] <arg>]\n',
      );
    });

    it('render an array-valued option', () => {
      const options = {
        noClusterPrefix: {
          type: 'array',
          names: ['-a1'],
          cluster: 'a',
          paramName: '<param>',
        },
        alwaysRequiredAndOverrideParamName: {
          type: 'array',
          names: ['-a2'],
          required: true, // should appear first
          paramName: '<param>',
          usageParamName: '<arg>',
        },
        markerWithEmptyParamName: {
          type: 'array',
          positional: '--', // should appear last
          paramName: '',
        },
        requiredInline: {
          type: 'array',
          names: ['-a4'],
          example: true,
          inline: 'always',
        },
        environmentOnly: {
          type: 'array',
          sources: ['ARRAY'], // should not appear
        },
        noStdinSymbol: {
          type: 'array',
          stdin: true, // should not appear
        },
        positionalWithoutTemplate: {
          type: 'array',
          names: ['-a7'],
          positional: true,
        },
        unnamedPositionalWithoutTemplate: {
          type: 'array',
          positional: true, // should not appear
        },
        overrideExample: {
          type: 'array',
          names: ['-a9'],
          example: true,
          paramName: '<arg>',
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual(
        '-a2 [<arg>...] [-a1 [<param>...]] [-a4[=true]] [-a7] [-a9 [<arg>...]] [--] [...]\n',
      );
    });

    it('render a function option', () => {
      const options = {
        unknownParamCountWithEmptyParamName: {
          type: 'function',
          names: ['-f1'],
          paramCount: 0,
          paramName: '',
        },
        alwaysRequiredWithRangeParamCountAndOverrideParamName: {
          type: 'function',
          names: ['-f2'],
          required: true, // should appear first
          paramName: '<param>',
          usageParamName: '<arg1> [<arg2>]',
          paramCount: [1, 2],
        },
        unnamedPositionalWithExactParamCount: {
          type: 'function',
          positional: true,
          paramCount: 2,
          paramName: '<arg1> <arg2>',
        },
        rangeParamCountAndRequiredInline: {
          type: 'function',
          names: ['-f3'],
          example: true,
          inline: 'always',
          paramCount: [0, 1],
        },
        environmentOnly: {
          type: 'function',
          sources: ['ARRAY'], // should not appear
        },
        noStdinSymbol: {
          type: 'function',
          stdin: true, // should not appear
        },
        positionalWithoutTemplate: {
          type: 'function',
          names: ['-f4'],
          positional: true,
        },
        unnamedPositionalWithoutTemplate: {
          type: 'function',
          positional: true, // should not appear
        },
        overrideExample: {
          type: 'function',
          names: ['-f9'],
          example: true,
          paramName: '<arg>',
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual(
        '-f2 <arg1> [<arg2>] [-f1 ...] [<arg1> <arg2>] [-f3[=true]] [-f4] [-f9 [<arg>...]]\n',
      );
    });

    it('render an option that reads data from the standard input', () => {
      const options = {
        optionalUnnamedWithTemplate: {
          type: 'single',
          paramName: '<arg1>',
          stdin: true,
        },
        requiredWithTemplate: {
          type: 'single',
          names: ['-s2'],
          paramName: '<arg2>',
          required: true,
          stdin: true,
        },
        requiredWithoutTemplate: {
          type: 'single',
          names: ['-s3', '--single'],
          required: true,
          stdin: true,
        },
        optionalWithoutTemplate: {
          type: 'single',
          names: ['-s4'],
          stdin: true,
        },
        requiredUnnamedWithoutTemplate: {
          type: 'single',
          required: true,
          stdin: true,
        },
        optionalUnnamedWithoutTemplate: {
          type: 'single',
          stdin: true,
        },
        optionalWithTemplate: {
          type: 'single',
          names: ['-s7'],
          paramName: '<arg7>',
          stdin: true,
        },
        array: {
          type: 'array',
          names: ['-a'],
          paramName: '<arg>',
          positional: true,
          stdin: true,
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage', filter: ['array'], exclude: true }];
      const case1: HelpSections = [{ type: 'usage', filter: ['array'] }];
      const case2: HelpSections = [{ type: 'usage', filter: ['requiredWithoutTemplate'] }];
      const case3: HelpSections = [
        { type: 'usage', filter: ['array'], inclusive: { array: 'optionalUnnamedWithTemplate' } },
      ];
      const flags: FormatterFlags = { stdinSymbol: '-' };
      expect(format(options, case0, flags).wrap()).toEqual(
        '(-s2 <arg2>|-) (-s3|--single|-) - [<arg1>|-] [-s4|-] [-] [-s7 <arg7>|-]\n',
      );
      expect(format(options, case1, flags).wrap()).toEqual('([-a] [<arg>...]|-)\n');
      expect(format(options, case2, flags).wrap()).toEqual('(-s3|--single|-)\n');
      expect(format(options, case3, flags).wrap()).toEqual('[(<arg1>|-) ([-a] [<arg>...]|-)]\n');
    });

    it('filter, include and exclude options', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        flag3: {
          type: 'flag',
          names: ['-f3'],
        },
        single: {
          type: 'single',
          names: ['-s'],
          positional: '--',
          paramName: '<param>',
        },
      } as const satisfies Options;
      const sections0: HelpSections = [{ type: 'usage', filter: [] }]; // empty filter
      const sections1: HelpSections = [{ type: 'usage', filter: ['flag1'] }];
      const sections2: HelpSections = [
        { type: 'usage', filter: ['flag1', 'single'], exclude: true },
      ];
      const sections3: HelpSections = [{ type: 'usage', filter: ['flag1'], required: ['flag1'] }];
      const sections4: HelpSections = [{ type: 'usage', filter: ['flag2', 'flag1'] }];
      const sections5: HelpSections = [{ type: 'usage', filter: ['flag3'] }];
      const sections6: HelpSections = [{ type: 'usage', filter: ['single', 'flag1'] }];
      const sections7: HelpSections = [{ type: 'usage', filter: ['flag3'] }];
      const flags: FormatterFlags = { optionFilter: ['-f1', '-f2', '-s'] };
      expect(format(options, sections0, flags).wrap()).toEqual('');
      expect(format(options, sections1, flags).wrap()).toEqual('[-f1]\n');
      expect(format(options, sections2, flags).wrap()).toEqual('[-f2]\n');
      expect(format(options, sections3, flags).wrap()).toEqual('-f1\n');
      expect(format(options, sections4, flags).wrap()).toEqual('[-f2] [-f1]\n');
      expect(format(options, sections5, flags).wrap()).toEqual(''); // usage was skipped
      expect(format(options, sections6, flags).wrap()).toEqual('[-f1] [[-s|--] <param>]\n');
      expect(format(options, sections7, flags).wrap()).toEqual('');
    });
  });

  describe('when inclusive dependencies are specified', () => {
    it('group flag options according to an adjacency list', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        flag3: {
          type: 'flag',
          names: ['-f3'],
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage' }];
      const case1: HelpSections = [{ type: 'usage', inclusive: { flag1: 'flag2' } }];
      const case2: HelpSections = [{ type: 'usage', inclusive: { flag2: 'flag1' } }];
      const case3: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag1' } },
      ];
      const case4: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag3' } },
      ];
      const case5: HelpSections = [
        { type: 'usage', inclusive: { flag2: 'flag1', flag3: 'flag2' } },
      ];
      const case6: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag3: 'flag2' } },
      ];
      const case7: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag3', flag2: 'flag3' } },
      ];
      const case8: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag3: 'flag1' } },
      ];
      const case9: HelpSections = [
        { type: 'usage', inclusive: { flag2: 'flag3', flag3: 'flag2' } },
      ];
      const case10: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag3', flag3: 'flag1' } },
      ];
      const case11: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          inclusive: { flag1: 'flag2', flag2: 'flag3' },
        },
      ];
      const case12: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          inclusive: { flag1: 'flag2', flag3: 'flag1' },
        },
      ];
      const case13: HelpSections = [{ type: 'usage', inclusive: { flag1: ['flag2', 'flag3'] } }];
      expect(format(options, case0).wrap()).toEqual('[-f1] [-f2] [-f3]\n');
      expect(format(options, case1).wrap()).toEqual('[-f2 [-f1]] [-f3]\n');
      expect(format(options, case2).wrap()).toEqual('[-f1 [-f2]] [-f3]\n');
      expect(format(options, case3).wrap()).toEqual('[-f1 -f2] [-f3]\n');
      expect(format(options, case4).wrap()).toEqual('[-f3 [-f2 [-f1]]]\n');
      expect(format(options, case5).wrap()).toEqual('[-f1 [-f2 [-f3]]]\n');
      expect(format(options, case6).wrap()).toEqual('[-f2 [-f1] [-f3]]\n');
      expect(format(options, case7).wrap()).toEqual('[-f3 [-f1] [-f2]]\n');
      expect(format(options, case8).wrap()).toEqual('[-f2 [-f1 [-f3]]]\n');
      expect(format(options, case9).wrap()).toEqual('[-f1] [-f2 -f3]\n');
      expect(format(options, case10).wrap()).toEqual('[-f1 -f2 -f3]\n');
      expect(format(options, case11).wrap()).toEqual('[-f3 [-f2 [-f1]]]\n');
      expect(format(options, case12).wrap()).toEqual('[-f2 [-f1 [-f3]]]\n');
      expect(format(options, case13).wrap()).toEqual('[-f2] [-f3] [-f2 -f3 [-f1]]\n');
    });

    it('group flag options according to an adjacency list, with an always required option', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        flag3: {
          type: 'flag',
          names: ['-f3'],
          required: true,
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage' }];
      const case1: HelpSections = [{ type: 'usage', inclusive: { flag1: 'flag2' } }];
      const case2: HelpSections = [{ type: 'usage', inclusive: { flag2: 'flag1' } }];
      const case3: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag1' } },
      ];
      const case4: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag3' } },
      ];
      const case5: HelpSections = [
        { type: 'usage', inclusive: { flag2: 'flag1', flag3: 'flag2' } },
      ];
      const case6: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag3: 'flag2' } },
      ];
      const case7: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag3', flag2: 'flag3' } },
      ];
      const case8: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag3: 'flag1' } },
      ];
      const case9: HelpSections = [
        { type: 'usage', inclusive: { flag2: 'flag3', flag3: 'flag2' } },
      ];
      const case10: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag3', flag3: 'flag1' } },
      ];
      const case11: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          inclusive: { flag1: 'flag2', flag2: 'flag3' },
        },
      ];
      const case12: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          inclusive: { flag1: 'flag2', flag3: 'flag1' },
        },
      ];
      const case13: HelpSections = [{ type: 'usage', inclusive: { flag1: ['flag2', 'flag3'] } }];
      expect(format(options, case0).wrap()).toEqual('-f3 [-f1] [-f2]\n');
      expect(format(options, case1).wrap()).toEqual('-f3 [-f2 [-f1]]\n');
      expect(format(options, case2).wrap()).toEqual('-f3 [-f1 [-f2]]\n');
      expect(format(options, case3).wrap()).toEqual('-f3 [-f1 -f2]\n');
      expect(format(options, case4).wrap()).toEqual('-f3 [-f2 [-f1]]\n');
      expect(format(options, case5).wrap()).toEqual('-f1 -f3 -f2\n');
      expect(format(options, case6).wrap()).toEqual('-f2 -f3 [-f1]\n');
      expect(format(options, case7).wrap()).toEqual('-f3 [-f1] [-f2]\n');
      expect(format(options, case8).wrap()).toEqual('-f1 -f2 -f3\n');
      expect(format(options, case9).wrap()).toEqual('-f3 -f2 [-f1]\n');
      expect(format(options, case10).wrap()).toEqual('-f1 -f2 -f3\n');
      expect(format(options, case11).wrap()).toEqual('-f3 [-f2 [-f1]]\n');
      expect(format(options, case12).wrap()).toEqual('-f3 -f1 -f2\n');
      expect(format(options, case13).wrap()).toEqual('-f3 [-f2 [-f1]]\n');
    });

    it('group flag options according to an adjacency list, with an option filter', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        flag3: {
          type: 'flag',
          names: ['-f3'],
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage' }];
      const case1: HelpSections = [{ type: 'usage', inclusive: { flag1: 'flag2' } }];
      const case2: HelpSections = [{ type: 'usage', inclusive: { flag2: 'flag1' } }];
      const case3: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag1' } },
      ];
      const case4: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag3' } },
      ];
      const case5: HelpSections = [
        { type: 'usage', inclusive: { flag2: 'flag1', flag3: 'flag2' } },
      ];
      const case6: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag3: 'flag2' } },
      ];
      const case7: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag3', flag2: 'flag3' } },
      ];
      const case8: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag3: 'flag1' } },
      ];
      const case9: HelpSections = [
        { type: 'usage', inclusive: { flag2: 'flag3', flag3: 'flag2' } },
      ];
      const case10: HelpSections = [
        { type: 'usage', inclusive: { flag1: 'flag2', flag2: 'flag3', flag3: 'flag1' } },
      ];
      const case11: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          inclusive: { flag1: 'flag2', flag2: 'flag3' },
        },
      ];
      const case12: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          inclusive: { flag1: 'flag2', flag3: 'flag1' },
        },
      ];
      const case13: HelpSections = [{ type: 'usage', inclusive: { flag1: ['flag2', 'flag3'] } }];
      const flags: FormatterFlags = { optionFilter: ['-f1', '-f2'] };
      expect(format(options, case0, flags).wrap()).toEqual('[-f1] [-f2]\n');
      expect(format(options, case1, flags).wrap()).toEqual('[-f2 [-f1]]\n');
      expect(format(options, case2, flags).wrap()).toEqual('[-f1 [-f2]]\n');
      expect(format(options, case3, flags).wrap()).toEqual('[-f1 -f2]\n');
      expect(format(options, case4, flags).wrap()).toEqual('[-f3 [-f2 [-f1]]]\n');
      expect(format(options, case5, flags).wrap()).toEqual('[-f1 [-f2]]\n');
      expect(format(options, case6, flags).wrap()).toEqual('[-f2 [-f1]]\n');
      expect(format(options, case7, flags).wrap()).toEqual('[-f3 [-f1] [-f2]]\n');
      expect(format(options, case8, flags).wrap()).toEqual('[-f2 [-f1]]\n');
      expect(format(options, case9, flags).wrap()).toEqual('[-f1] [-f2 -f3]\n');
      expect(format(options, case10, flags).wrap()).toEqual('[-f1 -f2 -f3]\n');
      expect(format(options, case11, flags).wrap()).toEqual('[-f3 [-f2 [-f1]]]\n');
      expect(format(options, case12, flags).wrap()).toEqual('[-f2 [-f1]]\n');
      expect(format(options, case13, flags).wrap()).toEqual('[-f2] [-f3] [-f2 -f3 [-f1]]\n');
    });

    it('group mutually dependent options according to an adjacency list', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f1', '-f2'],
        },
        array: {
          type: 'array',
          names: ['-a'],
          positional: true,
          paramName: '',
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage', inclusive: { flag: 'array', array: 'flag' } }];
      const case1: HelpSections = [{ type: 'usage', filter: ['flag'] }];
      const case2: HelpSections = [{ type: 'usage', filter: ['array'] }];
      expect(format(options, case0).wrap()).toEqual('[(-f1|-f2) [-a] [...]]\n');
      expect(format(options, case1).wrap()).toEqual('[-f1|-f2]\n');
      expect(format(options, case2).wrap()).toEqual('[-a] [...]\n');
    });

    it('change order of always required options and positional marker', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        single: {
          type: 'single',
          names: ['-s'],
          positional: '--',
          paramName: '<arg>',
        },
        array: {
          type: 'array',
          names: ['-a'],
          paramName: '<arg>',
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage', inclusive: { flag: 'single' } }];
      const case1: HelpSections = [
        { type: 'usage', inclusive: { flag: ['single', 'array'] }, required: ['single'] },
      ];
      const case2: HelpSections = [
        { type: 'usage', inclusive: { flag: ['single', 'array'] }, required: ['single', 'array'] },
      ];
      const flags: FormatterFlags = { optionFilter: ['-f'] };
      expect(format(options, case0).wrap()).toEqual('[-a [<arg>...]] [[-f] [-s|--] <arg>]\n');
      expect(format(options, case1, flags).wrap()).toEqual('[-a [<arg>...] [-f]] [-s|--] <arg>\n');
      expect(format(options, case2, flags).wrap()).toEqual('[-f] -a [<arg>...] [-s|--] <arg>\n');
    });
  });
});
