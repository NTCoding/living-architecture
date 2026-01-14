#!/usr/bin/env tsx
/**
 * Extraction Config Reference Documentation Generator
 *
 * Generates markdown documentation from JSON Schema definitions.
 * ALL content is derived from the schema - no hardcoded documentation.
 * Run with: pnpm exec tsx scripts/generate-docs.ts
 */

import {
  readFileSync, writeFileSync, mkdirSync 
} from 'node:fs'
import { join } from 'node:path'

/** Error thrown when schema JSON does not match expected structure. */
class InvalidSchemaFormatError extends Error {
  constructor() {
    super('Invalid schema format')
    this.name = 'InvalidSchemaFormatError'
  }
}

interface SchemaProperty {
  type?: string
  description?: string
  oneOf?: SchemaProperty[]
  $ref?: string
  const?: unknown
  minLength?: number
  minItems?: number
  items?: SchemaProperty
  enum?: string[]
  additionalProperties?: SchemaProperty | boolean
}

interface SchemaDef {
  type?: string
  description?: string
  required?: string[]
  additionalProperties?: boolean
  properties?: Record<string, SchemaProperty>
  oneOf?: SchemaProperty[]
  items?: SchemaProperty
  enum?: string[]
  $ref?: string
  minItems?: number
}

interface Schema {
  $defs: Record<string, SchemaDef>
  title?: string
  description?: string
  properties?: Record<string, SchemaProperty>
  required?: string[]
}

function escapePipes(str: string): string {
  return str.replaceAll('|', '\\|')
}

function resolveRef(schema: Schema, ref: string): SchemaDef | undefined {
  const path = ref.replace('#/$defs/', '')
  return schema.$defs[path]
}

function getRefTypeName(ref: string): string {
  return ref.replace('#/$defs/', '')
}

function formatOneOfType(prop: SchemaProperty): string {
  if (!prop.oneOf) return '`any`'
  return prop.oneOf
    .map((o) => {
      if (o.$ref) return `\`${getRefTypeName(o.$ref)}\``
      if (o.type === 'array' && o.items) {
        if (o.items.$ref) return `\`${getRefTypeName(o.items.$ref)}[]\``
        return `\`${o.items.type}[]\``
      }
      return `\`${o.type}\``
    })
    .join(' \\| ')
}

function formatArrayType(items: SchemaProperty): string {
  if (items.$ref) return `\`${getRefTypeName(items.$ref)}[]\``
  if (items.oneOf) return `(${formatOneOfType(items)})[]`
  return `\`${items.type}[]\``
}

function formatRecordType(additionalProperties: SchemaProperty): string {
  const valueType = additionalProperties.$ref
    ? getRefTypeName(additionalProperties.$ref)
    : (additionalProperties.type ?? 'unknown')
  return `\`Record<string, ${valueType}>\``
}

function getTypeString(prop: SchemaProperty): string {
  if (prop.$ref) {
    return `\`${getRefTypeName(prop.$ref)}\``
  }
  if (prop.oneOf) {
    return formatOneOfType(prop)
  }
  if (prop.type === 'array' && prop.items) {
    return formatArrayType(prop.items)
  }
  if (prop.enum) {
    return prop.enum.map((e) => `\`"${e}"\``).join(' \\| ')
  }
  if (prop.type === 'object' && typeof prop.additionalProperties === 'object') {
    return formatRecordType(prop.additionalProperties)
  }
  return `\`${prop.type ?? 'any'}\``
}

function generatePropertiesTable(
  properties: Record<string, SchemaProperty>,
  required: string[] = [],
): string[] {
  const lines: string[] = []
  lines.push('| Field | Type | Required | Description |')
  lines.push('|-------|------|----------|-------------|')

  for (const [propName, prop] of Object.entries(properties)) {
    const isRequired = required.includes(propName) ? '**Yes**' : 'No'
    const type = getTypeString(prop)
    const desc = escapePipes(prop.description ?? '')
    lines.push(`| \`${propName}\` | ${type} | ${isRequired} | ${desc} |`)
  }
  return lines
}

function generateDefMarkdown(name: string, def: SchemaDef, schema: Schema): string {
  const lines: string[] = []

  lines.push(`### \`${name}\``)
  lines.push('')
  if (def.description) {
    lines.push(def.description)
    lines.push('')
  }

  // Handle enum type definitions (like findTarget)
  if (def.enum) {
    lines.push('**Values:**')
    lines.push('')
    for (const val of def.enum) {
      lines.push(`- \`"${val}"\``)
    }
    lines.push('')
  }

  if (def.properties && Object.keys(def.properties).length > 0) {
    lines.push('**Properties:**')
    lines.push('')
    lines.push(...generatePropertiesTable(def.properties, def.required))
    lines.push('')
  }

  if (def.oneOf) {
    lines.push('**One of:**')
    lines.push('')
    for (const option of def.oneOf) {
      if (option.$ref) {
        const refName = getRefTypeName(option.$ref)
        const refDef = resolveRef(schema, option.$ref)
        lines.push(`- \`${refName}\` — ${escapePipes(refDef?.description ?? '')}`)
      }
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

function isPredicateDef(name: string): boolean {
  return name.endsWith('Predicate')
}

function generatePredicateOverview(predicateDef: SchemaDef, schema: Schema): string[] {
  const lines: string[] = []
  if (!predicateDef.oneOf) return lines

  lines.push('## Overview')
  lines.push('')
  lines.push('| Predicate | Description |')
  lines.push('|-----------|-------------|')

  for (const option of predicateDef.oneOf) {
    if (option.$ref) {
      const refName = getRefTypeName(option.$ref)
      const refDef = resolveRef(schema, option.$ref)
      const predicateKey = refName.replace('Predicate', '')
      const key = predicateKey.charAt(0).toLowerCase() + predicateKey.slice(1)
      lines.push(`| \`${key}\` | ${escapePipes(refDef?.description ?? '')} |`)
    }
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  return lines
}

function isSchemaDef(value: unknown): value is SchemaDef {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('properties' in value || 'type' in value || 'oneOf' in value || '$ref' in value)
  )
}

function generateRefPredicateTable(innerProp: SchemaDef): string[] {
  const lines: string[] = []
  lines.push('**Parameters:**')
  lines.push('')
  lines.push('| Field | Type | Required | Description |')
  lines.push('|-------|------|----------|-------------|')
  const refName = getRefTypeName(innerProp.$ref ?? '')
  const desc = escapePipes(innerProp.description ?? `Nested ${refName}`)
  lines.push(`| (nested) | \`${refName}\` | **Yes** | ${desc} |`)
  lines.push('')
  return lines
}

function generateArrayPredicateTable(innerProp: SchemaDef): string[] {
  const lines: string[] = []
  lines.push('**Parameters:**')
  lines.push('')
  lines.push('| Field | Type | Required | Description |')
  lines.push('|-------|------|----------|-------------|')
  const itemType = innerProp.items?.$ref
    ? getRefTypeName(innerProp.items.$ref)
    : (innerProp.items?.type ?? 'any')
  const minItems = innerProp.minItems ?? 1
  const desc = escapePipes(innerProp.description ?? `Array of ${itemType}`)
  lines.push(`| (array) | \`${itemType}[]\` | **Yes** (min: ${minItems}) | ${desc} |`)
  lines.push('')
  return lines
}

function generatePredicateParameters(def: SchemaDef): string[] {
  const outerProps = def.properties ?? {}
  const innerPropName = Object.keys(outerProps)[0]
  if (!innerPropName) return []

  const innerProp = outerProps[innerPropName]
  if (!isSchemaDef(innerProp)) return []

  // Handle nested object with properties (hasDecorator, hasJSDoc, etc.)
  if (innerProp.properties && Object.keys(innerProp.properties).length > 0) {
    const lines: string[] = []
    lines.push('**Parameters:**')
    lines.push('')
    lines.push(...generatePropertiesTable(innerProp.properties, innerProp.required))
    lines.push('')
    return lines
  }

  // Handle $ref predicates (inClassWith)
  if (innerProp.$ref) {
    return generateRefPredicateTable(innerProp)
  }

  // Handle array predicates (and, or)
  if (innerProp.type === 'array' && innerProp.items) {
    return generateArrayPredicateTable(innerProp)
  }

  return []
}

function generatePredicateSection(name: string, def: SchemaDef): string[] {
  const lines: string[] = []
  const predicateKey = name.replace('Predicate', '')
  const key = predicateKey.charAt(0).toLowerCase() + predicateKey.slice(1)

  lines.push(`### \`${key}\``)
  lines.push('')
  if (def.description) {
    lines.push(def.description)
    lines.push('')
  }

  lines.push(...generatePredicateParameters(def))
  lines.push('---')
  lines.push('')

  return lines
}

function generatePredicatesReference(schema: Schema): string {
  const lines: string[] = []

  lines.push('---')
  lines.push('pageClass: reference')
  lines.push('---')
  lines.push('')
  lines.push('# Predicate Reference')
  lines.push('')

  const predicateDef = schema.$defs['predicate']
  if (predicateDef) {
    lines.push(...generatePredicateOverview(predicateDef, schema))
  }

  for (const [name, def] of Object.entries(schema.$defs)) {
    if (isPredicateDef(name)) {
      lines.push(...generatePredicateSection(name, def))
    }
  }

  lines.push('## See Also')
  lines.push('')
  lines.push('- [Config Schema Reference](/reference/extraction-config/schema)')
  lines.push('- [TypeScript Getting Started](/extract/deterministic/typescript/getting-started)')
  lines.push('')

  return lines.join('\n')
}

function generateSchemaReference(schema: Schema): string {
  const lines: string[] = []

  lines.push('---')
  lines.push('pageClass: reference')
  lines.push('---')
  lines.push('')
  lines.push(`# ${schema.title ?? 'Extraction Config Schema'}`)
  lines.push('')
  if (schema.description) {
    lines.push(schema.description)
    lines.push('')
  }

  lines.push('**Format:** JSON or YAML')
  lines.push('')
  lines.push('---')
  lines.push('')

  if (schema.properties) {
    lines.push('## Root Properties')
    lines.push('')
    lines.push(...generatePropertiesTable(schema.properties, schema.required))
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  for (const [name, def] of Object.entries(schema.$defs)) {
    if (!isPredicateDef(name) && name !== 'predicate') {
      lines.push(generateDefMarkdown(name, def, schema))
    }
  }

  lines.push('## See Also')
  lines.push('')
  lines.push('- [Predicate Reference](/reference/extraction-config/predicates)')
  lines.push('- [TypeScript Getting Started](/extract/deterministic/typescript/getting-started)')
  lines.push('')

  return lines.join('\n')
}

function hasKey<K extends string>(obj: object, key: K): obj is object & Record<K, unknown> {
  return key in obj
}

function isSchema(value: unknown): value is Schema {
  if (typeof value !== 'object' || value === null) return false
  if (!hasKey(value, '$defs')) return false
  return typeof value['$defs'] === 'object'
}

// Main execution
try {
  const schemaPath = join(import.meta.dirname, '..', 'extraction-config.schema.json')
  const schemaContent = readFileSync(schemaPath, 'utf-8')
  const parsed: unknown = JSON.parse(schemaContent)
  if (!isSchema(parsed)) {
    throw new InvalidSchemaFormatError()
  }
  const schema = parsed

  const outputDir = join(import.meta.dirname, '..', 'docs', 'generated')
  mkdirSync(outputDir, { recursive: true })

  const predicatesContent = generatePredicatesReference(schema)
  const predicatesPath = join(outputDir, 'predicates.md')
  writeFileSync(predicatesPath, predicatesContent, 'utf-8')
  console.log(`Generated: ${predicatesPath}`)
  console.log(`Lines: ${predicatesContent.split('\n').length}`)

  const schemaRefContent = generateSchemaReference(schema)
  const schemaRefPath = join(outputDir, 'schema.md')
  writeFileSync(schemaRefPath, schemaRefContent, 'utf-8')
  console.log(`Generated: ${schemaRefPath}`)
  console.log(`Lines: ${schemaRefContent.split('\n').length}`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error('Documentation generation failed:', message)
  if (stack) {
    console.error(stack)
  }
  process.exit(1)
}
