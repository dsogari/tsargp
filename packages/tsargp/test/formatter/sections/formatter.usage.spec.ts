import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections } from '../../../lib/options';
import { format } from '../../../lib/formatter';
import { style } from '../../../lib/styles';
import { tf } from '../../../lib/enums';

describe('rendering a usage section', () => {
  it('skip a section with no heading and no content', () => {
    const sections: HelpSections = [{ type: 'usage' }];
    expect(format({}, sections).wrap()).toEqual('');
  });

  it('skip the program name and comment when there are no options', () => {
    const sections: HelpSections = [{ type: 'usage', comment: 'comment' }];
    expect(format({}, sections, undefined, 'prog').wrap()).toEqual('');
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
      expect(format(options, sections, undefined, 'prog').wrap()).toEqual('prog [-f]\n');
    });

    it('break the program name, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'usage', content: { breaks: 1 } }];
      expect(format(options, sections, undefined, 'prog').wrap()).toEqual('\nprog [-f]\n');
    });

    it('indent the program name, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'usage', content: { indent: 2 } }];
      expect(format(options, sections, undefined, 'prog').wrap()).toEqual('  prog [-f]\n');
    });

    it('indent the options, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options2, sections, undefined, 'prog').wrap(10, false, true)).toEqual(
        'prog [-f]\n     [-f2]\n',
      );
    });

    it('replace the program name by the content text', () => {
      const sections: HelpSections = [{ type: 'usage', content: { text: 'text' } }];
      expect(format(options, sections, undefined).wrap()).toEqual('text [-f]\n');
      expect(format(options, sections, undefined, 'prog').wrap()).toEqual('text [-f]\n');
    });
  });

  describe('rendering the options', () => {
    it('render a flag option', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2', '--flag'],
          required: true,
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual('[-f1] (-f2|--flag)\n');
    });

    it('render a single-valued option', () => {
      const options = {
        single1: {
          type: 'single',
          names: ['-s1'],
        },
        single2: {
          type: 'single',
          names: ['-s2'],
          required: true,
        },
        single3: {
          type: 'single',
          names: ['-s3'],
          positional: '--',
          paramName: 'arg',
        },
        single4: {
          type: 'single',
          names: ['-s4'],
          example: true,
          inline: 'always',
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual(
        '[-s1 <param>] -s2 <param> [-s4=true] [[(-s3|--)] <arg>]\n',
      );
    });

    it('render an array-valued option', () => {
      const options = {
        array1: {
          type: 'array',
          names: ['-a1'],
        },
        array2: {
          type: 'array',
          names: ['-a2'],
          required: true,
        },
        array3: {
          type: 'array',
          positional: '--',
          paramName: 'args',
        },
        array4: {
          type: 'array',
          names: ['-a4'],
          example: true,
          inline: 'always',
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual(
        '[-a1 [<param>...]] -a2 [<param>...] [-a4[=true]] [--] [<args>...]\n',
      );
    });

    it('render a function option', () => {
      const options = {
        function1: {
          type: 'function',
          names: ['-f1'],
          paramCount: 0,
        },
        function2: {
          type: 'function',
          names: ['-f2'],
          required: true,
          paramCount: [1, 2],
        },
        function3: {
          type: 'function',
          positional: true,
          paramCount: 2,
          paramName: 'args',
        },
        function4: {
          type: 'function',
          names: ['-f4'],
          example: true,
          inline: 'always',
          paramCount: [0, 1],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'usage' }];
      expect(format(options, sections).wrap()).toEqual(
        '[-f1 ...] -f2 <param>... [<args>...] [-f4[=true]]\n',
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
      const filter = ['-f1', '-f2', '-s'];
      expect(format(options, sections0, filter).wrap()).toEqual('');
      expect(format(options, sections1, filter).wrap()).toEqual('[-f1]\n');
      expect(format(options, sections2, filter).wrap()).toEqual('[-f2]\n');
      expect(format(options, sections3, filter).wrap()).toEqual('-f1\n');
      expect(format(options, sections4, filter).wrap()).toEqual('[-f2] [-f1]\n');
      expect(format(options, sections5, filter).wrap()).toEqual(''); // usage was skipped
      expect(format(options, sections6, filter).wrap()).toEqual('[-f1] [[(-s|--)] <param>]\n');
      expect(format(options, sections7, filter).wrap()).toEqual('');
    });
  });

  describe('when requirements are specified', () => {
    it('group options according to an adjacency list', () => {
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
      expect(format(options, case0).wrap()).toEqual('[-f1] [-f2] [-f3]\n');
      expect(format(options, case1).wrap()).toEqual('[[-f1] -f2] [-f3]\n');
      expect(format(options, case2).wrap()).toEqual('[-f1 [-f2]] [-f3]\n');
      expect(format(options, case3).wrap()).toEqual('[-f1 -f2] [-f3]\n');
      expect(format(options, case4).wrap()).toEqual('[[[-f1] -f2] -f3]\n');
      expect(format(options, case5).wrap()).toEqual('[-f1 [-f2 [-f3]]]\n');
      expect(format(options, case6).wrap()).toEqual('[[-f1] -f2 [-f3]]\n');
      expect(format(options, case7).wrap()).toEqual('[[-f1] -f3 [-f2]]\n');
      expect(format(options, case8).wrap()).toEqual('[[-f1 [-f3]] -f2]\n');
      expect(format(options, case9).wrap()).toEqual('[-f1] [-f2 -f3]\n');
      expect(format(options, case10).wrap()).toEqual('[-f1 -f2 -f3]\n');
      expect(format(options, case11).wrap()).toEqual('[-f3 [-f2 [-f1]]]\n');
      expect(format(options, case12).wrap()).toEqual('[[[-f3] -f1] -f2]\n');
    });

    it('group options according to an adjacency list, with an always required option', () => {
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
      expect(format(options, case0).wrap()).toEqual('[-f1] [-f2] -f3\n');
      expect(format(options, case1).wrap()).toEqual('[[-f1] -f2] -f3\n');
      expect(format(options, case2).wrap()).toEqual('[-f1 [-f2]] -f3\n');
      expect(format(options, case3).wrap()).toEqual('[-f1 -f2] -f3\n');
      expect(format(options, case4).wrap()).toEqual('[[-f1] -f2] -f3\n');
      expect(format(options, case5).wrap()).toEqual('-f1 -f2 -f3\n');
      expect(format(options, case6).wrap()).toEqual('[-f1] -f2 -f3\n');
      expect(format(options, case7).wrap()).toEqual('[-f1] -f3 [-f2]\n');
      expect(format(options, case8).wrap()).toEqual('-f1 -f3 -f2\n');
      expect(format(options, case9).wrap()).toEqual('[-f1] -f2 -f3\n');
      expect(format(options, case10).wrap()).toEqual('-f1 -f2 -f3\n');
      expect(format(options, case11).wrap()).toEqual('-f3 [-f2 [-f1]]\n');
      expect(format(options, case12).wrap()).toEqual('-f3 -f1 -f2\n');
    });

    it('group options according to an adjacency list, with an option filter', () => {
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
      const filter = ['-f1', '-f2'];
      expect(format(options, case0, filter).wrap()).toEqual('[-f1] [-f2]\n');
      expect(format(options, case1, filter).wrap()).toEqual('[[-f1] -f2]\n');
      expect(format(options, case2, filter).wrap()).toEqual('[-f1 [-f2]]\n');
      expect(format(options, case3, filter).wrap()).toEqual('[-f1 -f2]\n');
      expect(format(options, case4, filter).wrap()).toEqual('[[[-f1] -f2] -f3]\n');
      expect(format(options, case5, filter).wrap()).toEqual('[-f1 [-f2 [-f3]]]\n');
      expect(format(options, case6, filter).wrap()).toEqual('[[-f1] -f2 [-f3]]\n');
      expect(format(options, case7, filter).wrap()).toEqual('[[-f1] -f3 [-f2]]\n');
      expect(format(options, case8, filter).wrap()).toEqual('[[-f1 [-f3]] -f2]\n');
      expect(format(options, case9, filter).wrap()).toEqual('[-f1] [-f2 -f3]\n');
      expect(format(options, case10, filter).wrap()).toEqual('[-f1 -f2 -f3]\n');
      expect(format(options, case11, filter).wrap()).toEqual('[[-f2 [-f1]] -f3]\n');
      expect(format(options, case12, filter).wrap()).toEqual('[-f2 [-f1 [-f3]]]\n');
    });
  });
});
