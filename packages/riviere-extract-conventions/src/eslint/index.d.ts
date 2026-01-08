import type { RuleModule } from '@typescript-eslint/rule-tester'

interface Plugin {
  rules: {
    'require-component-decorator': RuleModule<'missingDecorator'>
  }
}

declare const plugin: Plugin
export default plugin
