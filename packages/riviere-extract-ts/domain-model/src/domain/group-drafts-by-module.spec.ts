import { assert, describe, expect, it } from 'vitest'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { groupDraftsByModule } from './group-drafts-by-module'

function modules() {
  const result = ValidatedConfiguration.parse({
    modules: ['orders', 'shipping'].map((name) => ({
      name,
      domain: name,
      path: name,
      glob: '*.ts',
      api: { notUsed: true },
      useCase: { notUsed: true },
      domainOp: { notUsed: true },
      event: { notUsed: true },
      eventHandler: { notUsed: true },
      ui: { notUsed: true },
    })),
  })
  assert(result.success)
  return result.data.modules
}

function draft(domain: string): DraftComponent {
  return DraftComponent.parseOrThrow({
    type: 'useCase',
    name: `Handle${domain}`,
    domain,
    module: domain,
    location: { file: `${domain}.ts`, line: 1 },
  })
}

describe('groupDraftsByModule', () => {
  it('groups matching drafts and excludes empty module groups', () => {
    const [orders, shipping] = modules()
    assert(orders !== undefined && shipping !== undefined)
    const grouped = groupDraftsByModule(
      [draft('orders')],
      [orders, shipping],
      new Map([
        [orders, { files: ['orders.ts'] }],
        [shipping, { files: ['shipping.ts'] }],
      ]),
    )

    expect([...grouped.entries()].map(([name, drafts]) => [name, drafts.length])).toStrictEqual([
      ['orders', 1],
    ])
  })

  it('fails when a configured module has no source or a draft matches no module', () => {
    const [orders, shipping] = modules()
    assert(orders !== undefined && shipping !== undefined)

    expect(() =>
      groupDraftsByModule([], [orders, shipping], new Map([[orders, { files: [] }]])),
    ).toThrow("Missing source for module 'shipping'")
    expect(() =>
      groupDraftsByModule([draft('payments')], [orders], new Map([[orders, { files: [] }]])),
    ).toThrow('unexpected domains')
  })
})
