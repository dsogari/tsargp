// nextra-theme-blog or your custom theme
import { withAlert } from '@components/alert';
import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs';
import { Callout } from 'nextra/components';

// Get the default MDX components
const themeComponents = getThemeComponents();

// Mapping of Alert type to Callout type
const calloutType = {
  note: 'info',
  tip: 'default',
  quote: 'quote', // renders a transparent block
  warning: 'warning',
  caution: 'error',
};

// https://nextra.site/docs/guide/github-alert-syntax
const blockquote = withAlert(({ type, ...props }) => (
  <Callout type={calloutType[type]} {...props} />
));

/**
 * Merge components
 * @param components The MDX components
 * @returns The merged components
 */
export function useMDXComponents(components = {}) {
  return {
    ...themeComponents,
    ...components,
    blockquote,
  };
}
