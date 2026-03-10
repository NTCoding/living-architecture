import {
  describe, it, expect 
} from 'vitest'
import { formatPrMarkdown } from './format-pr-markdown'
import type { CategorizedComponents } from './format-pr-markdown'

describe('formatPrMarkdown', () => {
  it('formats added components', () => {
    const input: CategorizedComponents = {
      added: [
        {
          type: 'api',
          name: 'PlaceOrderController',
          domain: 'orders',
        },
        {
          type: 'event',
          name: 'OrderPlaced',
          domain: 'orders',
        },
      ],
      modified: [],
      removed: [],
    }

    const result = formatPrMarkdown(input)

    expect(result).toContain('## Architecture Changes')
    expect(result).toContain('### Added Components (2)')
    expect(result).toContain('- **api** `PlaceOrderController` in `orders` domain')
    expect(result).toContain('- **event** `OrderPlaced` in `orders` domain')
  })

  it('formats modified components', () => {
    const input: CategorizedComponents = {
      added: [],
      modified: [
        {
          type: 'eventHandler',
          name: 'OrderPlacedHandler',
          domain: 'orders',
        },
      ],
      removed: [],
    }

    const result = formatPrMarkdown(input)

    expect(result).toContain('### Modified Components (1)')
    expect(result).toContain('- **eventHandler** `OrderPlacedHandler` in `orders` domain')
  })

  it('formats removed components', () => {
    const input: CategorizedComponents = {
      added: [],
      modified: [],
      removed: [
        {
          type: 'useCase',
          name: 'LegacyHandler',
          domain: 'legacy',
        },
      ],
    }

    const result = formatPrMarkdown(input)

    expect(result).toContain('### Removed Components (1)')
    expect(result).toContain('- **useCase** `LegacyHandler` in `legacy` domain')
  })

  it('shows None for empty sections', () => {
    const input: CategorizedComponents = {
      added: [],
      modified: [],
      removed: [],
    }

    const result = formatPrMarkdown(input)

    expect(result).toContain('### Added Components (0)\nNone')
    expect(result).toContain('### Modified Components (0)\nNone')
    expect(result).toContain('### Removed Components (0)\nNone')
  })

  it('formats all sections together', () => {
    const input: CategorizedComponents = {
      added: [
        {
          type: 'api',
          name: 'NewController',
          domain: 'orders',
        },
      ],
      modified: [
        {
          type: 'event',
          name: 'ModifiedEvent',
          domain: 'events',
        },
      ],
      removed: [
        {
          type: 'useCase',
          name: 'OldHandler',
          domain: 'legacy',
        },
      ],
    }

    const result = formatPrMarkdown(input)

    expect(result).toContain('### Added Components (1)')
    expect(result).toContain('### Modified Components (1)')
    expect(result).toContain('### Removed Components (1)')
  })
})
