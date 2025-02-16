import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections } from '../../lib/options';
import { HelpFormatter } from '../../lib/formatter';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('HelpFormatter', () => {
  describe('sections', () => {
    it('handle no sections', () => {
      const message = new HelpFormatter({}).sections([]);
      expect(message.wrap()).toEqual('');
    });

    it('avoid splitting and wrapping section texts when explicitly asked', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        { type: 'text', title: 'section  title', text: 'section  text', noWrap: true },
        { type: 'usage', title: 'section  title', noWrap: true },
        { type: 'groups', title: 'section  title', noWrap: true },
      ];
      const message = new HelpFormatter(options).sections(sections);
      expect(message.wrap()).toEqual(
        'section  title\n\nsection  text\n\nsection  title\n\n[-f]\n\nsection  title\n\n  -f',
      );
    });

    describe('rendering a text section', () => {
      it('skip a section with no content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text' }];
        expect(formatter.sections(sections).wrap()).toEqual('');
      });

      it('render the section content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', text: 'text' }];
        expect(formatter.sections(sections).wrap()).toEqual('text');
      });

      it('indent the section content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', text: 'text', indent: 2 }];
        expect(formatter.sections(sections).wrap()).toEqual('  text');
      });

      it('break the section content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', text: 'text', breaks: 1 }];
        expect(formatter.sections(sections).wrap()).toEqual('\ntext');
      });

      it('render the section heading, but avoid indenting it', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', title: 'title', indent: 2 }];
        expect(formatter.sections(sections).wrap()).toEqual('title');
      });

      it('break the section heading', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', title: 'title', breaks: 1 }];
        expect(formatter.sections(sections).wrap()).toEqual('\ntitle');
      });
    });

    describe('rendering a usage section', () => {
      it('skip a section with no content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'usage' }];
        expect(formatter.sections(sections).wrap()).toEqual('');
      });

      it('render the program name', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'usage' }];
        expect(formatter.sections(sections, 'prog').wrap()).toEqual('prog');
      });

      it('indent the program name', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'usage', indent: 2 }];
        expect(formatter.sections(sections, 'prog').wrap()).toEqual('  prog');
      });

      it('break the program name', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'usage', breaks: 1 }];
        expect(formatter.sections(sections, 'prog').wrap()).toEqual('\nprog');
      });

      it('render the section heading, but avoid indenting it', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'usage', title: 'title', indent: 2 }];
        expect(formatter.sections(sections).wrap()).toEqual('title');
      });

      it('break the section heading', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'usage', title: 'title', breaks: 1 }];
        expect(formatter.sections(sections).wrap()).toEqual('\ntitle');
      });

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
        const formatter = new HelpFormatter(options);
        const sections: HelpSections = [{ type: 'usage' }];
        expect(formatter.sections(sections).wrap()).toEqual('[-f1] (-f2|--flag)');
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
            positional: true,
          },
          single4: {
            type: 'single',
            names: ['-s4'],
            example: true,
            inline: 'always',
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections: HelpSections = [{ type: 'usage' }];
        expect(formatter.sections(sections).wrap()).toEqual(
          '[-s1 <param>] -s2 <param> [[-s3] <param>] [-s4=true]',
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
            names: ['-a3'],
            positional: true,
          },
          array4: {
            type: 'array',
            names: ['-a4'],
            example: true,
            inline: 'always',
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections: HelpSections = [{ type: 'usage' }];
        expect(formatter.sections(sections).wrap()).toEqual(
          '[-a1 [<param>...]] -a2 [<param>...] [[-a3] [<param>...]] [-a4=true]',
        );
      });

      it('include and exclude an option', () => {
        const options = {
          flag1: {
            type: 'flag',
            names: ['-f1'],
          },
          flag2: {
            type: 'flag',
            names: ['-f2'],
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections1: HelpSections = [{ type: 'usage', filter: ['flag1'] }];
        const sections2: HelpSections = [{ type: 'usage', filter: ['flag1'], exclude: true }];
        const sections3: HelpSections = [{ type: 'usage', filter: ['flag1'], required: ['flag1'] }];
        const sections4: HelpSections = [{ type: 'usage', filter: ['flag2', 'flag1'] }];
        expect(formatter.sections(sections1).wrap()).toEqual('[-f1]');
        expect(formatter.sections(sections2).wrap()).toEqual('[-f2]');
        expect(formatter.sections(sections3).wrap()).toEqual('-f1');
        expect(formatter.sections(sections4).wrap()).toEqual('[-f2] [-f1]');
      });

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
        const case3: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag2: 'flag1' } },
        ];
        const case4: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3' } },
        ];
        const case5: HelpSections = [
          { type: 'usage', requires: { flag2: 'flag1', flag3: 'flag2' } },
        ];
        const case6: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag3: 'flag2' } },
        ];
        const case7: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag3', flag2: 'flag3' } },
        ];
        const case8: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag3: 'flag1' } },
        ];
        const case9: HelpSections = [
          { type: 'usage', requires: { flag2: 'flag3', flag3: 'flag2' } },
        ];
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
        const formatter = new HelpFormatter(options);
        expect(formatter.sections(case0).wrap()).toEqual('[-f1] [-f2] [-f3]');
        expect(formatter.sections(case1).wrap()).toEqual('[[-f1] -f2] [-f3]');
        expect(formatter.sections(case2).wrap()).toEqual('[-f1 [-f2]] [-f3]');
        expect(formatter.sections(case3).wrap()).toEqual('[-f1 -f2] [-f3]');
        expect(formatter.sections(case4).wrap()).toEqual('[[[-f1] -f2] -f3]');
        expect(formatter.sections(case5).wrap()).toEqual('[-f1 [-f2 [-f3]]]');
        expect(formatter.sections(case6).wrap()).toEqual('[[-f1] -f2 [-f3]]');
        expect(formatter.sections(case7).wrap()).toEqual('[[-f1] -f3 [-f2]]');
        expect(formatter.sections(case8).wrap()).toEqual('[[-f1 [-f3]] -f2]');
        expect(formatter.sections(case9).wrap()).toEqual('[-f1] [-f2 -f3]');
        expect(formatter.sections(case10).wrap()).toEqual('[-f1 -f2 -f3]');
        expect(formatter.sections(case11).wrap()).toEqual('[-f3 [-f2 [-f1]]]');
        expect(formatter.sections(case12).wrap()).toEqual('[[[-f3] -f1] -f2]');
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
        const case3: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag2: 'flag1' } },
        ];
        const case4: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag2: 'flag3' } },
        ];
        const case5: HelpSections = [
          { type: 'usage', requires: { flag2: 'flag1', flag3: 'flag2' } },
        ];
        const case6: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag3: 'flag2' } },
        ];
        const case7: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag3', flag2: 'flag3' } },
        ];
        const case8: HelpSections = [
          { type: 'usage', requires: { flag1: 'flag2', flag3: 'flag1' } },
        ];
        const case9: HelpSections = [
          { type: 'usage', requires: { flag2: 'flag3', flag3: 'flag2' } },
        ];
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
        const formatter = new HelpFormatter(options);
        expect(formatter.sections(case0).wrap()).toEqual('[-f1] [-f2] -f3');
        expect(formatter.sections(case1).wrap()).toEqual('[[-f1] -f2] -f3');
        expect(formatter.sections(case2).wrap()).toEqual('[-f1 [-f2]] -f3');
        expect(formatter.sections(case3).wrap()).toEqual('[-f1 -f2] -f3');
        expect(formatter.sections(case4).wrap()).toEqual('[[-f1] -f2] -f3');
        expect(formatter.sections(case5).wrap()).toEqual('-f1 -f2 -f3');
        expect(formatter.sections(case6).wrap()).toEqual('[-f1] -f2 -f3');
        expect(formatter.sections(case7).wrap()).toEqual('[-f1] -f3 [-f2]');
        expect(formatter.sections(case8).wrap()).toEqual('-f1 -f3 -f2');
        expect(formatter.sections(case9).wrap()).toEqual('[-f1] -f2 -f3');
        expect(formatter.sections(case10).wrap()).toEqual('-f1 -f2 -f3');
        expect(formatter.sections(case11).wrap()).toEqual('-f3 [-f2 [-f1]]');
        expect(formatter.sections(case12).wrap()).toEqual('-f3 -f1 -f2');
      });
    });

    describe('rendering a groups section', () => {
      it('skip a section with no content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'groups' }];
        expect(formatter.sections(sections).wrap()).toEqual('');
      });

      it('render the default group', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections: HelpSections = [{ type: 'groups' }];
        expect(formatter.sections(sections).wrap()).toEqual('  -f');
      });

      it('render the default group with a custom heading', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections: HelpSections = [{ type: 'groups', title: 'title' }];
        expect(formatter.sections(sections).wrap()).toEqual('title\n\n  -f');
      });

      it('break the default group', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections: HelpSections = [{ type: 'groups', breaks: 1 }];
        expect(formatter.sections(sections).wrap()).toEqual('\n  -f');
      });

      it('break the default group heading', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections: HelpSections = [{ type: 'groups', title: 'title', breaks: 1 }];
        expect(formatter.sections(sections).wrap()).toEqual('\ntitle\n\n  -f');
      });

      it('include and exclude an group', () => {
        const options = {
          flag1: {
            type: 'flag',
            names: ['-f1'],
            group: 'group1',
          },
          flag2: {
            type: 'flag',
            names: ['-f2'],
            group: 'group2',
          },
        } as const satisfies Options;
        const formatter = new HelpFormatter(options);
        const sections1: HelpSections = [{ type: 'groups', filter: ['group1'] }];
        const sections2: HelpSections = [{ type: 'groups', filter: ['group1'], exclude: true }];
        const sections3: HelpSections = [{ type: 'groups', filter: ['group2', 'group1'] }];
        expect(formatter.sections(sections1).wrap()).toEqual('group1\n\n  -f1');
        expect(formatter.sections(sections2).wrap()).toEqual('group2\n\n  -f2');
        expect(formatter.sections(sections3).wrap()).toEqual('group2\n\n  -f2\n\ngroup1\n\n  -f1');
      });
    });
  });
});
