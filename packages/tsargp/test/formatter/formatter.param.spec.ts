import { describe, expect, it } from 'bun:test';
import type { Options } from '../../lib/options';
import { format } from '../../lib/formatter';

describe('format', () => {
  it('handle a single-valued option with required inline parameter', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        inline: 'always',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s  =<param>  Requires inline parameters.\n`);
  });

  it('handle a single-valued option with disallowed inline parameter', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        inline: false,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s  <param>  Disallows inline parameters.\n`);
  });

  it('handle an array-valued option with required inline parameter', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        separator: ',',
        inline: 'always',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -a  [=<param>]  Values can be delimited with ','. Requires inline parameters.\n`,
    );
  });

  it('handle a function option with an optional parameter required to be inline', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
        paramCount: [0, 1],
        inline: 'always',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f  [=<param>]  Requires inline parameters.\n`);
  });

  it('handle a function option with a single parameter', () => {
    const options = {
      function: {
        type: 'function',
        names: ['-f'],
        paramCount: 1,
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
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f  [<param>...]  Accepts multiple parameters.\n`);
  });

  it('handle a single-valued option with a parameter name', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        paramName: 'my_param',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s  <my_param>\n`);
  });

  it('handle a single-valued option with an empty parameter name', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        paramName: '',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s  <param>\n`);
  });

  it('handle a single-valued option with a parameter name with angle brackets', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        paramName: '<token>=<value>',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s  <token>=<value>\n`);
  });

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

  it('handle an array-valued option with a boolean array example value', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        example: [true, false],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -a  [true false...]  Accepts multiple parameters.\n`);
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
});
