import { describe, expect, it, jest } from 'bun:test';
import type { Options, ParsingFlags } from '../../src/library';
import { parse } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  const flags: ParsingFlags = { clusterPrefix: '-' };

  it('not consider an argument with an inline parameter as a cluster', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        cluster: 's',
      },
    } as const satisfies Options;
    expect(parse(options, ['-s=0'], flags)).resolves.toEqual({ single: '0' });
  });

  describe('inline parameters are disallowed', () => {
    it('throw an error on parameter marker supplied with inline parameter', () => {
      const options = {
        array: {
          type: 'array',
          preferredName: 'preferred',
          marker: '', // test empty marker
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['='])).rejects.toThrow(`Option does not accept inline parameters.`);
      expect(parse(options, ['=1'])).rejects.toThrow(`Option does not accept inline parameters.`);
      expect(options.array.parse).not.toHaveBeenCalled();
    });

    it('throw an error on positional marker supplied with inline parameter', () => {
      const options = {
        single: {
          type: 'single',
          preferredName: 'preferred',
          parse: jest.fn(),
        },
      } as const satisfies Options;
      const flags: ParsingFlags = { positionalMarker: '' }; // test empty marker
      expect(parse(options, ['='], flags)).rejects.toThrow(
        `Option does not accept inline parameters.`,
      );
      expect(parse(options, ['=1'], flags)).rejects.toThrow(
        `Option does not accept inline parameters.`,
      );
      expect(options.single.parse).not.toHaveBeenCalled();
    });

    it('throw an error on flag option supplied with inline parameter', () => {
      const options = {
        flag: {
          type: 'flag',
          names: [''], // test empty name
          cluster: 'f',
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['='])).rejects.toThrow(`Option does not accept inline parameters.`);
      expect(parse(options, ['=1'])).rejects.toThrow(`Option does not accept inline parameters.`);
      expect(parse(options, ['-f1'], flags)).rejects.toThrow(
        `Option does not accept inline parameters.`,
      );
      expect(options.flag.parse).not.toHaveBeenCalled();
    });

    it('throw an error on single-valued option supplied with inline parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          cluster: 's',
          inline: false,
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-s='])).rejects.toThrow(
        `Option -s does not accept inline parameters.`,
      );
      expect(parse(options, ['-s=1'])).rejects.toThrow(
        `Option -s does not accept inline parameters.`,
      );
      expect(parse(options, ['-s1'], flags)).rejects.toThrow(
        `Option -s does not accept inline parameters.`,
      );
      expect(options.single.parse).not.toHaveBeenCalled();
    });

    it('throw an error on function option supplied with inline parameter', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          cluster: 'f',
          paramCount: 0,
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f='])).rejects.toThrow(
        `Option -f does not accept inline parameters.`,
      );
      expect(parse(options, ['-f=1'])).rejects.toThrow(
        `Option -f does not accept inline parameters.`,
      );
      expect(parse(options, ['-f1'], flags)).rejects.toThrow(
        `Option -f does not accept inline parameters.`,
      );
      expect(options.function.parse).not.toHaveBeenCalled();
    });

    it('throw an error on command option supplied with inline parameter', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          cluster: 'c',
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-c='])).rejects.toThrow(
        `Option -c does not accept inline parameters.`,
      );
      expect(parse(options, ['-c=1'])).rejects.toThrow(
        `Option -c does not accept inline parameters.`,
      );
      expect(parse(options, ['-c1'], flags)).rejects.toThrow(
        `Option -c does not accept inline parameters.`,
      );
      expect(options.command.parse).not.toHaveBeenCalled();
    });

    it('accept a positional argument', () => {
      const options = {
        single: {
          type: 'single',
          inline: false,
          positional: true,
        },
      } as const satisfies Options;
      expect(parse(options, ['1'])).resolves.toEqual({ single: '1' });
    });

    it('disallow inline parameters for specific option names', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          inline: { '-s': false },
        },
      } as const satisfies Options;
      expect(parse(options, ['-s='])).rejects.toThrow(
        `Option -s does not accept inline parameters.`,
      );
      expect(parse(options, ['--single='])).resolves.toEqual({ single: '' });
    });
  });

  describe('inline parameters are required', () => {
    it('accept an array-valued option with no parameters', () => {
      const options = {
        array: {
          type: 'array',
          names: ['--array'],
          cluster: 'a',
          inline: 'always',
        },
      } as const satisfies Options;
      expect(parse(options, ['--array'])).resolves.toEqual({ array: [] });
      expect(parse(options, ['-a'], flags)).resolves.toEqual({ array: [] });
    });

    it('throw an error on array-valued option with missing inline parameter', () => {
      const options = {
        array: {
          type: 'array',
          names: ['--array'],
          cluster: 'a',
          inline: 'always',
        },
      } as const satisfies Options;
      expect(parse(options, ['--array', '1'])).rejects.toThrow(
        `Option --array requires an inline parameter.`,
      );
      expect(parse(options, ['-a', '1'], flags)).rejects.toThrow(
        `Option --array requires an inline parameter.`,
      );
    });

    it('throw an error on single-valued option with missing inline parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['--single'],
          cluster: 's',
          inline: 'always',
        },
      } as const satisfies Options;
      expect(parse(options, ['--single', '1'])).rejects.toThrow(
        `Option --single requires an inline parameter.`,
      );
      expect(parse(options, ['-s', '1'], flags)).rejects.toThrow(
        `Option --single requires an inline parameter.`,
      );
    });

    it('throw an error on function option with missing inline parameter', () => {
      const options = {
        function: {
          type: 'function',
          names: ['--function'],
          cluster: 'f',
          inline: 'always',
          paramCount: [1, 2],
        },
      } as const satisfies Options;
      expect(parse(options, ['--function', '1'])).rejects.toThrow(
        `Option --function requires an inline parameter.`,
      );
      expect(parse(options, ['-f', '1'], flags)).rejects.toThrow(
        `Option --function requires an inline parameter.`,
      );
    });

    it('require inline parameters for specific option names', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          inline: { '--single': 'always' },
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', '1'])).resolves.toEqual({ single: '1' });
      expect(parse(options, ['--single', '1'])).rejects.toThrow(
        `Option --single requires an inline parameter.`,
      );
    });
  });

  describe('inline parameters are allowed', () => {
    it('parse a single-valued option with inline parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          cluster: 's',
        },
      } as const satisfies Options;
      expect(parse(options, ['-s=1'])).resolves.toEqual({ single: '1' });
      expect(parse(options, ['-s1'], flags)).resolves.toEqual({ single: '1' });
      expect(parse(options, ['-s=1', '-s', '2'], flags)).resolves.toEqual({ single: '2' });
    });

    it('parse an array-valued option with inline parameter', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          cluster: 'a',
          separator: ',',
        },
      } as const satisfies Options;
      expect(parse(options, ['-a=1,2'])).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['-a1,2'], flags)).resolves.toEqual({ array: ['1', '2'] });
      expect(parse(options, ['-a=1', '-a', '2'], flags)).resolves.toEqual({ array: ['2'] });
    });
  });
});
