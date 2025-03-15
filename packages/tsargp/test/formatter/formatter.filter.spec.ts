import { describe, expect, it } from 'bun:test';
import type { HelpSections, Options } from '../../src/library/options';
import { format } from '../../src/library/formatter';

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
      const sections: HelpSections = [{ type: 'groups', layout: { descr: { absolute: true } } }];
      expect(format(options, sections, ['flag']).wrap()).toEqual(`  -f, --flag\n  A flag option\n`);
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
      expect(format(options, sections, ['-f', 'sing']).wrap()).toEqual(`  -f\n  -s  <param>\n`);
    });
  });
});
