'use client';

//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import React, { type JSX } from 'react';
import { ArgumentParser, ErrorMessage, AnsiMessage, valuesFor } from 'tsargp';
import { type Props, Command } from './classes/command';
import { demo as options } from 'tsargp/examples';

// @ts-expect-error remove version option since there's no package.json in the browser
delete options.version;

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
class DemoCommand extends Command {
  private readonly parser = new ArgumentParser(options);

  constructor(props: Props) {
    super(props, 'tsargp');
  }

  override async run(line: string, compIndex?: number) {
    try {
      const values = valuesFor(options);
      const flags = { progName: 'tsargp', compIndex, clusterPrefix: '-' };
      const { warning } = await this.parser.parseInto(values, line, flags);
      if (warning) {
        this.println(warning.wrap(this.state.width));
      }
      if (!values.hello) {
        this.println(JSON.stringify(values, null, 2));
      }
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
export default function Demo(props: Props): JSX.Element {
  return <DemoCommand {...props} />;
}
Demo.displayName = 'Demo Command';
