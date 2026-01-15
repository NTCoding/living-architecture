import type { TSESLint } from '@typescript-eslint/utils'

type MessageIds = 'missingRoute' | 'routeNotLiteral'

declare const rule: TSESLint.RuleModule<MessageIds>
export default rule
