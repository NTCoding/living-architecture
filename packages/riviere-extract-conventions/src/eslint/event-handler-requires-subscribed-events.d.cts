import type { TSESLint } from '@typescript-eslint/utils'

type MessageIds = 'missingSubscribedEvents' | 'subscribedEventsNotLiteralArray'

declare const rule: TSESLint.RuleModule<MessageIds>
export default rule
