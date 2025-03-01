import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections } from '../../../lib/options';
import { format } from '../../../lib/formatter';
import { HelpItem } from '../../../lib/enums';

describe('rendering a groups section', () => {
  it('skip a section with no content', () => {
    const sections: HelpSections = [{ type: 'groups' }];
    expect(format({}, sections).wrap()).toEqual('');
  });

  it('render the default group with no heading', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;
    const sections: HelpSections = [{ type: 'groups' }];
    expect(format(options, sections).wrap()).toEqual('  -f\n');
  });

  it('render the default group with a custom heading', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;
    const sections: HelpSections = [{ type: 'groups', title: 'title' }];
    expect(format(options, sections).wrap()).toEqual('title\n\n  -f\n');
  });

  it('break the default group', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;
    const sections: HelpSections = [{ type: 'groups', breaks: 1 }];
    expect(format(options, sections).wrap()).toEqual('\n  -f\n');
  });

  it('break the default group heading', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
      },
    } as const satisfies Options;
    const sections: HelpSections = [{ type: 'groups', title: 'title', breaks: 1 }];
    expect(format(options, sections).wrap()).toEqual('\ntitle\n\n  -f\n');
  });

  it('include and exclude an group, with an option filter', () => {
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
      single: {
        type: 'single',
        names: ['-s'],
        group: 'group3',
      },
    } as const satisfies Options;
    const sections0: HelpSections = [{ type: 'groups', filter: [] }]; // empty filter
    const sections1: HelpSections = [{ type: 'groups', filter: ['group1'] }];
    const sections2: HelpSections = [{ type: 'groups', filter: ['group1'], exclude: true }];
    const sections3: HelpSections = [{ type: 'groups', filter: ['group2', 'group1'] }];
    const filter = ['-f1', '-f2'];
    expect(format(options, sections0, filter).wrap()).toEqual('');
    expect(format(options, sections1, filter).wrap()).toEqual('group1\n\n  -f1\n');
    expect(format(options, sections2, filter).wrap()).toEqual('group2\n\n  -f2\n');
    expect(format(options, sections3, filter).wrap()).toEqual(
      'group2\n\n  -f2\n\ngroup1\n\n  -f1\n',
    );
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
