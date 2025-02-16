import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections, PartialFormatterConfig } from '../../lib/options';
import { JsonFormatter, CsvFormatter, MdFormatter } from '../../lib/formatter';
import { style } from '../../lib/styles';
import { HelpItem, tf } from '../../lib/enums';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('JsonFormatter', () => {
  describe('format', () => {
    it('handle zero options', () => {
      const formatter = new JsonFormatter({});
      expect(formatter.format().message).toEqual('[]');
    });

    it('handle a flag option with a group and a default callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          group: 'group',
          default: () => true, // JSON.stringify does not render functions
        },
      } as const satisfies Options;
      const formatter = new JsonFormatter(options);
      const expected = `[{"type":"flag","names":["-f"],"group":"group"}]`;
      expect(formatter.format('group').message).toEqual(expected);
      expect(formatter.format('group').message).toEqual(expected); // <<-- keep this
    });
  });

  describe('sections', () => {
    it('handle various options', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          group: 'group',
          default: () => true,
        },
        single: {
          type: 'single',
          names: ['-s', '--single'],
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { items: [HelpItem.synopsis, HelpItem.default] };
      const formatter = new JsonFormatter(options, config);
      const sections: HelpSections = [{ type: 'groups' }];
      const expected =
        `[{"type":"flag","names":["-f"],"group":"group"},` +
        `{"type":"single","names":["-s","--single"]}]`;
      expect(formatter.sections(sections).message).toEqual(expected);
      expect(formatter.sections(sections).message).toEqual(expected); // <<-- keep this
    });
  });
});

describe('CsvFormatter', () => {
  describe('format', () => {
    it('handle zero options', () => {
      const formatter = new CsvFormatter({});
      expect(formatter.format().message).toEqual('');
    });

    it('handle a single-valued option with a group and a default callback', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          synopsis: style(tf.clear) + 'A\n  number\t  option',
          group: 'group',
          default: () => 1,
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { items: [HelpItem.synopsis, HelpItem.default] };
      const formatter = new CsvFormatter(options, config);
      const expected =
        `type\tgroup\tnames\tsynopsis\tdefault\n` +
        `single\tgroup\t-s,--single\tA number option\t() => 1`;
      expect(formatter.format('group').message).toEqual(expected);
      expect(formatter.format('group').message).toEqual(expected); // <<-- keep this
    });
  });

  describe('sections', () => {
    it('handle help sections', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          group: 'group',
        },
        single: {
          type: 'single',
          names: ['-s', '--single'],
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { items: [HelpItem.synopsis] };
      const formatter = new CsvFormatter(options, config);
      const sections: HelpSections = [{ type: 'groups' }];
      const expected = `type\tgroup\tnames\tsynopsis\nflag\tgroup\t-f\t\nsingle\t\t-s,--single\t`;
      expect(formatter.sections(sections).message).toEqual(expected);
      expect(formatter.sections(sections).message).toEqual(expected); // <<-- keep this
    });
  });
});

describe('MdFormatter', () => {
  describe('format', () => {
    it('handle zero options', () => {
      const formatter = new MdFormatter({});
      expect(formatter.format().message).toEqual('');
    });

    it('handle a number option with a group and a default callback', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          synopsis: style(tf.clear) + 'A\n  number\t  option',
          group: 'group',
          default: () => 1,
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { items: [HelpItem.synopsis, HelpItem.default] };
      const formatter = new MdFormatter(options, config);
      const expected =
        `| type | names | synopsis | default |\n` +
        `| ---- | ----- | -------- | ------- |\n` +
        `| single | -s,--single | A number option | () => 1 |`;
      expect(formatter.format('group').message).toEqual(expected);
      expect(formatter.format('group').message).toEqual(expected); // <<-- keep this
    });
  });

  describe('sections', () => {
    it('handle help sections', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
        single: {
          type: 'single',
          names: ['-s', '--single'],
          group: 'group',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { items: [HelpItem.synopsis] };
      const formatter = new MdFormatter(options, config);
      const sections: HelpSections = [{ type: 'groups' }];
      const expected =
        `| type | names | synopsis |\n` +
        `| ---- | ----- | -------- |\n` +
        `| flag | -f |  |\n\n` +
        `## group\n\n` +
        `| type | names | synopsis |\n` +
        `| ---- | ----- | -------- |\n` +
        `| single | -s,--single |  |`;
      expect(formatter.sections(sections).message).toEqual(expected);
      expect(formatter.sections(sections).message).toEqual(expected); // <<-- keep this
    });
  });
});
