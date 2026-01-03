import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import noGenericNames from './.eslint-rules/no-generic-names.js';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import jsdoc from 'eslint-plugin-jsdoc';

const customRules = {
  plugins: {
    custom: {
      rules: {
        'no-generic-names': noGenericNames,
      },
    },
    import: importPlugin
  },
};

export default tseslint.config(
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/node_modules',
      '**/.nx',
      '*.config.ts',
      '*.config.mjs',
      '*.config.js',
      'vitest.workspace.ts',
      '**/*.d.ts',
      '**/test-output',
      '**/api/generated/**',
      '**/.vitepress/cache/**',
    ],
  },
  eslintComments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/no-use': ['error', { allow: [] }],
    },
  },
  sonarjs.configs.recommended,
  customRules,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'import/extensions': [
        'error',
        'never',
        { ts: 'never', tsx: 'never', js: 'never', json: 'always' },
      ],

      // Custom rule: no generic names
      'custom/no-generic-names': 'error',

      // No comments - forces self-documenting code
      'no-warning-comments': 'off',
      'multiline-comment-style': 'off',
      'capitalized-comments': 'off',
      'no-inline-comments': 'error',
      'spaced-comment': 'off',

      // Ban let - use const only
      'no-restricted-syntax': [
        'error',
        {
          selector: 'VariableDeclaration[kind="let"]',
          message: 'Use const. Avoid mutation.',
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',

      // No any types
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // No type assertions - fix the types instead
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],

      // No non-null assertions - handle errors properly
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Ban generic folder imports (not lib - that's NX convention)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/utils/*', '*/utils'],
              message: 'No utils folders. Use domain-specific names.',
            },
            {
              group: ['*/helpers/*', '*/helpers'],
              message: 'No helpers folders. Use domain-specific names.',
            },
            {
              group: ['*/common/*', '*/common'],
              message: 'No common folders. Use domain-specific names.',
            },
            {
              group: ['*/shared/*', '*/shared'],
              message: 'No shared folders. Use domain-specific names.',
            },
            {
              group: ['*/core/*', '*/core'],
              message: 'No core folders. Use domain-specific names.',
            },
            {
              group: ['*/src/lib/*', '*/src/lib', './lib/*', './lib', '../lib/*', '../lib'],
              message: 'No lib folders in projects. Use domain-specific names.',
            },
          ],
        },
      ],

      // Complexity limits
      'max-lines': [
        'error',
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      'max-depth': ['error', 3],
      complexity: ['error', 12],

      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // JSDoc enforcement for RiviereBuilder public API only
    {
      files: ['packages/riviere-builder/src/builder.ts'],
      plugins: { jsdoc },
      rules: {
        'jsdoc/require-jsdoc': ['error', {
          publicOnly: { ancestorsOnly: true },
          require: {
            ClassDeclaration: true,
            MethodDefinition: true,
          },
        }],
        'jsdoc/require-param': 'error',
        'jsdoc/require-param-description': 'error',
        'jsdoc/require-returns': 'error',
        'jsdoc/require-returns-description': 'error',
      },
    },
);
