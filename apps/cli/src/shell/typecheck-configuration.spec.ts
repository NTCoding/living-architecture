import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const repoRoot = path.resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

const projectConfigurationSchema = z.object({
  name: z.string(),
  targets: z
    .record(
      z.string(),
      z.object({ options: z.object({ command: z.string().optional() }).optional() }),
    )
    .optional(),
})

const tsconfigSchema = z.object({
  compilerOptions: z.object({ noEmit: z.boolean().optional() }).optional(),
})

const typecheckExceptions = ['eclair']

describe('typecheck configuration', () => {
  it('disables typecheck only for the documented exception', () => {
    expect(projectsWithDisabledTypecheck().sort(compareCodePoints)).toStrictEqual(
      typecheckExceptions,
    )
  })
})

function compareCodePoints(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function projectsWithDisabledTypecheck(): string[] {
  return projectDirectories()
    .filter((directory) => !definesRealTypecheckTarget(directory))
    .filter(containsNoEmitTsconfig)
    .map(readProjectName)
}

function definesRealTypecheckTarget(directory: string): boolean {
  const command = readProjectConfiguration(directory).targets?.['typecheck']?.options?.command
  return command !== undefined && !command.includes('disabled')
}

function containsNoEmitTsconfig(directory: string): boolean {
  return readdirSync(path.join(repoRoot, directory))
    .filter((entry) => /^tsconfig.*\.json$/.test(entry))
    .some(
      (entry) =>
        tsconfigSchema.parse(
          JSON.parse(readFileSync(path.join(repoRoot, directory, entry), 'utf8')),
        ).compilerOptions?.noEmit === true,
    )
}

function readProjectName(directory: string): string {
  return readProjectConfiguration(directory).name
}

function readProjectConfiguration(directory: string): z.infer<typeof projectConfigurationSchema> {
  return projectConfigurationSchema.parse(
    JSON.parse(readFileSync(path.join(repoRoot, directory, 'project.json'), 'utf8')),
  )
}

function projectDirectories(): string[] {
  return [
    ...workspaceDirectories('apps'),
    ...workspaceSubdomainDirectories(),
    ...workspaceDirectories('tools'),
  ].filter((directory) => existsSync(path.join(repoRoot, directory, 'project.json')))
}

function workspaceDirectories(group: string): string[] {
  return readdirSync(path.join(repoRoot, group), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(group, entry.name))
}

function workspaceSubdomainDirectories(): string[] {
  return workspaceDirectories('packages').flatMap((subdomain) =>
    readdirSync(path.join(repoRoot, subdomain), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(subdomain, entry.name)),
  )
}
