import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections } from '../../../src/library/options';
import { format } from '../../../src/library/formatter';
import { HelpItem, tf } from '../../../src/library/enums';
import { style } from '../../../src/library/styles';

describe('rendering a groups section', () => {
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
      group: 'group',
    },
  } as const satisfies Options;

  it('skip a section with no heading and no content', () => {
    const sections: HelpSections = [{ type: 'groups' }];
    expect(format({}, sections).wrap()).toEqual('');
  });

  it('render the default group with no heading and no content', () => {
    const sections: HelpSections = [{ type: 'groups' }];
    expect(format(options, sections).wrap()).toEqual('  -f\n');
  });

  describe('rendering the section heading', () => {
    it('skip the heading when there are no options', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text' } }];
      expect(format({}, sections).wrap()).toEqual('');
    });

    it('avoid braking the heading', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text' } }];
      expect(format(options, sections).wrap()).toEqual('text -f\n');
    });

    it('break the heading with no text', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { breaks: 1 } }];
      expect(format(options, sections).wrap()).toEqual('\n  -f\n');
    });

    it('break the heading with text', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text', breaks: 1 } }];
      expect(format(options, sections).wrap()).toEqual('\ntext -f\n');
    });

    it('avoid breaking the heading with no text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'groups', heading: { breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options2, sections).wrap()).toEqual('  -f\n\ngroup -f2\n');
    });

    it('avoid breaking the heading with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'groups', heading: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options2, sections).wrap()).toEqual('text -f\n\ngroup -f2\n');
    });

    it('indent the heading with text', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text', indent: 2 } }];
      expect(format(options, sections).wrap()).toEqual('  text -f\n');
    });

    it('right-align the heading with text', () => {
      const sections: HelpSections = [
        { type: 'groups', heading: { text: 'text', align: 'right' } },
      ];
      expect(format(options, sections).wrap(10, false, true)).toEqual('      text\n  -f\n');
    });

    it('avoid splitting the heading with text', () => {
      const sections: HelpSections = [
        { type: 'groups', heading: { text: `text ${style(tf.clear)} spaces`, noSplit: true } },
      ];
      expect(format(options, sections).wrap()).toEqual('text  spaces -f\n');
    });

    it('replace the heading with the group name', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text' } }];
      expect(format(options2, sections).wrap()).toEqual('text -f\ngroup -f2\n');
    });

    it('avoid splitting the group name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          group: `text ${style(tf.clear)} spaces`,
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'groups', heading: { noSplit: true } }];
      expect(format(options, sections).wrap()).toEqual('text  spaces -f\n');
    });
  });

  describe('rendering the section content', () => {
    it('skip the section content when there are no options', () => {
      const sections: HelpSections = [{ type: 'groups', content: { text: 'text' } }];
      expect(format({}, sections).wrap()).toEqual('');
    });

    it('include trailing line feeds in content with text', () => {
      const sections: HelpSections = [{ type: 'groups', content: { text: 'text' } }];
      expect(format(options, sections).wrap()).toEqual('text\n\n  -f\n');
    });

    it('break the content with no text', () => {
      const sections: HelpSections = [{ type: 'groups', content: { breaks: 1 } }];
      expect(format(options, sections).wrap()).toEqual('\n  -f\n');
    });

    it('break the content with text', () => {
      const sections: HelpSections = [{ type: 'groups', content: { text: 'text', breaks: 1 } }];
      expect(format(options, sections).wrap()).toEqual('\ntext\n\n  -f\n');
    });

    it('avoid breaking the content with no text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'groups', content: { breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options2, sections).wrap()).toEqual('  -f\n\n  -f2\n');
    });

    it('avoid breaking the content with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'groups', content: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options2, sections).wrap()).toEqual('text\n\n  -f\n\n  -f2\n');
    });

    it('indent the content with text', () => {
      const sections: HelpSections = [{ type: 'groups', content: { text: 'text', indent: 2 } }];
      expect(format(options, sections).wrap()).toEqual('  text\n\n  -f\n');
    });

    it('right-align the content with text', () => {
      const sections: HelpSections = [
        { type: 'groups', content: { text: 'text', align: 'right' } },
      ];
      expect(format(options, sections).wrap(10, false, true)).toEqual('      text\n\n  -f\n');
    });

    it('avoid splitting the content with text', () => {
      const sections: HelpSections = [
        { type: 'groups', content: { text: `text ${style(tf.clear)} spaces`, noSplit: true } },
      ];
      expect(format(options, sections).wrap()).toEqual('text  spaces\n\n  -f\n');
    });

    it('remove the content in a non-default group', () => {
      const sections: HelpSections = [{ type: 'groups', content: { text: 'text' } }];
      expect(format(options2, sections).wrap()).toEqual('text\n\n  -f\n  -f2\n');
    });
  });

  it('combine a group filter with an option filter', () => {
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
      single1: {
        type: 'single',
        names: ['-s1'],
        group: 'group3',
      },
      single2: {
        type: 'single',
        names: ['-s2'],
      },
    } as const satisfies Options;
    const sections0: HelpSections = [{ type: 'groups', filter: [] }]; // empty filter
    const sections1: HelpSections = [{ type: 'groups', filter: ['group1'] }];
    const sections2: HelpSections = [{ type: 'groups', filter: ['group1', ''], exclude: true }];
    const sections3: HelpSections = [{ type: 'groups', filter: ['group2', 'group1'] }];
    const sections4: HelpSections = [{ type: 'groups', filter: [''] }]; // default group
    const filter = ['-f1', '-f2', '-s2'];
    expect(format(options, sections0, filter).wrap()).toEqual('');
    expect(format(options, sections1, filter).wrap()).toEqual('  -f1\n');
    expect(format(options, sections2, filter).wrap()).toEqual('  -f2\n');
    expect(format(options, sections3, filter).wrap()).toEqual('  -f2\n  -f1\n');
    expect(format(options, sections4, filter).wrap()).toEqual('  -s2  <param>\n');
  });

  it('use environment variable names instead of option names', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: 'A flag option',
        sources: ['FLAG', 'THE_FLAG'],
      },
      single: {
        // this option should be hidden
        type: 'single',
        names: ['-s'],
        synopsis: 'A single option',
      },
    } as const satisfies Options;
    const sections: HelpSections = [
      {
        type: 'groups',
        useEnv: true,
        items: [HelpItem.synopsis],
      },
    ];
    expect(format(options, sections).wrap()).toEqual(`  FLAG, THE_FLAG    A flag option\n`);
  });
});
