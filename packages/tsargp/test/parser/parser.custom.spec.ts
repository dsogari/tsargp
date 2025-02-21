import { describe, expect, it, jest } from 'bun:test';
import { type Options } from '../../lib/options';
import { ArgumentParser } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('ArgumentParser', () => {
  describe('parse', () => {
    it('handle a flag option with value from environment variable', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          sources: ['FLAG'],
          parse: jest.fn(() => true),
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      process.env['FLAG'] = '1';
      expect(parser.parse([])).resolves.toEqual({ flag: true });
      expect(options.flag.parse).toHaveBeenCalledWith(['1'], {
        values: { flag: true }, // should have been { flag: undefined } at the time of call
        index: NaN,
        name: 'FLAG',
        comp: false,
      });
      expect(options.flag.parse).toHaveBeenCalled();
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
      const parser = new ArgumentParser(options);
      expect(parser.parse(['1', '2'])).resolves.toEqual({ single: '2' });
      expect(options.single.parse).toHaveBeenCalledWith('1', {
        values: { single: '2' }, // should have been { single: undefined } at the time of call
        index: 0,
        name: 'preferred',
        comp: false,
      });
      expect(options.single.parse).toHaveBeenCalledWith('2', {
        values: { single: '2' }, // should have been { single: undefined } at the time of call
        index: 1,
        name: 'preferred',
        comp: false,
      });
      expect(options.single.parse).toHaveBeenCalledTimes(2);
    });

    it('handle an array-valued option with a parse callback', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          parse(param) {
            return param === this.type; // test `this`
          },
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      expect(parser.parse(['-a', 'abc'])).resolves.toEqual({ array: [false] });
      expect(parser.parse(['-a', 'array'])).resolves.toEqual({ array: [true] });
    });

    it('handle a function option with value from named argument', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          parse: jest.fn((param) => param),
        },
      } as const satisfies Options;
      const parser = new ArgumentParser(options);
      expect(parser.parse(['-f', '1'])).resolves.toEqual({ function: ['1'] });
      expect(options.function.parse).toHaveBeenCalledWith(['1'], {
        values: { function: ['1'] }, // should have been { function: undefined } at the time of call
        index: 0,
        name: '-f',
        comp: false,
      });
      expect(options.function.parse).toHaveBeenCalledTimes(1);
    });
  });
});
