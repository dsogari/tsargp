'use client';

//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import { type JSX } from 'react';
import { AnsiMessage, format, parseInto, valuesFor, type ParsingFlags } from 'tsargp';
import { demo as options } from 'tsargp/examples';
import { Command, type Props } from './classes/command';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
const flags: ParsingFlags = {
  progName: 'tsargp',
  clusterPrefix: '-',
  optionPrefix: '-',
  stdinSymbol: '-',
  trailingMarker: '--',
  similarity: 0.6,
  format,
};

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
class DemoCommand extends Command {
  constructor(props: Props) {
    super(props, 'tsargp');
  }

  override async run(line: string, compIndex?: number) {
    try {
      const values = valuesFor(options);
      const { warning } = await parseInto(options, values, line, { ...flags, compIndex });
      if (warning) {
        this.println(warning.wrap(this.state.width));
      }
      if (!values.hello) {
        this.println(JSON.stringify(values, null, 2));
      }
    } catch (err) {
      if (err instanceof AnsiMessage) {
        throw err.wrap(this.state.width);
      }
      throw err;
    }
  }
}

//--------------------------------------------------------------------------------------------------
// Functions
//--------------------------------------------------------------------------------------------------
/** @ignore */
export default function Demo(props: Props): JSX.Element {
  return <DemoCommand {...props} />;
}
Demo.displayName = 'Demo Command';
