import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import mdx from 'eslint-plugin-mdx';
import jsdoc from 'eslint-plugin-jsdoc';
import cspell from '@cspell/eslint-plugin/configs';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  jsdoc.configs['flat/recommended-typescript-error'],
  mdx.flat,
  cspell.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          caughtErrors: 'none',
        },
      ],
    },
  },
  {
    files: ['**/*.mdx'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    ignores: ['**/.next', '**/dist', '**/public'],
  },
);
