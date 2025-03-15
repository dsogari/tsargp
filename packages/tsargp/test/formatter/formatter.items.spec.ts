import { describe, expect, it } from 'bun:test';
import type { Options } from '../../src/library/options';
import { format } from '../../src/library/formatter';

describe('format', () => {
  it('handle an option that is always required', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        required: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    Always required.\n`);
  });

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

  it('handle a flag option deprecated for a reason', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        deprecated: 'reason',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    Deprecated for reason.\n`);
  });

  it('handle a flag option with cluster letters', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        cluster: 'fF',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    Can be clustered with 'fF'.\n`);
  });

  it('handle a flag option that reads data from standard input', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        stdin: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -f    Reads data from standard input.\n`);
  });

  it('handle a flag option with an environment variable', () => {
    const options = {
      flag: {
        type: 'flag',
        names: ['-f'],
        sources: ['VAR', new URL('file://path')],
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -f    Reads environment data from VAR, file://path/.\n`,
    );
  });

  it('handle a single-valued option that accepts positional arguments', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        positional: true,
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(`  -s  <param>  Accepts positional arguments.\n`);
  });

  it('handle a single-valued option that accepts positional arguments after marker', () => {
    const options = {
      single: {
        type: 'single',
        names: ['-s'],
        positional: '--',
      },
    } as const satisfies Options;
    expect(format(options).wrap()).toEqual(
      `  -s  <param>  Accepts positional arguments that may be preceded by --.\n`,
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
      `  -a  [<param>...]  Accepts multiple parameters. Values can be delimited with ','.\n`,
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
      `  -a  [<param>...]  Accepts multiple parameters. Can be supplied multiple times.\n`,
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
});
