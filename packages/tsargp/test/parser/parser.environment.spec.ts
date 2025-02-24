import { describe, expect, it, jest } from 'bun:test';
import { type Options } from '../../lib/options';
import { parse } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  it('handle an array-valued option with local file', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        sources: ['ARRAY', new URL(`file://${import.meta.dirname}/../data/test-read-file.txt`)],
        separator: '\n',
        parse: jest.fn((param) => param),
      },
    } as const satisfies Options;
    delete process.env['ARRAY'];
    expect(parse(options, [])).resolves.toEqual({ array: ['test', 'read', 'file'] });
    expect(options.array.parse).toHaveBeenCalledWith('test', {
      // should have been { array: undefined } at the time of call
      values: { array: ['test', 'read', 'file'] },
      index: NaN,
      name: expect.stringMatching(/data\/test-read-file.txt$/),
      comp: false,
    });
    options.array.parse.mockClear();
    process.env['ARRAY'] = '1';
    expect(parse(options, [])).resolves.toEqual({ array: ['1'] });
    expect(options.array.parse).toHaveBeenCalledWith('1', {
      // should have been { array: undefined } at the time of call
      values: { array: ['1'] },
      index: NaN,
      name: 'ARRAY',
      comp: false,
    });
  });

  describe('an environment variable is specified', () => {
    it('handle a flag option', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          sources: ['FLAG1'],
          requires: 'flag2',
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          sources: ['FLAG2'],
        },
      } as const satisfies Options;
      delete process.env['FLAG2'];
      process.env['FLAG1'] = '';
      expect(parse(options, [])).rejects.toThrow(`Option -f1 requires -f2.`);
      process.env['FLAG2'] = '';
      expect(parse(options, [])).resolves.toEqual({ flag1: true, flag2: true });
    });

    it('handle a single-valued option', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          sources: ['SINGLE'],
          requires: 'flag',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          sources: ['FLAG'],
        },
      } as const satisfies Options;
      delete process.env['FLAG'];
      process.env['SINGLE'] = '1';
      expect(parse(options, [])).rejects.toThrow(`Option -s requires -f.`);
      process.env['FLAG'] = '';
      expect(parse(options, [])).resolves.toEqual({ single: '1', flag: true });
      process.env['SINGLE'] = '';
      expect(parse(options, [])).resolves.toEqual({ single: '', flag: true });
    });

    it('handle an array-valued option', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          sources: ['ARRAY'],
          separator: ',',
          requires: 'flag',
        },
        flag: {
          type: 'flag',
          names: ['-f'],
          sources: ['FLAG'],
        },
      } as const satisfies Options;
      delete process.env['FLAG'];
      process.env['ARRAY'] = 'one,two';
      expect(parse(options, [])).rejects.toThrow(`Option -a requires -f.`);
      process.env['FLAG'] = '';
      expect(parse(options, [])).resolves.toEqual({ array: ['one', 'two'], flag: true });
      process.env['ARRAY'] = '';
      expect(parse(options, [])).resolves.toEqual({ array: [''], flag: true });
    });

    it('handle a function option and ignore its parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f1'],
          sources: ['FUNCTION'],
          requires: 'flag',
          paramCount: 2,
          parse: (param) => param,
        },
        flag: {
          type: 'flag',
          names: ['-f2'],
          sources: ['FLAG'],
        },
      } as const satisfies Options;
      delete process.env['FLAG'];
      process.env['FUNCTION'] = '1';
      expect(parse(options, [])).rejects.toThrow(`Option -f1 requires -f2.`);
      process.env['FLAG'] = '';
      expect(parse(options, [])).resolves.toEqual({ function: ['1'], flag: true });
      process.env['FUNCTION'] = '';
      expect(parse(options, [])).resolves.toEqual({ function: [''], flag: true });
    });
  });

  it('throw an error on option absent despite being required if another is specified', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f1'],
        sources: ['FLAG1'],
        requiredIf: 'flag2',
      },
      flag2: {
        type: 'flag',
        names: ['-f2'],
        sources: ['FLAG2'],
      },
    } as const satisfies Options;
    delete process.env['FLAG1'];
    process.env['FLAG2'] = '1';
    expect(parse(options, [])).rejects.toThrow(`Option -f1 is required if -f2.`);
  });

  it('throw an error on environment variable that fails a regex constraint', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        sources: ['SINGLE'],
        regex: /\d+/,
      },
    } as const satisfies Options;
    process.env['SINGLE'] = 'abc';
    expect(parse(options, [])).rejects.toThrow(
      `Invalid parameter to SINGLE: 'abc'. Value must match the regex /\\d+/.`,
    );
  });

  it('throw an error on environment variable that fails a choice constraint', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        sources: ['SINGLE'],
        choices: ['1'],
      },
    } as const satisfies Options;
    process.env['SINGLE'] = 'abc';
    expect(parse(options, [])).rejects.toThrow(
      `Invalid parameter to SINGLE: 'abc'. Value must be one of: '1'.`,
    );
  });

  it('throw an error on environment variable that fails a limit constraint', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        sources: ['ARRAY'],
        separator: ',',
        limit: 1,
      },
    } as const satisfies Options;
    process.env['ARRAY'] = 'abc,def';
    expect(parse(options, [])).rejects.toThrow(
      `Option ARRAY has too many values: 2. Should have at most 1.`,
    );
  });
});
