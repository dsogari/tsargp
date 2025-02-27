import { describe, expect, it, jest } from 'bun:test';
import { type Options, allOf, oneOf, notOf } from '../../lib/options';
import { parse } from '../../lib/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  it('throw an error when a required option with no name is not specified', () => {
    const options = {
      single: {
        type: 'single',
        required: true,
        positional: true,
      },
    } as const satisfies Options;
    expect(parse(options, [])).rejects.toThrow(`Option is required.`);
  });

  it('accept a forward requirement with allOf with zero items', () => {
    const options = {
      requires: {
        type: 'flag',
        names: ['-f'],
        requires: allOf(),
      },
    } as const satisfies Options;
    expect(parse(options, ['-f'])).resolves.toEqual({ requires: true });
  });

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

  it('evaluate the required value of an option that has a default value', () => {
    const options = {
      flag1: {
        type: 'flag',
        names: ['-f1'],
        requires: { flag2: true },
      },
      flag2: {
        type: 'flag',
        names: ['-f2'],
        default: () => true,
      },
    } as const satisfies Options;
    expect(parse(options, ['-f1'])).resolves.toEqual({ flag1: true, flag2: true });
  });

  it('evaluate the required value of an option that has a parsing callback', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        requires: { single: '1' },
      },
      single: {
        type: 'single',
        names: ['-s'],
        parse: (param) => param,
      },
    } as const satisfies Options;
    expect(parse(options, ['-f', '-s', '0'])).rejects.toThrow(`Option -f requires -s == '1'.`);
    expect(parse(options, ['-f', '-s', '1'])).resolves.toEqual({ flag: true, single: '1' });
  });

  describe('an option is required to be present', () => {
    it('throw an error on option absent, using an option key', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requires: 'flag2',
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1'])).rejects.toThrow(`Option -f1 requires -f2.`);
    });

    it('throw an error on option absent, using a required undefined value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requires: { flag2: undefined },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1'])).rejects.toThrow(`Option -f1 requires -f2.`);
    });

    it('throw an error on option absent, using a negated null value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requires: notOf({ flag2: null }),
        },
        flag2: {
          type: 'function',
          names: ['-f2'],
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1'])).rejects.toThrow(`Option -f1 requires -f2.`);
    });
  });

  describe('an option is required to be absent', () => {
    it('throw an error on option present, using a negated option key', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requires: notOf('flag2'),
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          break: true, // test early requirements checking
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1', '-f2'])).rejects.toThrow(`Option -f1 requires no -f2.`);
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });

    it('throw an error on option present, using a required null value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requires: { flag2: null },
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          break: true, // test early requirements checking
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1', '-f2'])).rejects.toThrow(`Option -f1 requires no -f2.`);
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });

    it('throw an error on option present, using a negated undefined value', () => {
      const options = {
        flag1: {
          type: 'flag',
          names: ['-f1'],
          requires: notOf({ flag2: undefined }),
        },
        flag2: {
          type: 'flag',
          names: ['-f2'],
          break: true, // test early requirements checking
          parse: jest.fn(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f1', '-f2'])).rejects.toThrow(`Option -f1 requires no -f2.`);
      expect(options.flag2.parse).not.toHaveBeenCalled();
    });
  });

  describe('a forward requirement is specified', () => {
    it('throw an error on oneOf with zero items', () => {
      const options = {
        requires: {
          type: 'flag',
          names: ['-f'],
          requires: oneOf(),
        },
      } as const satisfies Options;
      expect(parse(options, ['-f'])).rejects.toThrow(`Option -f requires.`);
    });

    it('throw an error on requirement not satisfied with notOf', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: notOf({ single: '1' }),
        },
        single: {
          type: 'single',
          positional: true,
          preferredName: 'preferred',
        },
      } as const satisfies Options;
      expect(parse(options, ['-f', '0'])).resolves.toMatchObject({});
      expect(parse(options, ['0', '-f'])).resolves.toMatchObject({});
      expect(parse(options, ['-f', '1'])).rejects.toThrow(`Option -f requires preferred != '1'.`);
      expect(parse(options, ['1', '-f'])).rejects.toThrow(`Option -f requires preferred != '1'.`);
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
          requires: allOf('flag1', 'flag2'),
        },
      } as const satisfies Options;
      expect(parse(options, ['1'])).rejects.toThrow(`Option preferred requires -f1.`);
      expect(parse(options, ['-f1', '1'])).rejects.toThrow(`Option preferred requires -f2.`);
      expect(parse(options, ['-f2', '1'])).rejects.toThrow(`Option preferred requires -f1.`);
      expect(parse(options, ['-f1', '-f2', '1'])).resolves.toMatchObject({});
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
          requires: oneOf('flag1', 'flag2'),
        },
      } as const satisfies Options;
      expect(parse(options, ['1'])).rejects.toThrow(`Option preferred requires (-f1 or -f2).`);
      expect(parse(options, ['-f1', '1'])).resolves.toMatchObject({});
      expect(parse(options, ['-f2', '1'])).resolves.toMatchObject({});
      expect(parse(options, ['-f1', '-f2', '1'])).resolves.toMatchObject({});
    });

    it('throw an error on requirement not satisfied with required arbitrary value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: {
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
      expect(parse(options, ['-f'])).rejects.toThrow(`Option -f requires -s.`);
      expect(parse(options, ['-f', '-s', '{"a": 1, "b": [1]}'])).rejects.toThrow(
        `Option -f requires -s == {a: 1, b: [2]}.`,
      );
      expect(parse(options, ['-f', '-s', '{"a": 1, "b": [2]}'])).rejects.toThrow(
        `Option -f requires -a.`,
      );
      expect(
        parse(options, ['-f', '-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "d"}']),
      ).rejects.toThrow(`Option -f requires -a == ['a', 2, {b: 'c'}].`);
      expect(
        parse(options, ['-f', '-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "c"}']),
      ).resolves.toMatchObject({});
    });

    it('throw an error on requirement not satisfied with negated arbitrary value', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requires: notOf({
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
      expect(parse(options, ['-f'])).resolves.toMatchObject({});
      expect(parse(options, ['-f', '-s', '{"a": 1, "b": [1]}'])).resolves.toMatchObject({});
      expect(parse(options, ['-f', '-s', '{"a": 1, "b": [2]}'])).resolves.toMatchObject({});
      expect(
        parse(options, ['-f', '-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "d"}']),
      ).resolves.toMatchObject({});
      expect(
        parse(options, ['-f', '-s', '{"a": 1, "b": [2]}', '-a', '"a"', '2', '{"b": "c"}']),
      ).rejects.toThrow(`Option -f requires (-s != {a: 1, b: [2]} or -a != ['a', 2, {b: 'c'}]).`);
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
          async requires(values) {
            return !!this.positional && values['flag1'] === values['flag2']; // test access to `this`
          },
        },
      } as const satisfies Options;
      options.boolean.requires.toString = () => 'fcn';
      expect(parse(options, ['1'])).resolves.toMatchObject({});
      expect(parse(options, ['-f1', '1'])).rejects.toThrow(`Option preferred requires <fcn>.`);
      expect(parse(options, ['-f2', '1'])).rejects.toThrow(`Option preferred requires <fcn>.`);
      expect(parse(options, ['-f1', '-f2', '1'])).resolves.toMatchObject({});
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
          requires: notOf((values) => values['flag1'] === values['flag2']),
        },
      } as const satisfies Options;
      options.boolean.requires.item.toString = () => 'fcn';
      expect(parse(options, ['1'])).rejects.toThrow(`Option preferred requires not <fcn>.`);
      expect(parse(options, ['-f1', '1'])).resolves.toMatchObject({});
      expect(parse(options, ['-f2', '1'])).resolves.toMatchObject({});
      expect(parse(options, ['-f1', '-f2', '1'])).rejects.toThrow(
        `Option preferred requires not <fcn>.`,
      );
    });
  });

  describe('an option is required if another is present', () => {
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
          requiredIf: notOf({ flag2: null }),
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
          requiredIf: notOf('flag2'),
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
          requiredIf: notOf({ flag2: undefined }),
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

    it('throw an error on requirement not satisfied with notOf', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
          requiredIf: notOf({ single: '1' }),
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
          requiredIf: notOf({
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
          requiredIf: notOf((values) => values['flag1'] === values['flag2']),
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
