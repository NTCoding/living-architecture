import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { RiviereGraph } from './schema'
import rawSchema from '../../riviere.schema.json' with { type: 'json' }

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const validate = ajv.compile<RiviereGraph>(rawSchema)

/** @riviere-role published-language-parser */
export function parseRiviereGraph(
  value: unknown,
): { success: true; graph: RiviereGraph } | { success: false; issues: string[] } {
  if (validate(value)) {
    return { success: true, graph: value }
  }
  return {
    success: false,
    issues: validate.errors?.map(
      (issue) => `${issue.instancePath}: ${issue.message ?? 'invalid value'}`,
    ) ?? ['validation failed without specific issues'],
  }
}
