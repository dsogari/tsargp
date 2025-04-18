import { describe, expect, it, jest } from 'bun:test';
import type { Options } from '../../src/library';
import { parse, allOf, oneOf, not } from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  it('accept a conditional requirement with oneOf with zero items', () => {
    const options = {
      requires: {
        type: 'flag',
        names: ['-f'],
        requiredIf: oneOf(),
      },
    } as const satisfies Options;
    expect(parse(options, [])).resolves.toEqual({ requires: undefined });
  });

  describe('an option is required if another is present', () => {
    it('throw an error on option present, but with the wrong value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: allOf('array', not({ array: [] })),
        },
        array: {
          type: 'array',
          names: ['-a'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-a'])).resolves.toEqual({ flag: undefined, array: [] });
      expect(parse(options, ['-f', '-a', '1'])).resolves.toEqual({ flag: true, array: ['1'] });
      expect(parse(options, ['-a', '1'])).rejects.toThrow(
        `Option -f is required if (-a and -a != []).`,
      );
    });

    it('throw an error on option absent, using an option key', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requiredIf: 'flag2',
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          break: true, // test early requirements checking
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f2'])).rejects.toThrow(`Option -f1 is required if -f2.`);
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });

    it('throw an error on option absent, using a required undefined value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requiredIf: { flag2: undefined },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          break: true, // test early requirements checking
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f2'])).rejects.toThrow(`Option -f1 is required if -f2.`);
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });

    it('throw an error on option absent, using a negated null value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requiredIf: not({ flag2: null }),
        },
        flag2: {
          type: 'function',
          names: ['-f2'],
          break: true, // test early requirements checking
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f2'])).rejects.toThrow(`Option -f1 is required if -f2.`);
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });
  });

  describe('an option is required if another is absent', () => {
    it('throw an error on option present, using a negated option key', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requiredIf: not('flag2'),
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).rejects.toThrow(`Option -f1 is required if no -f2.`);
    });

    it('throw an error on option present, using a required null value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requiredIf: { flag2: null },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).rejects.toThrow(`Option -f1 is required if no -f2.`);
    });

    it('throw an error on option present, using a negated undefined value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requiredIf: not({ flag2: undefined }),
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).rejects.toThrow(`Option -f1 is required if no -f2.`);
    });
  });

  describe('a conditional requirement is specified', () => {
    it('throw an error on allOf with zero items', () => {
      const options = {
        requires: {
          type: 'flag',
          names: ['-f'],
          requiredIf: allOf(),
        },
      } as const satisfies Options;
      expect(parse(options, [])).rejects.toThrow(`Option -f is required if.`);
    });

    it('throw an error on requirement not satisfied with not', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: not({ single: '1' }),
        },
        single: {
          type: 'single',
          positional: true,
          preferredName: 'preferred',
        },
      } as const satisfies Options;
      expect(parse(options, [])).rejects.toThrow(`Option -f is required if no preferred.`);
      expect(parse(options, ['0'])).rejects.toThrow(`Option -f is required if preferred != '1'.`);
      expect(parse(options, ['1'])).resolves.toMatchObject({});
    });

    it('throw an error on requirement not satisfied with allOf', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        single: {
          type: 'single',
          positional: true,
          preferredName: 'preferred',
          requiredIf: allOf('flag1', 'flag2'),
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toMatchObject({});
      expect(parse(options, ['-f1'])).resolves.toMatchObject({});
      expect(parse(options, ['-f2'])).resolves.toMatchObject({});
      expect(parse(options, ['-f1', '-f2'])).rejects.toThrow(
        `Option preferred is required if (-f1 and -f2).`,
      );
    });

    it('throw an error on requirement not satisfied with oneOf', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        single: {
          type: 'single',
          positional: true,
          preferredName: 'preferred',
          requiredIf: oneOf('flag1', 'flag2'),
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toMatchObject({});
      expect(parse(options, ['-f1'])).rejects.toThrow(`Option preferred is required if -f1.`);
      expect(parse(options, ['-f2'])).rejects.toThrow(`Option preferred is required if -f2.`);
      expect(parse(options, ['-f1', '-f2'])).rejects.toThrow(
        `Option preferred is required if -f1.`,
      );
    });

    it('throw an error on requirement not satisfied with required arbitrary value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: {
            single: { a: 1, b: [2] },
            array: ['a', 2, { b: 'c' }],
          },
        },
        single: {
          type: 'single',
          names: ['-s'],
          parse: (param) => JSON.parse(param),
        },
        array: {
          type: 'array',
          names: ['-a'],
          parse: (param) => JSON.parse(param),
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toMatchObject({});
      expect(parse(options, ['-s', '{"a": 1, "b": [1]}'])).resolves.toMatchObject({});
      expect(parse(options, ['-s', '{"a": 1, "b": [2]}'])).resolves.toMatchObject({});
      expect(
        parse(options, ['-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "d"}']),
      ).resolves.toMatchObject({});
      expect(
        parse(options, ['-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "c"}']),
      ).rejects.toThrow(
        `Option -f is required if (-s == {a: 1, b: [2]} and -a == ['a', 2, {b: 'c'}]).`,
      );
    });

    it('throw an error on requirement not satisfied with negated arbitrary value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: not({
            single: { a: 1, b: [2] },
            array: ['a', 2, { b: 'c' }],
          }),
        },
        single: {
          type: 'single',
          names: ['-s'],
          parse: (param) => JSON.parse(param),
        },
        array: {
          type: 'array',
          names: ['-a'],
          parse: (param) => JSON.parse(param),
        },
      } as const satisfies Options;
      expect(parse(options, [])).rejects.toThrow(`Option -f is required if no -s.`);
      expect(parse(options, ['-s', '{"a": 1, "b": [1]}'])).rejects.toThrow(
        `Option -f is required if -s != {a: 1, b: [2]}.`,
      );
      expect(parse(options, ['-s', '{"a": 1, "b": [2]}'])).rejects.toThrow(
        `Option -f is required if no -a.`,
      );
      expect(
        parse(options, ['-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "d"}']),
      ).rejects.toThrow(`Option -f is required if -a != ['a', 2, {b: 'c'}].`);
      expect(
        parse(options, ['-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "c"}']),
      ).resolves.toMatchObject({});
    });

    it('throw an error on requirement not satisfied with an asynchronous callback', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        boolean: {
          type: 'single',
          positional: true,
          preferredName: 'preferred',
          async requiredIf(values) {
            return !!this.positional && values['flag1'] === values['flag2']; // test access to `this`
          },
        },
      } as const satisfies Options;
      options.boolean.requiredIf.toString = () => 'fcn';
      expect(parse(options, [])).rejects.toThrow(`Option preferred is required if <fcn>.`);
      expect(parse(options, ['-f1'])).resolves.toMatchObject({});
      expect(parse(options, ['-f2'])).resolves.toMatchObject({});
      expect(parse(options, ['-f1', '-f2'])).rejects.toThrow(
        `Option preferred is required if <fcn>.`,
      );
    });

    it('throw an error on requirement not satisfied with a negated callback', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
        boolean: {
          type: 'single',
          positional: true,
          preferredName: 'preferred',
          requiredIf: not((values) => values['flag1'] === values['flag2']),
        },
      } as const satisfies Options;
      options.boolean.requiredIf.item.toString = () => 'fcn';
      expect(parse(options, [])).resolves.toMatchObject({});
      expect(parse(options, ['-f1'])).rejects.toThrow(`Option preferred is required if not <fcn>.`);
      expect(parse(options, ['-f2'])).rejects.toThrow(`Option preferred is required if not <fcn>.`);
      expect(parse(options, ['-f1', '-f2'])).resolves.toMatchObject({});
    });
  });
});
