import { describe, expect, it } from 'vitest';
import type { Options, HelpSections } from '../../lib';
import { JsonFormatter, CsvFormatter, MdFormatter, OptionValidator, style, tf } from '../../lib';
import { fieldNames } from '../../lib/options';
import '../utils.spec'; // initialize globals

describe('JsonFormatter', () => {
  describe('formatHelp', () => {
    it('should handle a non-existent group', () => {
      const message = new JsonFormatter(new OptionValidator({})).formatHelp();
      expect(message.message).toEqual('[]');
    });

    it('should handle a flag option with a default callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f', '--flag'],
          default: () => true,
        },
      } as const satisfies Options;
      const message = new JsonFormatter(new OptionValidator(options)).formatHelp();
      expect(message.message).toEqual(
        `[{"type":"flag","names":["-f","--flag"],"preferredName":"-f"}]`,
      );
    });
  });

  describe('formatSections', () => {
    it('should handle help sections', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'groups' }];
      const message = new JsonFormatter(new OptionValidator(options)).formatSections(sections);
      expect(message.message).toEqual(`[{"type":"flag","names":["-f"],"preferredName":"-f"}]`);
    });
  });
});

describe('CsvFormatter', () => {
  describe('formatHelp', () => {
    it('should handle a non-existent group', () => {
      const message = new CsvFormatter(new OptionValidator({})).formatHelp();
      expect(message.message).toEqual(fieldNames.join('\t'));
    });

    it('should handle a number option with a default callback', () => {
      const options = {
        number: {
          type: 'number',
          names: ['-n', '--number'],
          desc: style(tf.clear) + 'A\n  number\t  option',
          default: () => 1,
        },
      } as const satisfies Options;
      const message = new CsvFormatter(new OptionValidator(options)).formatHelp();
      expect(message.message).toEqual(
        fieldNames.join('\t') +
          `\nnumber\t-n,--number\tA number option` +
          '\t'.repeat(16) +
          '() => 1' +
          '\t'.repeat(9),
      );
    });
  });

  describe('formatSections', () => {
    it('should handle help sections', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'groups' }];
      const message = new CsvFormatter(new OptionValidator(options)).formatSections(sections);
      expect(message.message).toEqual(fieldNames.join('\t') + `\nflag\t-f` + '\t'.repeat(26));
    });
  });
});

describe('MdFormatter', () => {
  describe('formatHelp', () => {
    it('should handle a non-existent group', () => {
      const message = new MdFormatter(new OptionValidator({})).formatHelp();
      expect(message.message).toEqual(
        ' | ' +
          fieldNames.join(' | ') +
          ` | \n | ` +
          fieldNames.map((field) => '-'.repeat(field.length)).join(' | ') +
          ' | ',
      );
    });

    it('should handle a number option with a default callback', () => {
      const options = {
        number: {
          type: 'number',
          names: ['-n', '--number'],
          desc: style(tf.clear) + 'A\n  number\t  option',
          default: () => 1,
        },
      } as const satisfies Options;
      const message = new MdFormatter(new OptionValidator(options)).formatHelp();
      expect(message.message).toEqual(
        ' | ' +
          fieldNames.join(' | ') +
          ` | \n | ` +
          fieldNames.map((field) => '-'.repeat(field.length)).join(' | ') +
          ` | \n | number | -n,--number | A number option` +
          ' | '.repeat(16) +
          '() => 1' +
          ' | '.repeat(10),
      );
    });
  });

  describe('formatSections', () => {
    it('should handle help sections', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [{ type: 'groups' }];
      const message = new MdFormatter(new OptionValidator(options)).formatSections(sections);
      expect(message.message).toEqual(
        ' | ' +
          fieldNames.join(' | ') +
          ` | \n | ` +
          fieldNames.map((field) => '-'.repeat(field.length)).join(' | ') +
          ` | \n | flag | -f` +
          ' | '.repeat(27),
      );
    });
  });
});
