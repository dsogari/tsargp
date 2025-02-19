import { describe, expect, it } from 'bun:test';
import type { PartialHelpLayout } from '../../lib/config';
import type { Options } from '../../lib/options';
import { HelpFormatter } from '../../lib/formatter';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('HelpFormatter', () => {
  describe('format', () => {
    it('handle zero options', () => {
      const formatter = new HelpFormatter({});
      expect(formatter.format().wrap()).toEqual('');
    });

    it('handle a flag option with a group', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          group: 'group',
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format('group');
      expect(message.wrap()).toEqual(`  -f\n`);
    });

    it('filter options using a single regular expression', () => {
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
      const config: PartialHelpLayout = { descr: { absolute: true } };
      const message = new HelpFormatter(options, undefined, config, ['flag']).format();
      expect(message.wrap()).toEqual(`  -f, --flag\n  A flag option\n`);
    });

    it('filter an option with environment variable using multiple regular expressions', () => {
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
      const config: PartialHelpLayout = { items: [] };
      const message = new HelpFormatter(options, undefined, config, ['-f', 'sing']).format();
      expect(message.wrap()).toEqual(`  -f\n  -s  <param>\n`);
    });

    it('handle a help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          useCommand: true,
          useFilter: true,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(
        `  -h    ` +
          `Uses the next argument as the name of a subcommand. ` +
          `Uses the remaining arguments as option filter.\n`,
      );
    });

    it('handle a function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -f  [<param>...]  Accepts multiple parameters.\n`);
    });

    it('handle a command option', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -c  ...\n`);
    });

    it('handle an option that is always required', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          required: true,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -f    Always required.\n`);
    });

    it('handle a flag option with an external reference', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          link: new URL('https://dsogari.github.io/tsargp/docs'),
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(
        `  -f    Refer to https://dsogari.github.io/tsargp/docs for details.\n`,
      );
    });

    it('handle a flag option deprecated for a reason', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          deprecated: 'reason',
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -f    Deprecated for reason.\n`);
    });

    it('handle a flag option with cluster letters', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          cluster: 'fF',
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -f    Can be clustered with 'fF'.\n`);
    });

    it('handle a flag option that reads data from standard input', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          stdin: true,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -f    Reads data from standard input.\n`);
    });

    it('handle a flag option with an environment variable', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          sources: ['VAR', new URL('file://path')],
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -f    Reads environment data from VAR, file://path/.\n`);
    });

    it('handle a single-valued option that accepts positional arguments', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: true,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(`  -s  <param>  Accepts positional arguments.\n`);
    });

    it('handle a single-valued option that accepts positional arguments after marker', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          positional: '--',
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(
        `  -s  <param>  Accepts positional arguments that may be preceded by --.\n`,
      );
    });

    it('handle an array-valued option whose parameters can be delimited', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          separator: ',',
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(
        `  -a  [<param>...]  Values can be delimited with ','. Accepts multiple parameters.\n`,
      );
    });

    it('handle an array-valued option that can be specified multiple times', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          append: true,
        },
      } as const satisfies Options;
      const message = new HelpFormatter(options).format();
      expect(message.wrap()).toEqual(
        `  -a  [<param>...]  Accepts multiple parameters. Can be specified multiple times.\n`,
      );
    });
  });
});
