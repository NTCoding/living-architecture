import { describe, expect, it } from 'vitest'
import {
  parseAiEnrichConfig,
  parseAiExtractConfig,
  parseAsyncApiImportConfig,
  parseEventCatalogImportConfig,
} from './workflow-stage-config'

function rawAiExtractConfig(args: readonly string[]) {
  return {
    command: 'claude',
    args,
    'timeout-seconds': 30,
    sources: ['./component.ts'],
    selection: { from: ['missing-events'], 'component-types': ['Event'] },
    outputs: { 'add-components': true, 'add-links': true },
    context: { exclude: [], 'max-files-per-batch': 10, 'max-batches': 2 },
  }
}

function rawAiEnrichConfig(args: readonly string[]) {
  return {
    command: 'claude',
    args,
    'timeout-seconds': 30,
    sources: ['./component.ts'],
    selection: { 'component-types': ['Event'], 'missing-fields-only': true },
    fields: ['eventName'],
    context: { exclude: [], 'max-files-per-component': 10 },
  }
}

describe('AI stage prompt placeholders', () => {
  it('rejects more than one prompt placeholder in AI-extract args', () => {
    expect(
      parseAiExtractConfig(rawAiExtractConfig(['{prompt}', '--again={prompt}'])),
    ).toStrictEqual({
      success: false,
      issues: ["Expected at most one '{prompt}' placeholder in args. Got 2"],
    })
  })

  it('rejects more than one prompt placeholder in AI-enrich args', () => {
    expect(parseAiEnrichConfig(rawAiEnrichConfig(['{prompt}', '--again={prompt}']))).toStrictEqual({
      success: false,
      issues: ["Expected at most one '{prompt}' placeholder in args. Got 2"],
    })
  })

  it('accepts a single prompt placeholder in AI-extract args', () => {
    expect(parseAiExtractConfig(rawAiExtractConfig(['--prompt={prompt}']))).toMatchObject({
      success: true,
      config: { args: ['--prompt={prompt}'] },
    })
  })

  it('accepts no prompt placeholder in AI-enrich args', () => {
    expect(parseAiEnrichConfig(rawAiEnrichConfig(['-p']))).toMatchObject({
      success: true,
      config: { args: ['-p'] },
    })
  })
})

describe('workflow stage config parsers', () => {
  it('parses an EventCatalog import config', () => {
    expect(
      parseEventCatalogImportConfig({
        source: 'catalog.json',
        mappings: 'mappings.yaml',
        'allow-unmapped': false,
      }),
    ).toStrictEqual({
      success: true,
      config: { source: 'catalog.json', mappings: 'mappings.yaml', allowUnmapped: false },
    })
  })

  it('returns validation issues when an AsyncAPI import config is invalid', () => {
    const result = parseAsyncApiImportConfig({
      source: '',
      mappings: 'mappings.yaml',
      'allow-unmapped': false,
    })

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('source')
  })

  it('returns validation issues when an AI-extract config is invalid', () => {
    const result = parseAiExtractConfig({ ...rawAiExtractConfig(['-p']), command: '' })

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('command')
  })
})

describe('AI stage optional configuration', () => {
  it('preserves memory and prompt append for AI-extract', () => {
    const result = parseAiExtractConfig({
      ...rawAiExtractConfig(['-p']),
      memory: '2G',
      'prompt-append': 'Use the project glossary',
    })

    expect(result).toMatchObject({
      success: true,
      config: { memory: '2G', promptAppend: 'Use the project glossary' },
    })
  })

  it('preserves memory and prompt append for AI-enrich', () => {
    const result = parseAiEnrichConfig({
      ...rawAiEnrichConfig(['-p']),
      memory: '2G',
      'prompt-append': 'Use the project glossary',
    })

    expect(result).toMatchObject({
      success: true,
      config: { memory: '2G', promptAppend: 'Use the project glossary' },
    })
  })

  it('returns validation issues when an AI-enrich config is invalid', () => {
    const result = parseAiEnrichConfig({ ...rawAiEnrichConfig(['-p']), command: '' })

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('command')
  })
})

describe('root-level workflow stage validation errors', () => {
  it('labels a root-level validation issue with /', () => {
    const result = parseAiExtractConfig(null)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]?.startsWith('/:')).toBe(true)
  })
})
