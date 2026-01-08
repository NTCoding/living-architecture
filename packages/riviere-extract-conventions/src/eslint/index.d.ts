import type { TSESLint } from '@typescript-eslint/utils'

interface Plugin {
  rules: {
    'require-component-decorator': TSESLint.RuleModule<'missingDecorator'>
  }
}

declare const plugin: Plugin
export default plugin
