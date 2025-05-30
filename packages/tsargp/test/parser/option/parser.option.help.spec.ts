import { describe, expect, it } from 'bun:test';
import type { Options } from '../../../src/library';
import { format, parse } from '../../../src/library';

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
      expect(parse(options, [], { format })).resolves.toEqual({});
      expect(parse(options, [''], { format })).rejects.toThrow(`\n`);
    });

    it('save the help message when the option explicitly asks so', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          saveMessage: true,
        },
      } as const satisfies Options;
      expect(parse(options, [], { format })).resolves.toEqual({ help: undefined });
      expect(parse(options, ['-h'], { format })).resolves.toEqual({
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
      expect(parse(options, ['-h', '-F', '-S'], { format })).rejects.toThrow(
        `  -f, --flag\n  -s, --single\n`,
      );
    });

    it('throw the help message of a subcommand with nested options object', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups', layout: { descr: null } }],
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
            single: {
              type: 'single',
              cluster: 's', // test clusterPrefix
              stdin: true, // test stdinSymbol
            },
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', 'cm'], { format })).rejects.toThrow(/^ {2}cmd\n$/);
      expect(parse(options, ['-h', 'cmd'], { programName: '', format })).rejects.toThrow(
        /^\[-h\]\n$/,
      );
      expect(parse(options, ['-h', 'cmd'], { programName: 'prog', format })).rejects.toThrow(
        /^prog cmd \[-h\]\n$/,
      );
      expect(
        parse(options, ['-h', 'cmd'], { programName: '', clusterPrefix: '-', format }),
      ).rejects.toThrow(/^\[-h\] \[-s\]\n$/);
      expect(
        parse(options, ['-h', 'cmd'], { programName: '', stdinSymbol: '-', format }),
      ).rejects.toThrow(/^\[-h\] \[-\]\n$/);
    });

    it('throw the help message of a subcommand with nested options callback', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups', layout: { descr: null } }],
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
                sections: [{ type: 'groups', layout: { descr: null } }],
                useFilter: true,
              },
            }) as const satisfies Options,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-h'], { format })).rejects.toThrow('  -h\n');
      expect(parse(options, ['-h', 'cmd'], { format })).rejects.toThrow('  -f\n  -h\n');
      expect(parse(options, ['-h', 'cmd', '-f'], { format })).rejects.toThrow('  -f\n');
    });

    it('throw the help message of a subcommand with a dynamic module with no help option', () => {
      const options = {
        help: {
          type: 'help',
          names: ['-h'],
          sections: [{ type: 'groups', layout: { descr: null } }],
          useCommand: true,
          useFilter: true,
        },
        command: {
          type: 'command',
          names: ['-c'],
          options: async () => (await import('../../data/no-help')).default,
        },
      } as const satisfies Options;
      expect(parse(options, ['-h', '-c'], { format })).rejects.toThrow('  -c\n');
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
      expect(parse(options, ['-h', '-c'], { format })).rejects.toThrow('  -f\n');
    });
  });
});
