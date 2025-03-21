import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections, FormatterFlags } from '../../../src/library';
import { AnsiString, format, style, tf } from '../../../src/library';

describe('rendering a usage section', () => {
  const flags: FormatterFlags = { progName: 'prog', clusterPrefix: '-' };

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

    it('replace the program name by the content text', () => {
      const sections: HelpSections = [{ type: 'usage', content: { text: 'text' } }];
      expect(format(options, sections, undefined).wrap()).toEqual('text [-f]\n');
      expect(format(options, sections, flags).wrap()).toEqual('text [-f]\n');
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

    it('render a flag option', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2', '--flag2'],
          required: true,
        },
        flag3: {
          type: 'flag',
          names: ['-f3', '--flag3'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual('(-f2|--flag2) [-f1] [-f3|--flag3]\n');
    });

    it('render a single-valued option', () => {
      const options = {
        single1: {
          type: 'single',
          names: ['-s'],
          cluster: 's', // test cluster with the same letter as the name
          paramName: '<param>',
        },
        single2: {
          type: 'single',
          names: ['-s2'],
          cluster: 'x', // test cluster letter
          paramName: '<param>',
          required: true,
          usageParamName: '<arg>', // overrides paramName
        },
        single3: {
          type: 'single',
          names: ['-s3'],
          positional: '', // test empty marker
          paramName: '<arg>',
        },
        single4: {
          type: 'single',
          names: ['-s4'],
          example: true,
          inline: 'always',
        },
        single5: {
          type: 'single',
          sources: ['SINGLE'], // environment-only
        },
        single6: {
          type: 'single',
          stdin: true, // environment-only
        },
        single7: {
          type: 'single',
          names: ['-s7'],
          positional: true, // test with no template
        },
        single8: {
          type: 'single',
          positional: true, // test with no template and no name
        },
        single9: {
          type: 'single',
          cluster: 'x', // test with only a cluster letter
          example: true,
          paramName: '<arg>', // overrides example
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections, flags).wrap()).toEqual(
        'prog (-s2|-x) <arg> [-s <param>] [-s4=true] [-s7] [-x <arg>] [[-s3|] <arg>]\n',
      );
    });

    it('render an array-valued option', () => {
      const options = {
        array1: {
          type: 'array',
          names: ['-a'],
          cluster: 'a', // no cluster prefix, so should not appear
          paramName: '<param>',
        },
        array2: {
          type: 'array',
          names: ['-a2'],
          cluster: 'x', // no cluster prefix, so should not appear
          paramName: '<param>',
          usageParamName: '<arg>', // overrides paramName
          required: true,
        },
        array3: {
          type: 'array',
          positional: '--',
          paramName: '', // test empty parameter
        },
        array4: {
          type: 'array',
          names: ['-a4'],
          example: true,
          inline: 'always',
        },
        array5: {
          type: 'array',
          sources: ['ARRAY'], // environment-only
        },
        array6: {
          type: 'array',
          stdin: true, // environment-only
        },
        array7: {
          type: 'array',
          names: ['-a7'],
          positional: true, // test with no template
        },
        array8: {
          type: 'array',
          positional: true, // test with no template and no name
        },
        array9: {
          type: 'array',
          names: ['-a9'],
          example: true,
          paramName: '<arg>', // overrides example
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual(
        '-a2 [<arg>...] [-a [<param>...]] [-a4[=true]] [-a7] [-a9 [<arg>...]] [--] [...]\n',
      );
    });

    it('render a function option', () => {
      const options = {
        function1: {
          type: 'function',
          names: ['-f1'],
          paramCount: 0,
          paramName: '', // test empty parameter
        },
        function2: {
          type: 'function',
          names: ['-f2'],
          required: true,
          paramName: '<param>',
          usageParamName: '<arg>', // overrides paramName
          paramCount: [1, 2],
        },
        function3: {
          type: 'function',
          positional: true,
          paramCount: 2,
          paramName: '', // test empty parameter
        },
        function4: {
          type: 'function',
          names: ['-f3'],
          example: true,
          inline: 'always',
          paramCount: [0, 1],
        },
        function5: {
          type: 'function',
          sources: ['ARRAY'], // environment-only
        },
        function6: {
          type: 'function',
          stdin: true, // environment-only
        },
        function7: {
          type: 'function',
          names: ['-f4'],
          positional: true, // test with no template
        },
        function8: {
          type: 'function',
          positional: true, // test with no template and no name
        },
        function9: {
          type: 'function',
          names: ['-f9'],
          example: true,
          paramName: '<arg>', // overrides example
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual(
        '-f2 <arg>... [-f1 ...] [...] [-f3[=true]] [-f4] [-f9 [<arg>...]]\n',
      );
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

  describe('when requirements are specified', () => {
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
      const case1: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2' } }];
      const case2: HelpSections = [{ type: 'usage', requires: { flag2: 'flag1' } }];
      const case3: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag2: 'flag1' } }];
      const case4: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3' } }];
      const case5: HelpSections = [{ type: 'usage', requires: { flag2: 'flag1', flag3: 'flag2' } }];
      const case6: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag3: 'flag2' } }];
      const case7: HelpSections = [{ type: 'usage', requires: { flag1: 'flag3', flag2: 'flag3' } }];
      const case8: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag3: 'flag1' } }];
      const case9: HelpSections = [{ type: 'usage', requires: { flag2: 'flag3', flag3: 'flag2' } }];
      const case10: HelpSections = [
        { type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3', flag3: 'flag1' } },
      ];
      const case11: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          requires: { flag1: 'flag2', flag2: 'flag3' },
        },
      ];
      const case12: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          requires: { flag1: 'flag2', flag3: 'flag1' },
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
      const case1: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2' } }];
      const case2: HelpSections = [{ type: 'usage', requires: { flag2: 'flag1' } }];
      const case3: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag2: 'flag1' } }];
      const case4: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3' } }];
      const case5: HelpSections = [{ type: 'usage', requires: { flag2: 'flag1', flag3: 'flag2' } }];
      const case6: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag3: 'flag2' } }];
      const case7: HelpSections = [{ type: 'usage', requires: { flag1: 'flag3', flag2: 'flag3' } }];
      const case8: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag3: 'flag1' } }];
      const case9: HelpSections = [{ type: 'usage', requires: { flag2: 'flag3', flag3: 'flag2' } }];
      const case10: HelpSections = [
        { type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3', flag3: 'flag1' } },
      ];
      const case11: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          requires: { flag1: 'flag2', flag2: 'flag3' },
        },
      ];
      const case12: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          requires: { flag1: 'flag2', flag3: 'flag1' },
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
      const case1: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2' } }];
      const case2: HelpSections = [{ type: 'usage', requires: { flag2: 'flag1' } }];
      const case3: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag2: 'flag1' } }];
      const case4: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3' } }];
      const case5: HelpSections = [{ type: 'usage', requires: { flag2: 'flag1', flag3: 'flag2' } }];
      const case6: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag3: 'flag2' } }];
      const case7: HelpSections = [{ type: 'usage', requires: { flag1: 'flag3', flag2: 'flag3' } }];
      const case8: HelpSections = [{ type: 'usage', requires: { flag1: 'flag2', flag3: 'flag1' } }];
      const case9: HelpSections = [{ type: 'usage', requires: { flag2: 'flag3', flag3: 'flag2' } }];
      const case10: HelpSections = [
        { type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3', flag3: 'flag1' } },
      ];
      const case11: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          requires: { flag1: 'flag2', flag2: 'flag3' },
        },
      ];
      const case12: HelpSections = [
        {
          type: 'usage',
          filter: ['flag3', 'flag2', 'flag1'],
          requires: { flag1: 'flag2', flag3: 'flag1' },
        },
      ];
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
      const case0: HelpSections = [{ type: 'usage', requires: { flag: 'array', array: 'flag' } }];
      const case1: HelpSections = [{ type: 'usage', filter: ['flag'] }];
      const case2: HelpSections = [{ type: 'usage', filter: ['array'] }];
      expect(format(options, case0).wrap()).toEqual('[(-f1|-f2) [-a] [...]]\n');
      expect(format(options, case1).wrap()).toEqual('[-f1|-f2]\n');
      expect(format(options, case2).wrap()).toEqual('[-a] [...]\n');
    });

    it('change order of always required options, except with positional marker', () => {
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
          required: true,
        },
        array: {
          type: 'array',
          names: ['-a'],
          paramName: '<arg>',
          required: true,
        },
      } as const satisfies Options;
      const case0: HelpSections = [{ type: 'usage', inclusive: { flag: ['single', 'array'] } }];
      const flags: FormatterFlags = { optionFilter: ['-f'] };
      expect(format(options, case0, flags).wrap()).toEqual('-a [<arg>...] [-f] [-s|--] <arg>\n');
    });
  });
});
