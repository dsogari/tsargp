// Adapted from:
// https://github.com/shuding/nextra/blob/main/packages/nextra/src/client/hocs/with-github-alert.tsx
// should be used on server
'use no memo';

import type { ComponentProps, FC, ReactNode } from 'react';

import clsx from 'clsx';

type CustomComponentType = FC<{ type: AlertType; children: ReactNode }>;
type BlockquoteType = FC<ComponentProps<'blockquote'>>;
type AlertType = (typeof ALERT_NAMES)[number];

const ALERT_RE = /^\s*\[!(?<name>.*?)]\s*$/;
const ALERT_NAMES = ['note', 'tip', 'quote', 'warning', 'caution'] as const;
const CLASS_NAME = clsx(
  'x:not-first:mt-6',
  'x:border-gray-300',
  'x:italic',
  'x:text-gray-700',
  'x:dark:border-gray-700',
  'x:dark:text-gray-400',
  'x:border-s-2',
  'x:ps-6',
);

// The default blockquote component
const Blockquote: BlockquoteType = (props) => <blockquote className={CLASS_NAME} {...props} />;

/**
 * Checks whether a name is a valid alert.
 * @param name The alert name
 * @returns True if the alert is valid
 */
function isAlert(name: string): name is AlertType {
  return ALERT_NAMES.includes(name as AlertType); // faster than Set for this size
}

/**
 * Gets an error for an invalid alert name.
 * @param name The alert name
 * @returns The error
 */
function invalidAlert(name: string): Error {
  return Error(`Invalid alert type: "${name}". Should be one of: ${ALERT_NAMES.join(', ')}.`);
}

/**
 * Combines a blockquote component with a custom component that handles alerts.
 * @param Custom The custom component
 * @param Default The default component
 * @returns The combined component
 */
export function withAlert(
  Custom: CustomComponentType,
  Default: BlockquoteType = Blockquote,
): BlockquoteType {
  return function Blockquote(props) {
    const { children } = props;
    if (Array.isArray(children)) {
      const text = children[1].props.children;
      if (typeof text === 'string') {
        const name = text.match(ALERT_RE)?.groups?.['name'].toLowerCase();
        if (name) {
          if (!isAlert(name)) {
            throw invalidAlert(name);
          }
          return Custom({ ...props, type: name, children: children.slice(2) });
        }
      }
    }
    return <Default {...props} />;
  };
}
