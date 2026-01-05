#!/usr/bin/env tsx
/**
 * Validates that all CLI command references in docs match actual CLI commands.
 * Fails build if docs reference non-existent commands.
 */

import {
  readdirSync, readFileSync, statSync 
} from 'node:fs'
import { join } from 'node:path'
import { createProgram } from '../../../packages/riviere-cli/src/cli'

interface ValidationError {
  file: string
  line: number
  command: string
  context: string
}

const FALSE_POSITIVES = new Set(['command', 'options', 'type'])

function getValidCommands(): Set<string> {
  const program = createProgram()
  const commands = new Set<string>()

  for (const cmd of program.commands) {
    for (const subCmd of cmd.commands) {
      commands.add(subCmd.name())
    }
  }

  return commands
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'api') {
        files.push(...findMarkdownFiles(fullPath))
      }
    } else if (entry.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

function isValidOrFalsePositive(command: string, validCommands: Set<string>): boolean {
  return validCommands.has(command) || FALSE_POSITIVES.has(command)
}

function extractCommandsFromLine(line: string, pattern: RegExp): string[] {
  const commands: string[] = []
  const regex = new RegExp(pattern.source, pattern.flags)

  const matches = line.matchAll(regex)
  for (const match of matches) {
    commands.push(match[1])
  }

  return commands
}

function validateLine(
  line: string,
  lineNumber: number,
  filePath: string,
  validCommands: Set<string>,
  patterns: readonly RegExp[],
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const pattern of patterns) {
    const commands = extractCommandsFromLine(line, pattern)

    for (const command of commands) {
      if (!isValidOrFalsePositive(command, validCommands)) {
        errors.push({
          file: filePath,
          line: lineNumber,
          command,
          context: line.trim().slice(0, 80),
        })
      }
    }
  }

  return errors
}

function validateFile(filePath: string, validCommands: Set<string>): ValidationError[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  const patterns = [/riviere\s+builder\s+([a-z-]+)/g, /cli-reference#([a-z-]+)/g] as const

  return lines.flatMap((line, index) =>
    validateLine(line, index + 1, filePath, validCommands, patterns),
  )
}

function main(): void {
  const docsDir = join(import.meta.dirname, '..')

  console.log('Validating CLI command references in docs...\n')

  const validCommands = getValidCommands()
  console.log(
    `Valid commands: ${[...validCommands].sort((a, b) => a.localeCompare(b)).join(', ')}\n`,
  )

  const files = findMarkdownFiles(docsDir)
  const allErrors = files.flatMap((file) => validateFile(file, validCommands))

  if (allErrors.length === 0) {
    console.log(`✓ All CLI references valid (checked ${files.length} files)`)
    process.exit(0)
  }

  console.error(`✗ Found ${allErrors.length} invalid CLI command references:\n`)

  for (const error of allErrors) {
    const relativePath = error.file.replace(docsDir + '/', '')
    console.error(`  ${relativePath}:${error.line}`)
    console.error(`    Invalid command: "${error.command}"`)
    console.error(`    Context: ${error.context}\n`)
  }

  process.exit(1)
}

main()
