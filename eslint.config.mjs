import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import noGenericNames from './.eslint-rules/no-generic-names.js';

const customRules = {
  plugins: {
    custom: {
      rules: {
        'no-generic-names': noGenericNames,
      },
    },
  },
};

export default tseslint.config(
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/node_modules', '**/.nx', '*.config.ts', '*.config.mjs', '*.config.js', 'vitest.workspace.ts', '**/*.d.ts'],
  },
  customRules,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
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
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],

      // Ban generic folder imports (not lib - that's NX convention)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['*/utils/*', '*/utils'], message: 'No utils folders. Use domain-specific names.' },
            { group: ['*/helpers/*', '*/helpers'], message: 'No helpers folders. Use domain-specific names.' },
            { group: ['*/common/*', '*/common'], message: 'No common folders. Use domain-specific names.' },
            { group: ['*/shared/*', '*/shared'], message: 'No shared folders. Use domain-specific names.' },
            { group: ['*/core/*', '*/core'], message: 'No core folders. Use domain-specific names.' },
          ],
        },
      ],

      // Complexity limits
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      'complexity': ['error', 12],

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
          format: ['camelCase'],
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
  }
);
