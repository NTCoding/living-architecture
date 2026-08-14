import type { TSESLint } from '@typescript-eslint/utils'

type MessageIds = 'missingRoute' | 'missingMethod' | 'routeNotLiteral' | 'methodNotLiteral' | 'invalidHttpMethod'

declare const rule: TSESLint.RuleModule<MessageIds>
export default rule
