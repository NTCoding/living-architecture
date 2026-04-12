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
    'event-publisher-method-signature': TSESLint.RuleModule<
      | 'missingParameter'
      | 'tooManyParameters'
      | 'missingTypeAnnotation'
      | 'notTypeReference'
      | 'notEventDef'
      | 'nonPublicMethod'
    >
    'http-client-requires-service-name': TSESLint.RuleModule<
      'missingServiceName' | 'serviceNameNotLiteral' | 'emptyServiceName'
    >
    'http-call-requires-route': TSESLint.RuleModule<
      'missingRoute' | 'routeNotLiteral' | 'emptyRoute'
    >
    'http-call-requires-http-client-container': TSESLint.RuleModule<'missingHttpClientContainer'>
    'http-client-public-methods-require-http-call': TSESLint.RuleModule<'missingHttpCall'>
    'no-fetch-outside-http-client': TSESLint.RuleModule<'fetchOutsideHttpClient'>
  }
  configs: {
    'http-client-import-boundary': {
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: Array<{ name: string; message: string }>
            patterns: Array<{ group: string[]; message: string }>
          },
        ]
      }
    }
  }
}

declare const plugin: Plugin
export default plugin
