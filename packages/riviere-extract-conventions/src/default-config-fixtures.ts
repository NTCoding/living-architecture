import { readFileSync } from 'node:fs'
import {
  join, dirname 
} from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isValidExtractionConfig,
  type ExtractionConfig,
} from '@living-architecture/riviere-extract-config'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))

export class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

export function loadDefaultConfig(): unknown {
  const configPath = join(CURRENT_DIR, 'default-extraction.config.json')
  const configContent = readFileSync(configPath, 'utf-8')
  return JSON.parse(configContent)
}

export function getFirstModule(config: unknown): ExtractionConfig['modules'][number] {
  if (!isValidExtractionConfig(config)) {
    throw new TestAssertionError(
      `Expected valid ExtractionConfig. Got invalid config. Validation needed.`,
    )
  }

  const [module] = config.modules
  if (!module) {
    throw new TestAssertionError(
      `Expected modules[0] after schema validation. Got undefined. Schema enforces minItems: 1.`,
    )
  }

  return module
}
