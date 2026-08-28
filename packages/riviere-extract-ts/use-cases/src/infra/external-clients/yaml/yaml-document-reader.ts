import { parse as parseYaml } from 'yaml'

/** @riviere-role external-client-error */
export class YamlDocumentError extends Error {}

/** @riviere-role external-client-service */
export class YamlDocumentReader {
  static parse(content: string): YamlDocumentReader {
    try {
      return new YamlDocumentReader(parseYaml(content))
    } catch (error) {
      throw new YamlDocumentError(String(error))
    }
  }

  private constructor(private readonly document: unknown) {}

  value(): unknown {
    return this.document
  }

  record(value: unknown, field: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new YamlDocumentError(`${field} must be an object`)
    }
    return Object.fromEntries(Object.entries(value))
  }

  array(value: unknown, field: string): readonly unknown[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new YamlDocumentError(`${field} must be a non-empty array`)
    }
    return value
  }

  string(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new YamlDocumentError(`${field} must be a non-empty string`)
    }
    return value
  }

  optionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined
  }

  optionalBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined
  }
}
