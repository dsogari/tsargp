'use client';

//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import React, { Component, createRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { FitAddon } from '@xterm/addon-fit';
import { Readline } from 'xterm-readline';
import 'xterm/css/xterm.css';

export { type Props, type State, Command };

//--------------------------------------------------------------------------------------------------
// Types
//--------------------------------------------------------------------------------------------------
/**
 * The component properties.
 */
type Props = {
  /**
   * The HTML class name.
   */
  readonly className?: string;
  /**
   * The number of terminal rows.
   */
  readonly height?: number;
};

/**
 * The component state.
 */
type State = {
  /**
   * The terminal selection.
   */
  readonly selection: string;
  /**
   * The terminal width.
   */
  readonly width: number;
};

//--------------------------------------------------------------------------------------------------
// Classes
//--------------------------------------------------------------------------------------------------
/**
 * A React component for running Terminal commands.
 */
abstract class Command<P extends Props = Props, S extends State = State> extends Component<P, S> {
  /**
   * The ref for the containing element.
   */
  private readonly ref = createRef<HTMLDivElement>();

  /**
   * The Xterm.js terminal object.
   */
  private readonly term: Terminal;

  /**
   * The fit terminal addon.
   */
  private readonly fit = new FitAddon();

  /**
   * The resize observer.
   */
  private readonly resize = new ResizeObserver(this.fit.fit.bind(this.fit));

  /**
   * The readline controller.
   */
  private readonly readline = new Readline();

  /**
   * The list of command names.
   */
  private readonly commands: ReadonlyArray<string>;

  /**
   * Creates the command component.
   * @param props The component properties
   * @param names The command names
   */
  constructor(props: P, ...names: ReadonlyArray<string>) {
    super(props);
    this.commands = names;
    this.term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      // xterm chokes on undefined value for this prop (it logs an error on the console)
      ...(props.height ? { rows: props.height } : {}),
    });
    this.term.loadAddon(new WebLinksAddon());
    this.term.loadAddon(this.fit);
    this.term.loadAddon(this.readline);
    this.term.onData(this.onData.bind(this));
    this.term.onResize(this.onResize.bind(this));
    this.term.onSelectionChange(this.onSelectionChange.bind(this));
  }

  override componentDidMount() {
    this.setState({ selection: '', width: 90 });
    if (this.ref.current) {
      this.resize.observe(this.ref.current);
      this.term.open(this.ref.current);
      this.readInput();
    }
  }

  override componentWillUnmount() {
    this.term.dispose();
    this.resize.disconnect();
  }

  override render(): React.JSX.Element {
    return <div className={this.props.className} ref={this.ref} />;
  }

  /**
   * Starts reading a line from the terminal.
   */
  private readInput() {
    this.readline.read('$ ').then(this.onInput.bind(this)).catch(this.onError.bind(this));
  }

  /**
   * Fires when the user presses a key.
   * @param data The key value
   */
  private onData(data: string) {
    switch (data.charCodeAt(0)) {
      case 3:
        this.onCopy();
        break;
      case 9:
        this.onTab();
        break;
      case 22:
        this.onPaste();
        break;
    }
  }

  /**
   * Fires when the user copies from the terminal.
   */
  private onCopy() {
    if (this.state.selection) {
      navigator.clipboard.writeText(this.state.selection);
    }
  }

  /**
   * Fires when the user pastes into the terminal.
   */
  private onPaste() {
    navigator.clipboard.readText().then((data) => this.term.paste(data));
  }

  /**
   * Fires when a command throws.
   * @param err The captured error
   */
  private onError(err: unknown) {
    this.readline.println(`${err}`);
    this.readInput();
  }

  /**
   * Fires when the terminal size changes.
   * @param size The new terminal size
   * @param size.cols The terminal width
   */
  private onResize(size: { cols: number }) {
    this.setState({ width: size.cols });
  }

  /**
   * Fires when the user selects text.
   */
  private onSelectionChange() {
    const selection = this.term.getSelection();
    if (selection) {
      this.setState({ selection });
    }
  }

  /**
   * Fires when the user enters a horizontal tab.
   */
  private onTab() {
    // @ts-expect-error since we need to use the private line buffer
    const buffer: { buf: string; pos: number } = this.readline.state.line;
    const cmdLine = processEnvVars(buffer.buf.trimStart());
    if (!cmdLine) {
      return; // happens when there is no command beyond the environment variables
    }
    const [command, line] = cmdLine;
    const pos = buffer.pos - (buffer.buf.length - line.length);
    if (pos <= 0) {
      return; // happens when the cursor is positioned before the start of the command
    }
    let commands = ['clear', ...this.commands];
    for (let i = 0; i < pos && i < command.length; ++i) {
      commands = commands.filter((cmd) => i < cmd.length && cmd[i] === line[i]);
    }
    if (commands.length > 1) {
      this.readline.print(`\n> ${commands.join(' ')}\n> `);
    } else if (commands.length) {
      const cmd = commands[0];
      if (pos <= cmd.length) {
        this.term.paste(`${cmd} `.slice(pos));
      } else if (cmd !== 'clear') {
        this.run(line, pos).then(null, (comp) => {
          if (Array.isArray(comp) && comp.length) {
            this.onComplete(comp, line, pos);
          }
        });
      }
    }
  }

  /**
   * Performs the final completion step.
   * @param words The completion words
   * @param line The command line
   * @param compIndex The completion index
   */
  private onComplete(words: Array<string>, line: string, compIndex: number) {
    if (words.length > 1) {
      this.readline.print(`\n> ${words.join(' ')}\n> `);
    } else {
      const word = words[0];
      for (let i = compIndex - word.length; i < compIndex; ++i) {
        if (line.slice(i, compIndex) === word.slice(0, compIndex - i)) {
          this.term.paste(word.slice(compIndex - i) + ' ');
          break;
        }
      }
    }
  }

  /**
   * Fires when the user enters a line.
   * @param line The command-line
   */
  private async onInput(line: string) {
    const cmdLine = processEnvVars(line.trimStart());
    if (cmdLine) {
      const [command, line] = cmdLine;
      if (command === 'clear') {
        this.term.clear();
      } else if (this.commands.includes(command)) {
        await this.run(line);
      } else {
        this.readline.println(`${command}: command not found`);
      }
    }
    this.readInput();
  }

  /**
   * Runs or completes a command.
   * @param _line The command-line
   * @param _compIndex The completion index, if any
   */
  protected async run(_line: string, _compIndex?: number) {}

  /**
   * Prints a line on the terminal.
   * @param text The text line
   */
  protected println(text: string) {
    this.readline.println(text);
  }
}

/**
 * Parse and set environment variables from a command-line
 * @param line The command-line
 * @returns The command and line, or undefined if nothing remains after parsing env. vars
 */
function processEnvVars(line: string) {
  do {
    const [command, rest] = line.split(/ +(.*)/, 2);
    if (!command.includes('=')) {
      return [command, line];
    }
    const [name, value] = command.split('=', 2);
    process.env[name] = value; // mocked by webpack
    line = rest;
  } while (line);
  return undefined;
}
