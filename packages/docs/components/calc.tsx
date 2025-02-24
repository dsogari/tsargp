'use client';

//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import React, { type JSX } from 'react';
import { parse, ErrorMessage, AnsiMessage } from 'tsargp';
import { type Props, Command } from './classes/command';
import { calc as options } from 'tsargp/examples';

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
class CalcCommand extends Command {
  constructor(props: Props) {
    super(props, 'calc');
  }

  override async run(line: string, compIndex?: number) {
    try {
      const values = await parse(options, line, { compIndex });
      const result = values.add ?? values.sub ?? values.mult ?? values.div ?? NaN;
      this.println(`${result}`);
    } catch (err) {
      if (err instanceof ErrorMessage) {
        throw err.msg.wrap(this.state.width);
      } else if (err instanceof AnsiMessage) {
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
