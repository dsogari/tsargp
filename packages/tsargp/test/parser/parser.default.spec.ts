import { describe, expect, it, jest } from 'bun:test';
import { type Options, OptionValues } from '../../lib/options';
import { ArgumentParser } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('ArgumentParser', () => {
  describe('parse', () => {
    describe('a default value is specified', () => {
      it('set default values before calling the parse callback of an option that breaks the parsing loop', () => {
        const options = {
          flag1: {
            type: 'flag',
            names: ['-f1'],
            break: true,
            parse(_, { values }) {
              expect((values as OptionValues<typeof options>).flag2).toBeTruthy();
            },
          },
          flag2: {
            type: 'flag',
            names: ['-f2'],
            default: true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f1'])).resolves.toEqual({ flag1: undefined, flag2: true });
      });

      it('avoid setting default values before calling the parse callback of an option that does not break the parsing loop', () => {
        const options = {
          flag1: {
            type: 'function',
            names: ['-f1'],
            parse(_, { values }) {
              expect((values as OptionValues<typeof options>).flag2).toBeUndefined();
            },
          },
          flag2: {
            type: 'flag',
            names: ['-f2'],
            default: { a: 1 },
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse(['-f1'])).resolves.toEqual({
          flag1: undefined,
          flag2: { a: 1 },
        });
      });

      it('set default values before calling the parse callback of command option', async () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            parse(_, { values }) {
              expect((values as OptionValues<typeof options>).flag).toBeTruthy();
            },
          },
          flag: {
            type: 'flag',
            names: ['-f'],
            default: [1, 'a'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        try {
          await parser.parse(['-c']);
        } catch (err) {
          console.log(err);
        }
        expect(parser.parse(['-c'])).resolves.toEqual({ command: undefined, flag: [1, 'a'] });
      });
    });

    describe('a default callback is specified', () => {
      it('handle a flag option', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            default: () => false,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ flag: false });
      });

      it('handle a single-valued option', () => {
        const options = {
          single: {
            type: 'single',
            names: ['-s'],
            default: () => true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ single: true });
      });

      it('handle an array-valued option with a unique constraint', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            unique: true,
            default: () => ['1', '1'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ array: ['1'] });
      });

      it('throw an error on array-valued option with a limit constraint', () => {
        const options = {
          array: {
            type: 'array',
            names: ['-a'],
            limit: 1,
            default: () => ['1', '1'],
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).rejects.toThrow(
          `Option -a has too many values: 2. Should have at most 1.`,
        );
      });

      it('handle a function option', () => {
        const options = {
          function: {
            type: 'function',
            names: ['-f'],
            default: () => true,
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ function: true });
      });

      it('handle a command option', () => {
        const options = {
          command: {
            type: 'command',
            names: ['-c'],
            default: () => false,
            parse: jest.fn(),
          },
        } as const satisfies Options;
        const parser = new ArgumentParser(options);
        expect(parser.parse([])).resolves.toEqual({ command: false });
        expect(options.command.parse).not.toHaveBeenCalled();
      });
    });
  });
});
