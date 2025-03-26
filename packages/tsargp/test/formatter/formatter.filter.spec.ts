import { describe, expect, it } from 'bun:test';
import type { FormatterFlags, HelpSections, Options } from '../../src/library';
import { format } from '../../src/library';

describe('format', () => {
  describe('specifying an option filter', () => {
    it('filter options using a single pattern', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f', '--flag'],
        },
        flag2: {
          type: 'flag',
          synopsis: 'A flag option',
        },
        single: {
          type: 'single',
          names: ['-s'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'groups', descr: { absolute: true } }];
      const flags: FormatterFlags = { optionFilter: ['flag'] };
      expect(format(options, sections, flags).wrap()).toEqual(`  -f, --flag\n  A flag option\n`);
    });

    it('filter an option with environment variable using multiple patterns', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f'],
        },
        flag2: {
          type: 'flag',
        },
        single: {
          type: 'single',
          names: ['-s'],
          sources: ['SINGLE'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'groups', items: [] }];
      const flags: FormatterFlags = { optionFilter: ['-f', 'sing'] };
      expect(format(options, sections, flags).wrap()).toEqual(`  -f\n  -s\n`);
    });
  });
});
