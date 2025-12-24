import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { RiviereGraph } from './schema.js'
import rawSchema from '../riviere.schema.json' with { type: 'json' }

const ajv = new Ajv.default({ allErrors: true })
addFormats.default(ajv)

const validate = ajv.compile(rawSchema)

export function isRiviereGraph(data: unknown): data is RiviereGraph {
  return validate(data) === true
}

export function parseRiviereGraph(data: unknown): RiviereGraph {
  if (isRiviereGraph(data)) {
    return data
  }
  const messages = validate.errors!.map((e) => `${e.instancePath}: ${e.message}`).join('\n')
  throw new Error(`Invalid RiviereGraph:\n${messages}`)
}
