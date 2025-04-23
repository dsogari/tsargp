import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library';
import { AnsiString, format } from '../../src/library';

describe('format', () => {
  it('handle a flag option with an external reference', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        link: new URL('https://dsogari.github.io/tsargp/docs'),
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -f    Refer to https://dsogari.github.io/tsargp/docs for details.\n`,
    );
  });

  it('handle a flag option with a string synopsis', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: 'A flag option.',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    A flag option.\n`);
  });

  it('handle a flag option with a AnsiString synopsis', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        synopsis: new AnsiString().split('A flag option.'),
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    A flag option.\n`);
  });

  it('handle a flag option with a string deprecation notice', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        deprecated: 'reason',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    Deprecated for reason.\n`);
  });

  it('handle a flag option with a AnsiString deprecation notice', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        deprecated: new AnsiString().split('reason'),
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    Deprecated for reason.\n`);
  });

  it('handle a flag option with cluster letters when there is no cluster prefix', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        cluster: 'fF',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f\n`);
  });

  it('handle a flag option with cluster letters when there is a cluster prefix', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        cluster: 'fF',
      },
    } as const satisfies Options;
    expect(format(options, undefined, { clusterPrefix: '' }).wrap()).toEqual(
      `  -f    Can be clustered with f or F.\n`,
    );
  });

  it('handle a flag option that reads data from an environment variable', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        sources: ['VAR', new URL('file://path')],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -f    If not supplied on the command line, will be read from VAR or file://path/.\n`,
    );
  });

  it('handle a single-valued option that reads data from the standard input', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        stdin: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -s    If not supplied, will be read from the standard input.\n`,
    );
  });

  it('handle a unnamed single-valued option that reads data from the standard input', () => {
    const options = {
      single: {
        type: 'single',
        stdin: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`      Will be read from the standard input.\n`);
  });

  it('handle a single-valued option that does not accept positional arguments', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        positional: false,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s\n`);
  });

  it('handle a single-valued option that accepts positional arguments', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        positional: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s    Accepts positional arguments.\n`);
  });

  it('handle a unnamed positional option that reads data from the standard input', () => {
    const options = {
      single: {
        type: 'single',
        positional: true,
        stdin: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `      Accepts positional arguments. If not supplied, will be read from the standard input.\n`,
    );
  });

  it('handle a unnamed option with parameter marker that reads data from the standard input', () => {
    const options = {
      array: {
        type: 'array',
        marker: '--',
        stdin: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `      Accepts multiple parameters. If not supplied, will be read from the standard input.\n`,
    );
  });

  it('handle an array-valued option whose parameters can be delimited', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        separator: ',',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -a    Accepts multiple parameters. Values can be delimited with ','.\n`,
    );
  });

  it('handle an array-valued option that can be supplied multiple times', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        append: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -a    Accepts multiple parameters. Can be supplied multiple times.\n`,
    );
  });

  it('handle a help option that uses remaining arguments', () => {
    const options = {
      help: {
        type: 'help',
        names: ['-h'],
        useCommand: true,
        useFilter: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -h    ` +
        `Uses the next argument as the name of a subcommand. ` +
        `Uses the remaining arguments as option filter.\n`,
    );
  });

  it('handle a single-valued option with a regex constraint', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        regex: /\d+/s,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s    Values must match the regex /\\d+/s.\n`);
  });

  it('handle a single-valued option with a choices constraint', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        choices: ['one', 'two'],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s    Values must be one of {'one', 'two'}.\n`);
  });

  it('handle an array-valued option with a limit constraint', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        limit: 2,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -a    Accepts multiple parameters. Element count is limited to 2.\n`,
    );
  });

  it('handle an array-valued option with a unique constraint', () => {
    const options = {
      array: {
        type: 'array',
        names: ['-a'],
        unique: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -a    Accepts multiple parameters. Duplicate values will be removed.\n`,
    );
  });
});
