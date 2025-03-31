'use client';

//--------------------------------------------------------------------------------------------------
// Imports
//--------------------------------------------------------------------------------------------------
import React, { type JSX } from 'react';
import { type Options } from 'tsargp';
import * as tsargp from 'tsargp';
import * as enums from 'tsargp/enums';
import { type Props, Command } from './classes/command';

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * The component properties.
 */
type PlayProps = Props & {
  /**
   * A set of callbacks to interact with other components.
   */
  readonly callbacks: {
    /**
     * A callback that returns JavaScript source code.
     */
    getSource: () => string;
  };
};

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
class PlayCommand extends Command<PlayProps> {
  private options: Options | undefined;

  constructor(props: PlayProps) {
    super(props, 'init', 'play');
  }

  private async init() {
    const source = this.props.callbacks.getSource();
    const options = Function('tsargp', 'enums', `'use strict';${source}`)(tsargp, enums);
    const { warning } = await tsargp.validate(options);
    if (warning) {
      this.println(warning.wrap(this.state.width));
    }
    this.options = options;
  }

  override async run(line: string, compIndex?: number) {
    try {
      if (line.startsWith('init')) {
        if (!compIndex) {
          await this.init();
        }
      } else if (this.options) {
        const values = {};
        const flags = { progName: 'play', compIndex };
        const { warning } = await tsargp.parseInto(this.options, values, line, flags);
        if (warning) {
          this.println(warning.wrap(this.state.width));
        }
        this.println(JSON.stringify(values, null, 2));
      } else {
        this.println(`Please call ${tsargp.style(1)}init${tsargp.style(0)} first.`);
      }
    } catch (err) {
      if (err instanceof tsargp.AnsiMessage) {
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
export default function Play(props: PlayProps): JSX.Element {
  return <PlayCommand {...props} />;
}
Play.displayName = 'Play Command';
