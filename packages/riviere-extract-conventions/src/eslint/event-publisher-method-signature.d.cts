import type { TSESLint } from '@typescript-eslint/utils'

type MessageIds = 'missingParameter' | 'tooManyParameters' | 'missingTypeAnnotation' | 'notTypeReference' | 'invalidEventType' | 'nonPublicMethod'

declare const rule: TSESLint.RuleModule<MessageIds>
export default rule
