import {
  ComponentNotFoundError, RiviereQuery 
} from '@living-architecture/riviere-query'
import {
  describe, expect, it, vi 
} from 'vitest'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../platform/__fixtures__/command-test-fixtures'
import { TraceFlow } from './trace-flow'
import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'

describe('traceFlow command', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns near-match suggestions when component is not found', () => {
    const query = RiviereQuery.fromJSON({
      components: [
        {
          domain: 'orders',
          id: 'orders:checkout:usecase:place-order',
          module: 'checkout',
          name: 'place-order',
          sourceLocation: {
            filePath: 'src/usecase.ts',
            repository: 'https://github.com/org/repo',
          },
          type: 'UseCase',
        },
      ],
      links: [],
      metadata: {
        domains: {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
        },
        sources: [{ repository: 'https://github.com/org/repo' }],
      },
      version: '1.0',
    })
    vi.spyOn(query, 'traceFlow').mockImplementation(() => {
      throw new ComponentNotFoundError('orders:checkout:usecase:place-orde')
    })

    vi.spyOn(RiviereQueryRepository.prototype, 'load').mockReturnValue(query)

    expect(
      new TraceFlow(new RiviereQueryRepository()).execute({
        componentId: 'orders:checkout:usecase:place-orde',
        graphPathOption: undefined,
      }),
    ).toMatchObject({
      success: false,
      suggestions: ['orders:checkout:usecase:place-order'],
    })
  })
})
