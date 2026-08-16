import type { Linter } from 'eslint'

declare const plugin: {
  readonly meta: {
    readonly name: string
  }
  readonly rules: Readonly<Record<string, Parameters<Linter['defineRule']>[1]>>
}

export default plugin
