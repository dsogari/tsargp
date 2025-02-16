import { describe, expect, it } from 'bun:test';
import { type Options, OptionRegistry, req } from '../../lib/options';
import { AnsiFormatter } from '../../lib/formatter';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('AnsiFormatter', () => {
  describe('format', () => {
    describe('a forward requirement is specified', () => {
      it('handle an option that requires the presence or absence of another', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            requires: 'single',
          },
          single: {
            type: 'single',
            names: ['-s'],
            requires: req.not('flag'),
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        const message = new AnsiFormatter(registry.options).format();
        expect(message.wrap()).toEqual(
          `  -f           Requires -s.\n  -s  <param>  Requires no -f.\n`,
        );
      });

      it('handle a requirement with specific values using expressions', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            requires: req.one(
              {
                single: undefined,
              },
              req.all(
                {
                  array: null,
                },
                req.not({
                  single: { a: 1, b: [2] },
                  array: [1, 'a', { a: false }],
                }),
              ),
            ),
          },
          single: {
            type: 'single',
            names: ['-s'],
            group: null,
          },
          array: {
            type: 'array',
            names: ['-a'],
            group: null,
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        const message = new AnsiFormatter(registry.options).format();
        expect(message.wrap()).toEqual(
          `  -f    Requires (-s or (no -a and (-s != {a: 1, b: [2]} or -a != [1, 'a', {a: false}]))).\n`,
        );
      });

      it('handle an option with a requirement callback', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            requires: () => true,
          },
          single: {
            type: 'single',
            names: ['-s'],
            requires: req.not(() => true),
          },
        } as const satisfies Options;
        options.flag.requires.toString = () => 'fcn';
        options.single.requires.item.toString = () => 'fcn';
        const registry = new OptionRegistry(options);
        const message = new AnsiFormatter(registry.options).format();
        expect(message.wrap()).toEqual(
          `  -f           Requires <fcn>.\n  -s  <param>  Requires not <fcn>.\n`,
        );
      });
    });

    describe('a conditional requirement is specified', () => {
      it('handle an option that is required if another is present or absent', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            requiredIf: 'single',
          },
          single: {
            type: 'single',
            names: ['-s'],
            requiredIf: req.not('flag'),
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        const message = new AnsiFormatter(registry.options).format();
        expect(message.wrap()).toEqual(
          `  -f           Required if -s.\n  -s  <param>  Required if no -f.\n`,
        );
      });

      it('handle a requirement with specific values using expressions', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            requiredIf: req.one(
              {
                single: undefined,
              },
              req.all(
                {
                  array: null,
                },
                req.not({
                  single: { a: 1, b: [2] },
                  array: [1, 'a', { a: false }],
                }),
              ),
            ),
          },
          single: {
            type: 'single',
            names: ['-s'],
            group: null,
          },
          array: {
            type: 'array',
            names: ['-a'],
            group: null,
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        const message = new AnsiFormatter(registry.options).format();
        expect(message.wrap()).toEqual(
          `  -f    Required if (-s or (no -a and (-s != {a: 1, b: [2]} or -a != [1, 'a', {a: false}]))).\n`,
        );
      });

      it('handle an option with a requirement callback', () => {
        const options = {
          flag: {
            type: 'flag',
            names: ['-f'],
            requiredIf: () => true,
          },
          single: {
            type: 'single',
            names: ['-s'],
            requiredIf: req.not(() => true),
          },
        } as const satisfies Options;
        options.flag.requiredIf.toString = () => 'fcn';
        options.single.requiredIf.item.toString = () => 'fcn';
        const registry = new OptionRegistry(options);
        const message = new AnsiFormatter(registry.options).format();
        expect(message.wrap()).toEqual(
          `  -f           Required if <fcn>.\n  -s  <param>  Required if not <fcn>.\n`,
        );
      });
    });
  });
});
