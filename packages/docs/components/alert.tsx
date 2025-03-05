// Adapted from:
// https://github.com/shuding/nextra/blob/main/packages/nextra/src/client/hocs/with-github-alert.tsx
// should be used on server
'use no memo';

import type { ComponentProps, FC, ReactNode } from 'react';

type CustomComponentType = FC<{ type: AlertType; children: ReactNode }>;
type BlockquoteType = FC<ComponentProps<'blockquote'>>;
type AlertType = (typeof ALERT_NAMES)[number];

const ALERT_RE = /^\s*\[!(?<name>.*?)]\s*$/;
const ALERT_NAMES = ['note', 'tip', 'quote', 'warning', 'caution'] as const;

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
 * @param custom The custom component
 * @param Component The blockquote component
 * @returns The combined component
 */
export function withAlert(
  custom: CustomComponentType,
  Component: BlockquoteType | 'blockquote' = 'blockquote',
): BlockquoteType {
  return function Blockquote(props) {
    const { children } = props;
    if (Array.isArray(children)) {
      const text = children[1].props.children;
      if (typeof text === 'string') {
        const alertName = text.match(ALERT_RE)?.groups?.['name'].toLowerCase();
        if (alertName) {
          if (!isAlert(alertName)) {
            throw invalidAlert(alertName);
          }
          return custom({
            ...props,
            type: alertName as AlertType,
            children: children.slice(2),
          });
        }
      }
    }
    return <Component {...props} />;
  };
}
