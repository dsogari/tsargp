import { describe, expect, it } from 'bun:test';
import type { HelpSections, Options } from '../../../src/library';
import { format } from '../../../src/library';

describe('format', () => {
  describe('merge columns', () => {
    it('merge option parameters with left-aligned option names', () => {
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
          layout: { param: { merge: true }, items: [] },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '  -s1, --single <param>\n' +
          '  long-parameter-name\n' +
          '  -s3=<param>\n' +
          '  --array[=<param>]\n',
      );
    });

    it('merge option parameters with slotted option names', () => {
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
          layout: {
            names: { slotIndent: 1 }, // ignored by the formatter
            param: { merge: true },
            items: [],
          },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '  -s1, --single <param>\n' +
          '  long-parameter-name\n' +
          '  -s3=<param>\n' +
          '  --array[=<param>]\n',
      );
    });

    it('merge option parameters with option names, with leading line feeds', () => {
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
          layout: {
            param: { merge: true, breaks: 1 },
            items: [],
          },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '  -s1, --single\n' +
          '  <param>\n\n' +
          '  long-parameter-name\n' +
          '  -s3\n' +
          '  =<param>\n' +
          '  --array\n' +
          '  [=<param>]\n',
      );
    });

    it('merge option descriptions with left-aligned option parameters', () => {
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
          layout: { descr: { merge: true } },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        `  -s  <param> A string option\n  -f  A flag option\n`,
      );
    });

    it('merge option descriptions with option parameters, with leading line feeds', () => {
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
          layout: { descr: { merge: true, breaks: 1 } },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        `  -s  <param>\n      A string option\n  -f\n      A flag option\n`,
      );
    });

    it('merge option descriptions with slotted option names', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', null],
          synopsis: 'A string option',
          paramName: '<param>',
        },
        flag: {
          type: 'flag',
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'groups',
          layout: {
            names: { slotIndent: 1 }, // ignored by the formatter
            param: null,
            descr: { merge: true },
          },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(`  -s A string option\n  A flag option\n`);
    });

    it('merge option descriptions and parameters with left-aligned option names', () => {
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
          layout: {
            param: { merge: true },
            descr: { merge: true },
          },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '  -s <param> A string option\n' +
          '  <param> A string option\n' +
          '  -f A flag option\n',
      );
    });

    it('merge option descriptions and parameters with option names, with leading line feeds', () => {
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
          layout: {
            param: { merge: true, breaks: 1 },
            descr: { merge: true, breaks: 1 },
          },
        },
      ];
      expect(format(options, sections).wrap()).toEqual(
        '' +
          '  -s\n' +
          '  <param>\n' +
          '  A string option\n\n' +
          '  <param>\n' +
          '  A string option\n' +
          '  -f\n' +
          '  A flag option\n',
      );
    });
  });

  it('use option-specific layout settings', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s', null],
        synopsis: 'A string option',
        paramName: '<param>',
        layout: {
          names: { slotIndent: 1 }, // ignored by the formatter
          param: null,
          descr: { merge: true },
        },
      },
      single2: {
        type: 'single',
        synopsis: 'A string option',
        paramName: '<param>',
        layout: {
          param: { merge: true },
          descr: { merge: true },
        },
      },
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: 'A flag option',
        layout: {
          param: { merge: true, breaks: 1 },
          descr: { merge: true, breaks: 1 },
        },
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      '' +
        '  -s A string option\n' +
        '  <param> A string option\n' +
        '  -f\n' +
        '  A flag option\n',
    );
  });
});
