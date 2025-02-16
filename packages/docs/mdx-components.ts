// nextra-theme-blog or your custom theme
import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs';
import type { MDXComponents } from 'nextra/mdx-components';

// Get the default MDX components
const themeComponents = getThemeComponents();

/**
 * Merge components
 * @param components The MDX components
 * @returns The merged components
 */
export function useMDXComponents(components?: Readonly<MDXComponents>) {
  return {
    ...themeComponents,
    ...components,
  };
}
