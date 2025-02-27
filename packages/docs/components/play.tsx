'use client';

//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import React, { type JSX } from 'react';
import {
  type Options,
  parse,
  parseInto,
  validate,
  AnsiMessage,
  ErrorMessage,
  TextMessage,
} from 'tsargp';
import { config, style, allOf, oneOf, notOf, fg8, bg8, ul8 } from 'tsargp';
import * as enums from 'tsargp/enums';
import { type Props, Command } from './classes/command';

//--------------------------------------------------------------------------------------------------
// Constants
//--------------------------------------------------------------------------------------------------
const tsargp = {
  AnsiMessage,
  ErrorMessage,
  TextMessage,
  config,
  ...enums,
  parse,
  parseInto,
  validate,
  allOf,
  oneOf,
  notOf,
  style,
  fg8,
  bg8,
  ul8,
};

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
    const options = Function('tsargp', `'use strict';${source}`)(tsargp);
    const { warning } = await validate(options);
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
        const { warning } = await parseInto(this.options, values, line, flags);
        if (warning) {
          this.println(warning.wrap(this.state.width));
        }
        this.println(JSON.stringify(values, null, 2));
      } else {
        this.println(`Please call ${style(1)}init${style(0)} first.`);
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
export default function Play(props: PlayProps): JSX.Element {
  return <PlayCommand {...props} />;
}
Play.displayName = 'Play Command';
