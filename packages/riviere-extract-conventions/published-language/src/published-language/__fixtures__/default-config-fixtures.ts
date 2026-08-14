import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseExtractionConfig,
  type DraftConfiguration,
} from '@living-architecture/riviere-extract-config-published-language'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))

export class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

export function loadDefaultConfig(): unknown {
  const configPath = join(CURRENT_DIR, '../default-extraction.config.json')
  const configContent = readFileSync(configPath, 'utf-8')
  return JSON.parse(configContent)
}

export function getDraftConfiguration(config: unknown): DraftConfiguration {
  const result = parseExtractionConfig(config)
  if (!result.success) {
    throw new TestAssertionError(
      `Expected a valid DraftConfiguration. Got an invalid configuration.`,
    )
  }
  return result.configuration
}

export function getFirstModule(config: unknown): DraftConfiguration['modules'][number] {
  const result = parseExtractionConfig(config)
  if (!result.success) {
    throw new TestAssertionError(
      `Expected a valid DraftConfiguration. Got an invalid configuration.`,
    )
  }

  const [module] = result.configuration.modules
  if (!module) {
    throw new TestAssertionError(
      `Expected modules[0] after schema validation. Got undefined. Schema enforces minItems: 1.`,
    )
  }

  return module
}
