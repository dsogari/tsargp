'use client';

//--------------------------------------------------------------------------------------------------
// Imports and Exports
//--------------------------------------------------------------------------------------------------
import React, { Component, createRef, type JSX } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';

export { type Props, Editor };

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
   * The initial editor document.
   */
  readonly initialDoc?: string;
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
/**
 * A React component for editing JavaScript source code.
 */
class Editor extends Component<Props> {
  /**
   * The ref for the containing element.
   */
  private readonly ref = createRef<HTMLDivElement>();

  /**
   * The editor view.
   */
  private editorView: EditorView | undefined;

  /**
   * Creates the editor component.
   * @param props The component properties
   */
  constructor(props: Props) {
    super(props);
    props.callbacks.getSource = this.getSource.bind(this);
  }

  override componentDidMount() {
    if (this.ref.current) {
      this.editorView = new EditorView({
        extensions: [basicSetup, javascript()],
        parent: this.ref.current,
        doc: this.props.initialDoc,
      });
    }
  }

  override render(): JSX.Element {
    return (
      <div ref={this.ref} className={this.props.className} style={{ backgroundColor: 'gray' }} />
    );
  }

  /**
   * @returns The source code in the editor document.
   */
  private getSource(): string {
    return this.editorView ? this.editorView.state.doc.toString() : '';
  }
}
