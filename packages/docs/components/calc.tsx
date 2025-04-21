'use client';

//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import { type JSX } from 'react';
import { AnsiMessage, parse } from 'tsargp';
import { calc as options } from 'tsargp/examples';
import { type Props, Command } from './classes/command';

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
class CalcCommand extends Command {
  constructor(props: Props) {
    super(props, 'calc');
  }

  override async run(line: string, comp?: number) {
    try {
      const values = await parse(options, line, { completionIndex: comp });
      const result = values.add ?? values.sub ?? values.mult ?? values.div ?? NaN;
      this.println(`${result}`);
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
export default function Calc(props: Props): JSX.Element {
  return <CalcCommand {...props} />;
}
Calc.displayName = 'Calc Command';
