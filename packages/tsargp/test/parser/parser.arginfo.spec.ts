import { describe, expect, it, jest } from 'bun:test';
import type { OptionValues, Options } from '../../src/library';
import { parse } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('a parsing callback is specified', () => {
    it('replace the option value with the result of the parsing callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ flag: undefined });
      expect(options.flag.parse).not.toHaveBeenCalled();
      expect(parse(options, ['-f'])).resolves.toEqual({ flag: null });
      expect(options.flag.parse).toHaveBeenCalledWith(null, {
        // should have been { flag: undefined } at the time of call
        values: { flag: null },
        index: 0,
        position: NaN,
        name: '-f',
        comp: false,
      });
      options.flag.parse.mockClear();
      expect(parse(options, ['-f', '-f'])).resolves.toEqual({ flag: null });
      expect(options.flag.parse).toHaveBeenCalledWith(null, {
        // should have been { flag: undefined } at the time of call
        values: { flag: null },
        index: 0,
        position: NaN,
        name: '-f',
        comp: false,
      });
      expect(options.flag.parse).toHaveBeenCalledTimes(2);
    });

    it('expose parsed values to the parsing callback', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          parse(_, { values }) {
            expect((values as OptionValues<typeof options>).flag2).toBeTruthy();
          },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f2', '-f1'])).resolves.toEqual({ flag1: undefined, flag2: true });
    });

    it('break the parsing loop when the option explicitly asks so', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          parse: jest.fn(() => 'abc'),
          break: true,
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1', '-f2'])).resolves.toEqual({ flag1: 'abc', flag2: undefined });
      expect(options.flag1.parse).toHaveBeenCalledTimes(1);
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });

    it('handle a flag option with a parsing callback', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          sources: ['FLAG'],
          parse: jest.fn(() => true),
        },
      } as const satisfies Options;
      process.env['FLAG'] = '1';
      expect(parse(options, [])).resolves.toEqual({ flag: true });
      expect(options.flag.parse).toHaveBeenCalledWith(null, {
        // should have been { flag: undefined } at the time of call
        values: { flag: true },
        index: NaN,
        position: NaN,
        name: 'FLAG',
        comp: false,
      });
    });

    it('handle a single-valued option with value after positional marker', () => {
      const options = {
        single: {
          type: 'single',
          positional: '--',
          preferredName: 'preferred',
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, ['--', '1'])).resolves.toEqual({ single: '1' });
      expect(options.single.parse).toHaveBeenCalledWith('1', {
        // should have been { single: undefined } at the time of call
        values: { single: '1' },
        index: 0,
        position: NaN,
        name: '--',
        comp: false,
      });
      expect(options.single.parse).toHaveBeenCalledTimes(1);
    });

    it('handle a single-valued option with value from positional argument', () => {
      const options = {
        single: {
          type: 'single',
          positional: true,
          preferredName: 'preferred',
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, ['1', '2'])).resolves.toEqual({ single: '2' });
      expect(options.single.parse).toHaveBeenCalledWith('1', {
        // should have been { single: undefined } at the time of call
        values: { single: '2' },
        index: 0,
        position: 1,
        name: 'preferred',
        comp: false,
      });
      expect(options.single.parse).toHaveBeenCalledWith('2', {
        // should have been { single: undefined } at the time of call
        values: { single: '2' },
        index: 1,
        position: 2,
        name: 'preferred',
        comp: false,
      });
      expect(options.single.parse).toHaveBeenCalledTimes(2);
    });

    it('handle an array-valued option with value from positional argument', () => {
      const options = {
        array: {
          type: 'array',
          positional: true,
          preferredName: 'preferred',
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, ['1', '2'])).resolves.toEqual({ array: ['1', '2'] });
      expect(options.array.parse).toHaveBeenCalledWith('1', {
        // should have been { single: undefined } at the time of call
        values: { array: ['1', '2'] },
        index: 0,
        position: 1,
        name: 'preferred',
        comp: false,
      });
      expect(options.array.parse).toHaveBeenCalledWith('2', {
        // should have been { single: undefined } at the time of call
        values: { array: ['1', '2'] },
        index: 0, // index of the first argument in the sequence
        position: 1,
        name: 'preferred',
        comp: false,
      });
      expect(options.array.parse).toHaveBeenCalledTimes(2);
    });

    it('handle an array-valued option with a parsing callback', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          parse(param) {
            return param === this.type; // test access to `this`
          },
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', 'abc'])).resolves.toEqual({ array: [false] });
      expect(parse(options, ['-a', 'array'])).resolves.toEqual({ array: [true] });
    });

    it('handle a function option with value from named argument', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', '1'])).resolves.toEqual({ function: ['1'] });
      expect(options.function.parse).toHaveBeenCalledWith(['1'], {
        // should have been { function: undefined } at the time of call
        values: { function: ['1'] },
        index: 0,
        position: NaN,
        name: '-f',
        comp: false,
      });
    });

    it('handle a command option with nested options', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          options: {
            flag: {
              type: 'flag',
              names: ['-f'],
            },
          },
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      expect(parse(options, ['-c'])).resolves.toEqual({ command: { flag: undefined } });
      expect(options.command.parse).toHaveBeenCalledWith(
        { flag: undefined },
        {
          // should have been { command: undefined } at the time of call
          values: { command: { flag: undefined } },
          index: 0,
          position: NaN,
          name: '-c',
          comp: false,
        },
      );
      options.command.parse.mockClear();
      expect(parse(options, ['-c', '-f'])).resolves.toEqual({ command: { flag: true } });
      expect(options.command.parse).toHaveBeenCalledWith(
        { flag: true },
        {
          // should have been { command: undefined } at the time of call
          values: { command: { flag: true } },
          index: 0,
          position: NaN,
          name: '-c',
          comp: false,
        },
      );
    });
  });
});
