import { describe, expect, it } from 'bun:test';
import type { Options, FormatterFlags, HelpSections } from '../../../src/library';
import { format, HelpItem, tf, style } from '../../../src/library';

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
      names: ['--flag'],
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
      expect(format(options, sections).wrap()).toEqual('text\n  -f\n');
    });

    it('break the heading with no text', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { breaks: 1 } }];
      expect(format(options, sections).wrap()).toEqual('\n  -f\n');
    });

    it('break the heading with text', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text', breaks: 1 } }];
      expect(format(options, sections).wrap()).toEqual('\ntext\n  -f\n');
    });

    it('avoid breaking the heading with no text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'groups', heading: { breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options2, sections).wrap()).toEqual('  -f\n\ngroup\n  --flag\n');
    });

    it('avoid breaking the heading with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'groups', heading: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options2, sections).wrap()).toEqual('text -f\n\ngroup\n  --flag\n');
    });

    it('indent the heading with text', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text', indent: 2 } }];
      expect(format(options, sections).wrap()).toEqual('  text\n  -f\n');
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
      expect(format(options, sections).wrap()).toEqual('text  spaces\n  -f\n');
    });

    it('replace the heading with the group name', () => {
      const sections: HelpSections = [{ type: 'groups', heading: { text: 'text' } }];
      expect(format(options2, sections).wrap()).toEqual('text -f\ngroup\n  --flag\n');
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
      expect(format(options, sections).wrap()).toEqual('text  spaces\n  -f\n');
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
      expect(format(options2, sections).wrap()).toEqual('  -f\n\n  --flag\n');
    });

    it('avoid breaking the content with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'groups', content: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format(options2, sections).wrap()).toEqual('text\n\n  -f\n\n  --flag\n');
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
      expect(format(options2, sections).wrap()).toEqual('text\n\n  -f\n  --flag\n');
    });
  });

  it('combine a section filter with an option filter', () => {
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
    const case0: HelpSections = [{ type: 'groups', filter: { includeGroups: [] } }];
    const case1: HelpSections = [{ type: 'groups', filter: { includeGroups: ['group1'] } }];
    const case2: HelpSections = [{ type: 'groups', filter: { excludeGroups: ['group1', ''] } }];
    const case3: HelpSections = [
      { type: 'groups', filter: { includeGroups: ['group2', 'group1'] } },
    ];
    const case4: HelpSections = [{ type: 'groups', filter: { includeGroups: [''] } }];
    const case5: HelpSections = [
      { type: 'groups', filter: { includeGroups: [], excludeGroups: ['group1', ''] } },
    ];
    const case6: HelpSections = [
      { type: 'groups', filter: { includeGroups: ['group1', ''], excludeGroups: [''] } },
    ];
    const case7: HelpSections = [{ type: 'groups', filter: { excludeGroups: [] } }];
    const case8: HelpSections = [
      { type: 'groups', filter: { includeOptions: ['single1'] }, heading: {} },
    ];
    const case9: HelpSections = [
      { type: 'groups', filter: { includeOptions: ['flag2'], includeGroups: ['group1'] } },
    ];
    const case10: HelpSections = [
      { type: 'groups', filter: { excludeOptions: ['flag2'], excludeGroups: ['group1'] } },
    ];
    const case11: HelpSections = [
      {
        type: 'groups',
        filter: {
          includeOptions: ['flag2'],
          includeGroups: ['group1'],
          excludeOptions: ['flag2'],
          excludeGroups: ['group1'],
        },
      },
    ];
    const flags: FormatterFlags = { optionFilter: ['-f1', '-f2', '-s2'] };
    expect(format(options, case0, flags).wrap()).toEqual('');
    expect(format(options, case1, flags).wrap()).toEqual('  -f1\n');
    expect(format(options, case2, flags).wrap()).toEqual('  -f2\n');
    expect(format(options, case3, flags).wrap()).toEqual('  -f1\n  -f2\n'); // definition order
    expect(format(options, case4, flags).wrap()).toEqual('  -s2\n'); // default group
    expect(format(options, case5, flags).wrap()).toEqual('');
    expect(format(options, case6, flags).wrap()).toEqual('  -f1\n');
    expect(format(options, case7, flags).wrap()).toEqual('  -f1\n  -f2\n  -s2\n');
    expect(format(options, case8, flags).wrap()).toEqual('');
    expect(format(options, case9, flags).wrap()).toEqual('  -f1\n  -f2\n');
    expect(format(options, case10, flags).wrap()).toEqual('  -s2\n');
    expect(format(options, case11, flags).wrap()).toEqual('');
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
        layout: { items: [HelpItem.synopsis] },
        useEnv: true,
      },
    ];
    expect(format(options, sections).wrap()).toEqual(`  FLAG, THE_FLAG    A flag option\n`);
  });
});
