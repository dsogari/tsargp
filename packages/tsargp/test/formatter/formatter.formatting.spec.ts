import { describe, expect, it } from 'bun:test';
import type { Options, PartialFormatterConfig } from '../../lib/options';
import { tf, ConnectiveWord } from '../../lib/enums';
import { HelpFormatter } from '../../lib/formatter';
import { style } from '../../lib/styles';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('HelpFormatter', () => {
  describe('format', () => {
    it('handle an option with no names or description', () => {
      const options = {
        flag: { type: 'flag' },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual('\n');
    });

    it('handle an option with empty names array', () => {
      const options = {
        flag: {
          type: 'flag',
          names: [],
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual('\n');
    });

    it('handle an option with no description', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual('  -f\n');
    });

    it('handle an option with custom styles', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f', '--flag'],
          synopsis: 'A flag option.',
          default: 1,
          styles: {
            names: style(tf.bold),
            descr: style(tf.faint),
          },
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap(0, true)).toEqual(
        '\x1b[3G\x1b[1m' +
          '-f' +
          '\x1b[0m' +
          ', ' +
          '\x1b[1m' +
          '--flag' +
          '\x1b[0m\x1b[17G' +
          '\x1b[2mA flag option. ' +
          'Defaults to \x1b[33m1\x1b[0m\x1b[2m.' +
          '\x1b[0m\n\x1b[0m',
      );
    });

    it('handle an option with inline styles in the description', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: `A ${style(tf.bold)}flag${style(tf.clear)} option`,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap(0, true)).toEqual(
        '\x1b[3G\x1b[35m' +
          '-f' +
          '\x1b[0m\x1b[9G' +
          'A ' +
          '\x1b[1m' +
          'flag' +
          '\x1b[0m' +
          ' option' +
          '\x1b[0m\n\x1b[0m',
      );
    });

    it('handle an option with paragraphs in the description', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: `A flag option with
          line breaks,\ttabs and ...

          paragraphs`,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toMatch(
        /^ {2}-f {4}A flag option with line breaks, tabs and ...\n\n {8}paragraphs\n$/,
      );
    });

    it('handle an option with lists in the description', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: `A flag option with lists:
          - item1
          * item2
          1. item3`,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toMatch(
        /^ {2}-f {4}A flag option with lists:\n {8}- item1\n {8}\* item2\n {8}1\. item3\n$/,
      );
    });

    it('hide an option from the help message when it asks so', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f', '--flag'],
          synopsis: 'A flag option',
          group: null,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual('');
    });

    it('not break columns in the help message when configured with negative values', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = {
        names: { breaks: -1 },
        param: { breaks: -1 },
        descr: { breaks: -1 },
      };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('  -s  <param>  A boolean option\n');
    });

    it('break columns in the help message when configured with positive indentation', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = {
        names: { breaks: 1 },
        param: { breaks: 1 },
        descr: { breaks: 1 },
      };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toMatch(/^\n {2}-s\n {6}<param>\n {15}A boolean option\n$/);
    });

    it('break columns in the help message when configured with absolute indentation', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = {
        names: { breaks: 1 },
        param: { breaks: 1, absolute: true },
        descr: { breaks: 1, absolute: true },
      };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toMatch(`\n  -s\n  <param>\n  A boolean option\n`);
    });

    it('break columns in the help message when configured with negative indentation', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = {
        names: { breaks: 1, indent: -1 },
        param: { breaks: 1, indent: -1 },
        descr: { breaks: 1, indent: -1 },
      };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toMatch(/^\n-s\n <param>\n {7}A boolean option\n$/);
    });

    it('hide the option names from the help message when configured to do so', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { names: { hidden: true } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('    <param>  A boolean option\n');
    });

    it('hide the option parameter from the help message when configured to do so', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { param: { hidden: true } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('  -s    A boolean option\n');
    });

    it('hide the option description from the help message when configured to do so', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { descr: { hidden: true } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('  -s  <param>\n');
    });

    it('align option names to the left boundary without separator', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f', null, '--flag'],
          synopsis: 'A flag option',
        },
        flag2: {
          type: 'flag',
          names: [null, '--flag2', null],
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = {
        names: { align: 'left' },
        connectives: { [ConnectiveWord.optionSep]: '' },
      };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual(
        `  -f --flag    A flag option\n  --flag2      A flag option\n`,
      );
    });

    it('align option names to the left boundary with a separator', () => {
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
      const config: PartialFormatterConfig = { names: { align: 'left' } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('  -f, --flag\n  --flag2\n');
    });

    it('align option names to the right boundary', () => {
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
      const config: PartialFormatterConfig = { names: { align: 'right' } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('  -f, --flag\n     --flag2\n');
    });

    it('align option names within slots without separator', () => {
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
      const config: PartialFormatterConfig = {
        names: { align: 'slot' },
        connectives: { [ConnectiveWord.optionSep]: '' },
      };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('  -f         --flag\n     --flag2\n');
    });

    it('align option names within slots with a separator', () => {
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
      const config: PartialFormatterConfig = { names: { align: 'slot' } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual('  -f           --flag\n      --flag2\n');
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
      const config: PartialFormatterConfig = { param: { align: 'right' }, items: [] };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual(`  -s1  'abcde'\n  -s2     'ab'\n`);
    });

    it('align option descriptions to the right boundary', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { descr: { align: 'right' } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap(14, false)).toEqual('  -f    A flag\n        option\n');
    });

    it('merge option parameters with option names', () => {
      const options = {
        single1: {
          type: 'single',
          names: ['-s1'],
        },
        single2: {
          type: 'single',
        },
        single3: {
          type: 'single',
          names: ['-s3'],
          inline: 'always',
        },
        array: {
          type: 'array',
          names: ['-a'],
          inline: 'always',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { param: { align: 'merge' }, items: [] };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual(`  -s1 <param>\n  <param>\n  -s3=<param>\n  -a[=<param>]\n`);
    });

    it('merge option descriptions with option parameters', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = { descr: { align: 'merge' } };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual(`  -s  <param> A boolean option\n  -f  A flag option\n`);
    });

    it('merge option descriptions with option parameters and option names', () => {
      const options = {
        single1: {
          type: 'single',
          names: ['-s'],
          synopsis: 'A boolean option',
        },
        single2: {
          type: 'single',
          synopsis: 'A string option',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          synopsis: 'A flag option',
        },
      } as const satisfies Options;
      const config: PartialFormatterConfig = {
        param: { align: 'merge' },
        descr: { align: 'merge' },
      };
      const message = new HelpFormatter(options, config).format();
      expect(message.wrap()).toEqual(
        `  -s <param> A boolean option\n  <param> A string option\n  -f A flag option\n`,
      );
    });
  });
});
