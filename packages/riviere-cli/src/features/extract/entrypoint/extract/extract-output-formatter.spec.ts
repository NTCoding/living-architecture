import {
  describe, expect, it 
} from 'vitest'
import { formatDryRunOutput } from './extract-output-formatter'

describe('formatDryRunOutput', () => {
  it('handles equal comparator values when only one domain and type exist', () => {
    expect(
      formatDryRunOutput([
        {
          domain: 'alpha',
          location: {
            file: 'a.ts',
            line: 1,
          },
          name: 'A',
          type: 'api',
        },
      ]),
    ).toStrictEqual(['alpha: api(1)'])
  })

  it('formats and sorts dry-run output by domain and type', () => {
    expect(
      formatDryRunOutput([
        {
          domain: 'zeta',
          location: {
            file: 'a.ts',
            line: 1,
          },
          name: 'A',
          type: 'useCase',
        },
        {
          domain: 'alpha',
          location: {
            file: 'b.ts',
            line: 2,
          },
          name: 'B',
          type: 'api',
        },
        {
          domain: 'alpha',
          location: {
            file: 'c.ts',
            line: 3,
          },
          name: 'C',
          type: 'api',
        },
        {
          domain: 'alpha',
          location: {
            file: 'd.ts',
            line: 4,
          },
          name: 'D',
          type: 'event',
        },
      ]),
    ).toStrictEqual(['alpha: api(2), event(1)', 'zeta: useCase(1)'])
  })
})
