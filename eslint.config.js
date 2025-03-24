import js from '@eslint/js';
import json from '@eslint/json';
import ts from 'typescript-eslint';
import md from '@eslint/markdown';
import mdx from 'eslint-plugin-mdx';
import jsdoc from 'eslint-plugin-jsdoc';
import cspell from '@cspell/eslint-plugin/configs';

export default ts.config(
  {
    files: ['**/*.js', '**/*.ts'],
    ...js.configs.recommended,
  },
  ts.configs.recommended,
  md.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts'],
    ...jsdoc.configs['flat/recommended-typescript-error'],
    rules: {
      ...jsdoc.configs['flat/recommended-typescript-error'].rules,
      'jsdoc/no-undefined-types': 'error',
    },
  },
  {
    files: ['**/*.json'],
    language: 'json/json',
    ...json.configs.recommended,
  },
  {
    files: ['**/*.jsonc'],
    language: 'json/jsonc',
    ...json.configs.recommended,
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ...mdx.flat,
    rules: {
      ...mdx.flat.rules,
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    ...cspell.recommended,
    rules: {
      ...cspell.recommended.rules,
      '@cspell/spellchecker': 'error',
    },
  },
  {
    ignores: ['.husky', '**/.next', '**/dist', '**/public'],
  },
);
