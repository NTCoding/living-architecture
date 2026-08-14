import type { TSESLint } from '@typescript-eslint/utils'

type MessageIds = 'missingType' | 'typeNotLiteral'

declare const rule: TSESLint.RuleModule<MessageIds>
export default rule
