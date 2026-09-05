import type { CodeExtractionConfig } from '@living-architecture/riviere-extract-config-published-language'
import { describe, expect, it } from 'vitest'
import { configuration } from './__fixtures__/workflow-fixtures'
import { WorkflowStage } from './workflow-stage'

describe('WorkflowStage', () => {
  it('detaches code extraction configuration from its mutable input', () => {
    const validatedConfig = configuration().resolvedConfig
    const modules = [...validatedConfig.modules]
    const matchApiBy = ['route']
    const eventPublisher = { fromType: 'publisher', metadataKey: 'eventName' }
    const httpLink = {
      fromCustomType: 'httpCall',
      matchDomainBy: 'domain',
      matchApiBy,
    }
    const config: CodeExtractionConfig = {
      modules,
      connections: { eventPublishers: [eventPublisher], httpLinks: [httpLink] },
      schema: 'schema.json',
    }
    const stage = WorkflowStage.fromCodeExtraction('extract', config)

    modules.length = 0
    eventPublisher.metadataKey = 'changed'
    httpLink.fromCustomType = 'changed'
    matchApiBy.push('changed')

    expect(stage.value).toStrictEqual({
      kind: 'code-extraction',
      name: 'extract',
      config: {
        modules: validatedConfig.modules,
        connections: {
          eventPublishers: [{ fromType: 'publisher', metadataKey: 'eventName' }],
          httpLinks: [
            {
              fromCustomType: 'httpCall',
              matchDomainBy: 'domain',
              matchApiBy: ['route'],
            },
          ],
        },
        schema: 'schema.json',
      },
    })
  })

  it('retains an empty connection configuration', () => {
    const validatedConfig = configuration().resolvedConfig
    const stage = WorkflowStage.fromCodeExtraction('extract', {
      modules: validatedConfig.modules,
      connections: {},
      schema: undefined,
    })

    expect(stage.value).toStrictEqual({
      kind: 'code-extraction',
      name: 'extract',
      config: {
        modules: validatedConfig.modules,
        connections: {},
        schema: undefined,
      },
    })
  })
})
