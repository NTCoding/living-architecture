import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { RiviereGraph } from './schema';
import rawSchema from '../riviere.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(rawSchema);

export function isRiviereGraph(data: unknown): data is RiviereGraph {
  return validate(data) === true;
}

interface ValidationErrorLike {
  instancePath: string;
  message?: string;
}

export function formatValidationErrors(
  errors: ValidationErrorLike[] | null | undefined,
): string {
  if (!errors || errors.length === 0) {
    return 'validation failed without specific errors';
  }
  return errors.map((e) => `${e.instancePath}: ${e.message}`).join('\n');
}

export function parseRiviereGraph(data: unknown): RiviereGraph {
  if (isRiviereGraph(data)) {
    return data;
  }
  throw new Error(
    `Invalid RiviereGraph:\n${formatValidationErrors(validate.errors)}`,
  );
}
