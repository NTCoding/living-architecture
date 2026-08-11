import { describe, expect, it, vi } from 'vitest'
import {
  ComponentListLoader,
  ComponentSearchLoader,
  DomainListLoader,
  EntryPointListLoader,
  OrphanListLoader,
} from '../data-access/query-loaders'
import { DetectOrphans } from './detect-orphans'
import { ListComponents } from './list-components'
import { ListDomains } from './list-domains'
import { ListEntryPoints } from './list-entry-points'
import { SearchComponents } from './search-components'

class UnexpectedQueryFailure extends Error {
  constructor() {
    super('unexpected failure')
    this.name = 'UnexpectedQueryFailure'
  }
}

const unexpectedFailure = new UnexpectedQueryFailure()

describe('query use case errors', () => {
  it('rethrows an unexpected component list loading failure', () => {
    const loader = new ComponentListLoader()
    vi.spyOn(loader, 'load').mockImplementation(() => {
      throw unexpectedFailure
    })

    expect(() =>
      new ListComponents(loader).execute({
        domain: undefined,
        graphPathOption: undefined,
        type: undefined,
      }),
    ).toThrow(unexpectedFailure)
  })

  it('rethrows an unexpected domain list loading failure', () => {
    const loader = new DomainListLoader()
    vi.spyOn(loader, 'load').mockImplementation(() => {
      throw unexpectedFailure
    })

    expect(() => new ListDomains(loader).execute({ graphPathOption: undefined })).toThrow(
      unexpectedFailure,
    )
  })

  it('rethrows an unexpected entry point list loading failure', () => {
    const loader = new EntryPointListLoader()
    vi.spyOn(loader, 'load').mockImplementation(() => {
      throw unexpectedFailure
    })

    expect(() => new ListEntryPoints(loader).execute({ graphPathOption: undefined })).toThrow(
      unexpectedFailure,
    )
  })

  it('rethrows an unexpected orphan list loading failure', () => {
    const loader = new OrphanListLoader()
    vi.spyOn(loader, 'load').mockImplementation(() => {
      throw unexpectedFailure
    })

    expect(() => new DetectOrphans(loader).execute({ graphPathOption: undefined })).toThrow(
      unexpectedFailure,
    )
  })

  it('rethrows an unexpected component search loading failure', () => {
    const loader = new ComponentSearchLoader()
    vi.spyOn(loader, 'load').mockImplementation(() => {
      throw unexpectedFailure
    })

    expect(() =>
      new SearchComponents(loader).execute({
        graphPathOption: undefined,
        term: 'payment',
      }),
    ).toThrow(unexpectedFailure)
  })
})
