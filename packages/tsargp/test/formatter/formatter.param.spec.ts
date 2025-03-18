import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { format } from '../../src/library';

describe('format', () => {
  describe('when inline parameters are required', () => {
    it('handle a single-valued option with inline parameter required for all names', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          inline: 'always',
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s  =<param>  Requires inline parameters.\n`);
    });

    it('handle a single-valued option with inline parameter required for the last name', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          inline: { '--single': 'always' },
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s, --single  =<param>\n`);
    });

    it('handle a single-valued option with inline parameter required for the first name', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s', '--single'],
          inline: { '-s': 'always' },
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s, --single  <param>\n`);
    });

    it('handle an array-valued option with inline parameter required for all names', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          inline: 'always',
          paramName: '<param>',
          // could have a delimiter or append=true
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -a  [=<param>]  Requires inline parameters.\n`);
    });

    it('handle an array-valued option with inline parameter required for the last name', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a', '--array'],
          inline: { '--array': 'always' },
          paramName: '<param>',
          // could have a delimiter or append=true
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a, --array  [=<param>]  Accepts multiple parameters.\n`,
      );
    });

    it('handle an array-valued option with inline parameter required for the first name', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a', '--array'],
          inline: { '-a': 'always' },
          paramName: '<param>',
          // could have a delimiter or append=true
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a, --array  [<param>...]  Accepts multiple parameters.\n`,
      );
    });

    it('handle a function option with an optional parameter required to be inline', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          inline: 'always',
          paramCount: [0, 1],
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  [=<param>]  Requires inline parameters.\n`);
    });
  });

  describe('when inline parameters are disallowed', () => {
    it('handle a single-valued option with disallowed inline parameter', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          inline: false,
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s  <param>  Disallows inline parameters.\n`);
    });

    it('handle an array-valued option with disallowed inline parameter', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          inline: false,
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a  [<param>...]  Accepts multiple parameters. Disallows inline parameters.\n`,
      );
    });
  });

  describe('when specifying a parameter count', () => {
    it('handle a function option with unknown parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: 0,
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  <param>...\n`);
    });

    it('handle a function option with a single parameter', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: 1,
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  <param>\n`);
    });

    it('handle a function option with an optional parameter', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: [0, 1],
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  [<param>]\n`);
    });

    it('handle a function option with an exact parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: 2,
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  <param>...  Accepts 2 parameters.\n`);
    });

    it('handle a function option with a range parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: [1, 2],
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -f  <param>...  Accepts between 1 and 2 parameters.\n`,
      );
    });

    it('handle a function option with a minimum parameter count (1)', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: [1, Infinity],
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  <param>...  Accepts multiple parameters.\n`);
    });

    it('handle a function option with a minimum parameter count (2)', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: [2, Infinity],
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  <param>...  Accepts at least 2 parameters.\n`);
    });

    it('handle a function option with a maximum parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: [0, 2],
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  [<param>...]  Accepts at most 2 parameters.\n`);
    });

    it('handle a function option with unlimited parameter count', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          paramCount: [0, Infinity],
          paramName: '<param>',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  [<param>...]  Accepts multiple parameters.\n`);
    });
  });

  describe('when specifying a parameter name', () => {
    it('handle a command option with a parameter name', () => {
      const options = {
        command: {
          type: 'command',
          names: ['-c'],
          paramName: '',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -c  ...\n`);
    });

    it('handle an option with a parameter name with spaces', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          paramName: 'my  param',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s  my param\n`);
    });

    it('handle a single-valued option with an empty parameter name', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          paramName: '',
          inline: 'always',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s  =  Requires inline parameters.\n`);
    });

    it('handle an array-valued option with an empty parameter name', () => {
      const options = {
        single: {
          type: 'array',
          names: ['-a'],
          paramName: '',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -a  [...]  Accepts multiple parameters.\n`);
    });
  });

  describe('when specifying example values', () => {
    it('handle a single-valued option with a boolean example value', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          example: true,
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s  true\n`);
    });

    it('handle a single-valued option with a string example value', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          example: '123',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s  '123'\n`);
    });

    it('handle a single-valued option with a number example value', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          example: 123,
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -s  123\n`);
    });

    it('handle an array-valued option with a number example value', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: 123,
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -a  [123...]  Accepts multiple parameters.\n`);
    });

    it('handle an array-valued option with a boolean array example value', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: [true, false],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a  [true false...]  Accepts multiple parameters.\n`,
      );
    });

    it('handle an array-valued option with a string array example value', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: ['one', 'two'],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a  ['one' 'two'...]  Accepts multiple parameters.\n`,
      );
    });

    it('handle an array-valued option with a number array example value', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: [1, 2],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -a  [1 2...]  Accepts multiple parameters.\n`);
    });

    it('handle an array-valued option with an example value required to be inline', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: [true, false],
          separator: ',',
          inline: 'always',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a  [='true,false']  Values can be delimited with ','. Requires inline parameters.\n`,
      );
    });

    it('handle an array-valued option with an example value delimited with a string', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: ['one', 'two'],
          separator: ',',
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a  ['one,two'...]  Accepts multiple parameters. Values can be delimited with ','.\n`,
      );
    });

    it('handle an array-valued option with an example value delimited with a regex', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: [1, 2],
          separator: /[,;]/s,
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -a  ['1[,;]2'...]  Accepts multiple parameters. Values can be delimited with /[,;]/s.\n`,
      );
    });

    it('handle an array-valued option with an example value with duplicates', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          example: [1, 1],
          unique: true, // keep this
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toMatch(
        '  -a  [1 1...]  Accepts multiple parameters. Duplicate values will be removed.\n',
      );
    });

    it('handle a function option with a parameter count and a boolean array example value', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          example: [true, false],
          paramCount: [1, Infinity],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  true false...  Accepts multiple parameters.\n`);
    });

    it('handle a function option with a string array example value', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          example: ['one', 'two'],
          paramCount: [1, Infinity],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(
        `  -f  'one' 'two'...  Accepts multiple parameters.\n`,
      );
    });

    it('handle a function option with a number array example value', () => {
      const options = {
        function: {
          type: 'function',
          names: ['-f'],
          example: [1, 2],
          paramCount: [1, Infinity],
        },
      } as const satisfies Options;
      expect(format(options).wrap()).toEqual(`  -f  1 2...  Accepts multiple parameters.\n`);
    });
  });
});
