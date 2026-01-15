import type { TSESLint } from '@typescript-eslint/utils'

interface Plugin {
  rules: {
    'require-component-decorator': TSESLint.RuleModule<'missingDecorator'>
    'api-controller-requires-route-and-method': TSESLint.RuleModule<
      | 'missingRoute'
      | 'missingMethod'
      | 'routeNotLiteral'
      | 'methodNotLiteral'
      | 'invalidHttpMethod'
    >
    'event-requires-type-property': TSESLint.RuleModule<'missingType' | 'typeNotLiteral'>
    'event-handler-requires-subscribed-events': TSESLint.RuleModule<
      'missingSubscribedEvents' | 'subscribedEventsNotLiteralArray'
    >
    'ui-page-requires-route': TSESLint.RuleModule<'missingRoute' | 'routeNotLiteral'>
  }
}

declare const plugin: Plugin
export default plugin
