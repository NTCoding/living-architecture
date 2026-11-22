import { z } from 'zod'

const MODEL_IDENTIFIER_SCHEMA = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9-]+\/[a-z0-9.-]+$/i,
    'A model identifier is provider/model, for example anthropic/claude-sonnet-4-6.',
  )

/** @riviere-role value-object */
export class ModelIdentifier {
  declare private readonly brand: 'ModelIdentifier'

  private constructor(private readonly identifier: string) {}

  static parse(value: string): ModelIdentifier {
    return new ModelIdentifier(MODEL_IDENTIFIER_SCHEMA.parse(value))
  }

  value(): string {
    return this.identifier
  }
}
