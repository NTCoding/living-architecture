import { z } from 'zod'
import { StaticZodSchemaProvider } from './zod-schema-provider'

it('returns the configured Zod schema', () => {
  const schema = z.enum(['IMPLEMENTING', 'REVIEWING'])

  const provider = new StaticZodSchemaProvider(schema)

  expect(provider.schema()).toBe(schema)
})
