import {
  describe, expect, it 
} from 'vitest'
import type * as ExtractConfig from '@living-architecture/riviere-extract-config'
import { ConfigValidationError } from '../../../../../platform/infra/cli/presentation/error-codes'
import { createModuleContexts } from './extraction-project-source-files'

describe('createModuleContexts', () => {
  it('throws when source files are missing for a resolved module', () => {
    const module = {
      name: 'orders',
      domain: 'orders',
      path: 'src',
      glob: '**/*.ts',
      api: { notUsed: true },
      useCase: { notUsed: true },
      domainOp: { notUsed: true },
      event: { notUsed: true },
      eventHandler: { notUsed: true },
      ui: { notUsed: true },
    } satisfies ExtractConfig.Module

    const resolvedConfig = { modules: [module] } satisfies ExtractConfig.ResolvedExtractionConfig

    expect(() => createModuleContexts('/workspace', resolvedConfig, new Map(), [], false)).toThrow(
      ConfigValidationError,
    )
  })
})
