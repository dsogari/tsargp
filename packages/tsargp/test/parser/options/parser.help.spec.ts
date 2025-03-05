import { describe, expect, it } from 'bun:test';
import { type Options } from '../../../lib/options';
import { parse } from '../../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a help option', () => {
    it('handles an option with empty name', () => {
      const options = {
        help: {
          type: 'help',
          names: [''],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({});
      expect(parse(options, [''])).rejects.toThrow(`\n`);
    });

    it('save the help message when the option explicitly asks so', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          saveMessage: true,
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ help: undefined });
      expect(parse(options, ['-h'])).resolves.toEqual({
        help: expect.objectContaining({ message: '  -h\n' }),
      });
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
          useFilter: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-F', '-S'])).rejects.toThrow(
        `  -f, --flag\n  -s, --single  <param>\n`,
      );
    });

    it('throw the help message of a subcommand with nested options and program name', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups', layout: { descr: { hidden: true } } }],
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['cmd'],
          options: {
            help: {
              type: 'help',
              names: ['-h'],
              sections: [{ type: 'usage' }],
            },
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', 'cm'])).rejects.toThrow('  cmd  ...\n');
      expect(parse(options, ['-h', 'cmd'], { progName: '' })).rejects.toThrow('[-h]\n');
      expect(parse(options, ['-h', 'cmd'], { progName: 'prog' })).rejects.toThrow(
        'prog cmd [-h]\n',
      );
    });

    it('throw the help message of a subcommand with nested options callback', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups', layout: { descr: { hidden: true } } }],
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['cmd'],
          options: async () =>
            ({
              flag: {
                type: 'flag',
                names: ['-f'],
              },
              help: {
                type: 'help',
                names: ['-h'],
                sections: [{ type: 'groups', layout: { descr: { hidden: true } } }],
                useFilter: true,
              },
            }) as const satisfies Options,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-h'])).rejects.toThrow('  -h\n');
      expect(parse(options, ['-h', 'cmd'])).rejects.toThrow('  -f\n  -h\n');
      expect(parse(options, ['-h', 'cmd', '-f'])).rejects.toThrow('  -f\n');
    });

    it('throw the help message of a subcommand with a dynamic module with no help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups', layout: { descr: { hidden: true } } }],
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: async () => (await import('../../data/no-help')).default,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-c'])).rejects.toThrow('  -c  ...\n');
    });

    it('throw the help message of a subcommand with a dynamic module with a help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: async () => (await import('../../data/with-help')).default,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-c'])).rejects.toThrow('  -f\n');
    });
  });
});
