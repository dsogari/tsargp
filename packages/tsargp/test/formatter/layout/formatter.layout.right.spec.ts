import { describe, expect, it } from 'bun:test';
import type { HelpSections, Options } from '../../../src/library';
import { format } from '../../../src/library';

describe('format', () => {
  describe('right-aligned', () => {
    it('align option names to the right boundary in the same group', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f', null, '--flag'],
        },
        flag2: {
          type: 'flag',
          names: [null, '--flag2', null],
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          names: { align: 'right' },
        },
      ];
      expect(format(options, sections).wrap()).toEqual('  -f, --flag\n     --flag2\n');
    });

    it('align option names to the right boundary in different groups', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f', null, '--flag'],
        },
        flag2: {
          type: 'flag',
          names: [null, '--flag2', null],
          group: 'group',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          filter: { includeGroups: ['group', ''] }, // preserve definition order
          names: { align: 'right' },
        },
      ];
      expect(format(options, sections).wrap()).toEqual('  -f, --flag\n     --flag2\n');
    });

    it('align option names within slots to the right boundary', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1', '--flag1'],
        },
        flag2: {
          type: 'flag',
          names: ['--flag2', '-f2'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          names: { align: 'right', slotIndent: 1 },
        },
      ];
      expect(format(options, sections).wrap()).toEqual('      -f1, --flag1\n  --flag2,     -f2\n');
    });

    it('align option parameters to the right boundary', () => {
      const options = {
        single1: {
          type: 'single',
          names: ['-s1'],
          example: 'abcde',
        },
        single2: {
          type: 'single',
          names: ['-s2'],
          example: 'ab',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          param: { align: 'right' },
          items: [],
        },
      ];
      expect(format(options, sections).wrap()).toEqual(`  -s1  'abcde'\n  -s2     'ab'\n`);
    });

    it('align option descriptions to the right boundary', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          descr: { align: 'right' },
        },
      ];
      expect(format(options, sections).wrap(14, false, true)).toEqual(
        '  -f    A flag\n        option\n',
      );
    });

    it('merge option parameters with right-aligned option names', () => {
      const options = {
        single1: {
          type: 'single',
          names: ['-s1', '--single'],
          paramName: '<param>',
        },
        single2: {
          type: 'single',
          paramName: 'long-parameter-name',
        },
        single3: {
          type: 'single',
          names: [null, '-s3'],
          inline: 'always',
          paramName: '<param>',
        },
        array: {
          type: 'array',
          names: ['--array'],
          inline: 'always',
          paramName: '<param>',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          names: { align: 'right' },
          param: { merge: true },
          items: [],
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '  -s1, --single <param>\n' +
          '    long-parameter-name\n' +
          '            -s3=<param>\n' +
          '      --array[=<param>]\n',
      );
    });

    it('merge option descriptions with right-aligned option parameters', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A string option',
          paramName: '<param>',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          param: { align: 'right' },
          descr: { merge: true },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        `  -s  <param> A string option\n  -f            A flag option\n`,
      );
    });

    it('merge option descriptions and parameters with right-aligned option names', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A string option',
          paramName: '<param>',
        },
        single2: {
          type: 'single',
          synopsis: 'A string option',
          paramName: '<param>',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          names: { align: 'right' },
          param: { merge: true },
          descr: { merge: true },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '  -s <param> A string option\n' +
          '     <param> A string option\n' +
          '            -f A flag option\n',
      );
    });

    it('force the width of all columns with right-alignment', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          synopsis: 'A single option with big synopsis.',
          paramName: '<param>',
        },
        array: {
          type: 'array',
          names: ['-a', '--array'],
          paramName: '<param> <param>',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          names: { align: 'right', maxWidth: 8 },
          param: { align: 'right', maxWidth: 12 },
          descr: { align: 'right', maxWidth: 20 },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '       -s,\n' +
          '  --single       <param>  A single option with\n' +
          '                                 big synopsis.\n' +
          '       -a,\n' +
          '   --array      [<param>\n' +
          '             <param>...]      Accepts multiple\n' +
          '                                   parameters.\n',
      );
    });

    it('force the width of all columns with right-alignment and non-responsive layout', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          synopsis: 'A single option with big synopsis.',
          paramName: '<param>',
        },
        array: {
          type: 'array',
          names: ['-a', '--array'],
          paramName: '<param> <param>',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          names: { align: 'right', maxWidth: 8 },
          param: { align: 'right', maxWidth: 12 },
          descr: { align: 'right', maxWidth: 20 },
          responsive: false,
        },
      ];
      // should ignore the terminal width
      expect(format(options, sections).wrap(1, false, true)).toEqual(
        '' +
          '       -s,       <param>  A single option with\n' +
          '  --single                       big synopsis.\n' +
          '       -a,      [<param>      Accepts multiple\n' +
          '   --array   <param>...]           parameters.\n',
      );
    });
  });
});
