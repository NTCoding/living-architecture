import type { TSESLint } from '@typescript-eslint/utils'

type MessageIds = 'missingParameter' | 'tooManyParameters' | 'missingTypeAnnotation' | 'notTypeReference' | 'notEventDef' | 'nonPublicMethod'

declare const rule: TSESLint.RuleModule<MessageIds>
export default rule
