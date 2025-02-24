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
   * The initial editor selection.
   */
  readonly initialSel?: [number, number | undefined];
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
   * The editor extensions.
   */
  private readonly extensions = [basicSetup, javascript()];

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
      const doc = this.props.initialDoc;
      const sel = this.props.initialSel;
      this.editorView = new EditorView({
        extensions: this.extensions,
        parent: this.ref.current,
        doc,
        selection:
          doc && sel
            ? {
                anchor: Math.max(0, Math.min(doc.length, sel[0])), // sanitize anchor
                head: sel[1] && Math.max(0, Math.min(doc.length, sel[1])), // sanitize head
              }
            : undefined,
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
