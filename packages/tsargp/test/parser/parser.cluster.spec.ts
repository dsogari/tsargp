import { describe, expect, it } from 'bun:test';
import { type Options } from '../../lib/options';
import { type ParsingFlags, ArgumentParser } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('ArgumentParser', () => {
  describe('parse', () => {
    const flags: ParsingFlags = { clusterPrefix: '' };

    it('throw an error on unrecognized cluster argument', () => {
      const parser = new ArgumentParser({});
      expect(parser.parse(['-'], flags)).rejects.toThrow(`Unknown option -.`);
      expect(parser.parse(['-x'], flags)).rejects.toThrow(`Unknown option -x.`);
    });

    it('parse a cluster argument with empty cluster prefix', () => {
      const options = {
        flag: {
          type: 'flag',
          names: [''], // test empty name
          cluster: 'f',
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      expect(parser.parse(['f'], flags)).resolves.toEqual({ flag: true });
    });

    describe('a cluster argument is specified', () => {
      it('parse a flag option', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            cluster: 'f',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['f'], flags)).resolves.toEqual({ flag: true });
        expect(parser.parse(['ff'], flags)).resolves.toEqual({ flag: true });
      });

      it('parse a single-valued option', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            cluster: 's',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['s', '1'], flags)).resolves.toEqual({ single: '1' });
        expect(parser.parse(['ss', '1', '2'], flags)).resolves.toEqual({ single: '2' });
      });

      it('parse an array-valued option', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            cluster: 'a',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['a', '1', '2'], flags)).resolves.toEqual({ array: ['1', '2'] });
      });

      it('parse a variadic function option', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            cluster: 'f',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['f'], flags)).resolves.toEqual({ function: null });
      });

      it('parse a polyadic function option', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            cluster: 'f',
            paramCount: 2,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['f', '1', '2'], flags)).resolves.toEqual({ function: null });
        expect(parser.parse(['ff', '1', '2', '3', '4'], flags)).resolves.toEqual({
          function: null,
        });
      });

      it('parse a command option', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            cluster: 'c',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['c'], flags)).resolves.toEqual({ command: {} });
      });
    });

    describe('a variadic option is specified in middle of a cluster argument', () => {
      it('throw an error on array-valued option', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            cluster: 'a',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['aa'], flags)).rejects.toThrow(
          `Option letter 'a' must be the last in a cluster.`,
        );
      });

      it('throw an error on variadic function option', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            cluster: 'f',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['ff'], flags)).rejects.toThrow(
          `Option letter 'f' must be the last in a cluster.`,
        );
      });

      it('throw an error on command option', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            cluster: 'c',
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['cc'], flags)).rejects.toThrow(
          `Option letter 'c' must be the last in a cluster.`,
        );
      });
    });

    it('parse a nameless positional option in a cluster argument', () => {
      const options = {
        single1: {
          type: 'single',
          cluster: 's',
          positional: true,
        },
        single2: {
          type: 'single',
          names: ['-s'],
          cluster: 'S',
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      expect(parser.parse(['s1'], flags)).resolves.toEqual({
        single1: '1',
        single2: undefined,
      });
      expect(parser.parse(['s', '1'], flags)).resolves.toEqual({
        single1: '1',
        single2: undefined,
      });
      expect(parser.parse(['sS', '1', '2'], flags)).resolves.toEqual({
        single1: '1',
        single2: '2',
      });
      expect(parser.parse(['Ss', '1', '2'], flags)).resolves.toEqual({
        single1: '2',
        single2: '1',
      });
    });

    it('parse options in a cluster argument for a subcommand', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: {
            flag: {
              type: 'flag',
              names: ['-f'],
              cluster: 'f',
            },
            single: {
              type: 'single',
              names: ['-s'],
              cluster: 's',
            },
            array: {
              type: 'array',
              names: ['-a'],
              cluster: 'a',
            },
          },
          cluster: 'c',
          clusterPrefix: '',
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      expect(parser.parse(['c', 'fsa', '1', '2', '3'], flags)).resolves.toEqual({
        command: {
          flag: true,
          single: '1',
          array: ['2', '3'],
        },
      });
    });
  });
});
