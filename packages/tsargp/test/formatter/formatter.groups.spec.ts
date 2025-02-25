import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections } from '../../lib/options';
import { HelpFormatter } from '../../lib/formatter';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('HelpFormatter', () => {
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
      expect(formatter.sections(sections).wrap()).toEqual('  -f\n');
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
      expect(formatter.sections(sections).wrap()).toEqual('title\n\n  -f\n');
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
      expect(formatter.sections(sections).wrap()).toEqual('\n  -f\n');
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
      expect(formatter.sections(sections).wrap()).toEqual('\ntitle\n\n  -f\n');
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
      expect(formatter.sections(sections1).wrap()).toEqual('group1\n\n  -f1\n');
      expect(formatter.sections(sections2).wrap()).toEqual('group2\n\n  -f2\n');
      expect(formatter.sections(sections3).wrap()).toEqual('group2\n\n  -f2\n\ngroup1\n\n  -f1\n');
    });
  });
});
