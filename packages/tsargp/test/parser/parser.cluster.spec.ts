import { describe, expect, it } from 'bun:test';
import { type Options } from '../../src/library/options';
import { type ParsingFlags, parse } from '../../src/library/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  const flags: ParsingFlags = { clusterPrefix: '' };

  it('throw an error on unrecognized cluster argument', () => {
    expect(parse({}, ['-'], flags)).rejects.toThrow(`Unknown option -.`);
    expect(parse({}, ['-x'], flags)).rejects.toThrow(`Unknown option -x.`);
  });

  describe('an option prefix is specified', () => {
    const flags: ParsingFlags = { clusterPrefix: '-', optionPrefix: '-' };

    it('throw an error on unrecognized option name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          cluster: 's',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'], flags)).resolves.toEqual({ flag: true });
      expect(parse(options, ['-x'], flags)).rejects.toThrow(`Unknown option -x.`);
    });
  });

  describe('a cluster argument is specified', () => {
    it('parse a flag option with empty name', () => {
      const options = {
        flag: {
          type: 'flag',
          names: [''],
          cluster: 'fF ',
        },
      } as const satisfies Options;
      expect(parse(options, ['f'], flags)).resolves.toEqual({ flag: true });
      expect(parse(options, ['F'], flags)).resolves.toEqual({ flag: true });
      expect(parse(options, [' '], flags)).resolves.toEqual({ flag: true });
    });

    it('parse a flag option', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          cluster: 'fF ',
        },
      } as const satisfies Options;
      expect(parse(options, ['f'], flags)).resolves.toEqual({ flag: true });
      expect(parse(options, ['fF'], flags)).resolves.toEqual({ flag: true });
      expect(parse(options, ['f '], flags)).resolves.toEqual({ flag: true });
    });

    it('parse a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          cluster: 'sS ',
        },
      } as const satisfies Options;
      expect(parse(options, ['s', '1'], flags)).resolves.toEqual({ single: '1' });
      expect(parse(options, ['sS', '1', '2'], flags)).resolves.toEqual({ single: '2' });
      expect(parse(options, ['s ', '1', '2'], flags)).resolves.toEqual({ single: '2' });
    });

    it('parse an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          cluster: 'aA ',
        },
      } as const satisfies Options;
      expect(parse(options, ['a', '1', '2'], flags)).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['A', '1', '2'], flags)).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, [' ', '1', '2'], flags)).resolves.toEqual({ array: ['1', '2'] });
    });

    it('parse a variadic function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          cluster: 'fF ',
        },
      } as const satisfies Options;
      expect(parse(options, ['f'], flags)).resolves.toEqual({ function: [] });
      expect(parse(options, ['F', '1'], flags)).resolves.toEqual({ function: ['1'] });
      expect(parse(options, [' ', '1'], flags)).resolves.toEqual({ function: ['1'] });
    });

    it('parse a polyadic function option', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          cluster: 'fF ',
          paramCount: 2,
        },
      } as const satisfies Options;
      expect(parse(options, ['f', '1', '2'], flags)).resolves.toEqual({ function: ['1', '2'] });
      expect(parse(options, ['fF', '1', '2', '3', '4'], flags)).resolves.toEqual({
        function: ['3', '4'],
      });
      expect(parse(options, ['f ', '1', '2', '3', '4'], flags)).resolves.toEqual({
        function: ['3', '4'],
      });
    });

    it('parse a command option', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          cluster: 'cC ',
        },
      } as const satisfies Options;
      expect(parse(options, ['c'], flags)).resolves.toEqual({ command: {} });
      expect(parse(options, ['C'], flags)).resolves.toEqual({ command: {} });
      expect(parse(options, [' '], flags)).resolves.toEqual({ command: {} });
    });

    it('parse two options', () => {
      const options = {
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
      } as const satisfies Options;
      expect(parse(options, ['s', '1', 'f'], flags)).resolves.toEqual({ flag: true, single: '1' });
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
      expect(parse(options, ['aa'], flags)).rejects.toThrow(
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
      expect(parse(options, ['ff'], flags)).rejects.toThrow(
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
      expect(parse(options, ['cc'], flags)).rejects.toThrow(
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
    expect(parse(options, ['s1'], flags)).resolves.toEqual({ single1: '1', single2: undefined });
    expect(parse(options, ['s', '1'], flags)).resolves.toEqual({
      single1: '1',
      single2: undefined,
    });
    expect(parse(options, ['sS', '1', '2'], flags)).resolves.toEqual({
      single1: '1',
      single2: '2',
    });
    expect(parse(options, ['Ss', '1', '2'], flags)).resolves.toEqual({
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
    expect(parse(options, ['c', 'fsa', '1', '2', '3'], flags)).resolves.toEqual({
      command: {
        flag: true,
        single: '1',
        array: ['2', '3'],
      },
    });
  });
});
