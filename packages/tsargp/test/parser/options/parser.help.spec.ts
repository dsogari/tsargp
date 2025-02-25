import { describe, expect, it } from 'bun:test';
import { type Options } from '../../../lib/options';
import { parse, ParsingFlags } from '../../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a help option', () => {
    it('handles an option with empty name', () => {
      const options = {
        help: {
          type: 'help',
          names: [''],
          sections: [{ type: 'groups' }],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('help');
      expect(parse(options, [''])).rejects.toThrow(`\n`);
    });

    it('save the help message when the option explicitly asks so', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          saveMessage: true,
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ help: undefined });
      expect(parse(options, ['-h'])).resolves.toEqual({
        help: expect.objectContaining({ message: '  -h\n' }),
      });
    });

    it('throw a help message with default settings', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          group: 'Args:',
        },
        help: {
          type: 'help',
          names: ['-h'],
          synopsis: 'the help option',
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('help');
      expect(parse(options, ['-h'], { progName: 'prog' })).rejects.toThrow(
        `Usage:\n\n  prog [-f] [-h]\n\nArgs:\n\n  -f\n\nOptions:\n\n  -h    the help option\n`,
      );
    });

    it('throw a help message with usage and custom indentation', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          group: 'group  heading',
          sections: [
            { type: 'usage', title: 'usage  heading' },
            { type: 'groups', noWrap: true },
          ],
          layout: { names: { indent: 0 } },
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('help');
      expect(parse(options, ['-h'], { progName: 'prog' })).rejects.toThrow(
        `usage heading\n\nprog [-h]\n\ngroup  heading\n\n-h\n`,
      );
    });

    it('throw a help message with option filter', () => {
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
          names: ['-s', '--single'],
        },
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          useFilter: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-F', '-S'])).rejects.toThrow(
        `  -f, --flag\n  -s, --single  <param>\n`,
      );
    });

    it('throw the help message of a subcommand with option filter', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          layout: { descr: { hidden: true } },
          useCommand: true,
          useFilter: true,
        },
        command1: {
          type: 'command',
          names: ['cmd1'],
          options: {
            flag: {
              type: 'flag',
              names: ['-f'],
            },
          },
        },
        command2: {
          type: 'command',
          names: ['cmd2'],
          options: async () => ({
            flag: {
              type: 'flag',
              names: ['-f'],
            },
            help: {
              type: 'help',
              names: ['-h'],
              sections: [{ type: 'groups' }],
              layout: { descr: { hidden: true } },
              useFilter: true,
            },
          }),
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-h'])).rejects.toThrow('  -h\n');
      expect(parse(options, ['-h', 'cmd1'])).rejects.toThrow('  cmd1  ...\n');
      expect(parse(options, ['-h', 'cmd2'])).rejects.toThrow('  -f\n  -h\n');
      expect(parse(options, ['-h', 'cmd2', '-f'])).rejects.toThrow('  -f\n');
    });

    it('throw the help message of a subcommand with a dynamic module with no help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          layout: { descr: { hidden: true } },
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: '../../data/no-help',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-h', '-c'], flags)).rejects.toThrow('  -c  ...\n');
    });

    it('throw the help message of a subcommand with a dynamic module with a help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups' }],
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: '../../data/with-help',
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { resolve: import.meta.resolve.bind(import.meta) };
      expect(parse(options, ['-h', '-c'], flags)).rejects.toThrow('  -f\n');
    });
  });
});
