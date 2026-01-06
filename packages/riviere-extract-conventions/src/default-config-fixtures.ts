import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isValidExtractionConfig,
  type ExtractionConfig,
} from '@living-architecture/riviere-extract-config'

export function loadDefaultConfig(): unknown {
  const configPath = join(__dirname, 'default-extraction.config.json')
  const configContent = readFileSync(configPath, 'utf-8')
  return JSON.parse(configContent)
}

export function getFirstModule(config: unknown): ExtractionConfig['modules'][number] {
  if (!isValidExtractionConfig(config)) {
    throw new Error(`Expected valid ExtractionConfig. Got invalid config. Validation needed.`)
  }

  const [module] = config.modules
  if (!module) {
    throw new Error(
      `Expected modules[0] after schema validation. Got undefined. Schema enforces minItems: 1.`,
    )
  }

  return module
}
