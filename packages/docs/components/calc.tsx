//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import React from 'react';
import { ArgumentParser, ErrorMessage, HelpMessage } from 'tsargp';
import { type Props, Command } from './classes/command';

// @ts-expect-error since tsargp demo does not export types
import { calc as options } from 'tsargp/examples';

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
class CalcCommand extends Command {
  private readonly parser = new ArgumentParser(options);

  constructor(props: Props) {
    super(props, 'calc');
  }

  override async run(line: string, compIndex?: number) {
    try {
      const values = await this.parser.parse(line, { compIndex });
      const result = values['add'] ?? values['sub'] ?? values['mult'] ?? values['div'] ?? NaN;
      this.println(`${result}`);
    } catch (err) {
      if (err instanceof ErrorMessage) {
        throw err.msg.wrap(this.state.width);
      } else if (err instanceof HelpMessage) {
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
