import { ZodSchemaProvider } from './zod-schema-provider'
import { z } from 'zod'

describe('zod schema provider', () => {
  it('provides the supplied schema', () => {
    const schema = z.string()
    const provider = new ZodSchemaProvider<string>(schema)
    expect(provider.getSchema()).toStrictEqual(schema)
  })
})
