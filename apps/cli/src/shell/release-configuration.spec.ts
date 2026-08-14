import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const repoRoot = path.resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const riviereProjectSelectors = ['riviere-*', '@living-architecture/riviere-*']

const packageManifestSchema = z.object({
  name: z.string(),
  private: z.boolean().optional(),
  publishConfig: z.object({ access: z.literal('public') }).optional(),
})
const nxConfigurationSchema = z.object({
  release: z.object({
    projects: z.array(z.string()),
    version: z.object({ preVersionCommand: z.string() }),
  }),
})

describe('release configuration', () => {
  it('builds every public Rivière package before Nx versions and releases it', () => {
    const nxConfiguration = readJson('nx.json', nxConfigurationSchema)
    const publicRivierePackages = readWorkspacePackageManifests().filter(
      (manifest) => manifest.private !== true && manifest.name.includes('riviere'),
    )

    expect(nxConfiguration.release.projects).toStrictEqual(riviereProjectSelectors)
    expect(nxConfiguration.release.version.preVersionCommand).toContain(
      `--projects=${riviereProjectSelectors.join(',')}`,
    )

    for (const manifest of publicRivierePackages) {
      expect(manifest.publishConfig).toStrictEqual({ access: 'public' })
      expect(riviereProjectSelectors.some((selector) => matches(selector, manifest.name))).toBe(
        true,
      )
    }
  })

  it('names every subdomain package after its subdomain and package type', () => {
    for (const subdomain of readdirSync(path.join(repoRoot, 'packages'), {
      withFileTypes: true,
    })) {
      if (!subdomain.isDirectory()) continue

      const subdomainPath = path.join(repoRoot, 'packages', subdomain.name)
      for (const packageType of readdirSync(subdomainPath, { withFileTypes: true })) {
        if (
          !packageType.isDirectory() ||
          !existsSync(path.join(subdomainPath, packageType.name, 'package.json'))
        ) {
          continue
        }

        const manifest = readJson(
          path.join('packages', subdomain.name, packageType.name, 'package.json'),
          packageManifestSchema,
        )
        expect(manifest.name).toBe(`@living-architecture/${subdomain.name}-${packageType.name}`)
      }
    }
  })
})

function readWorkspacePackageManifests(): z.infer<typeof packageManifestSchema>[] {
  return [
    readJson('apps/cli/package.json', packageManifestSchema),
    ...readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true }).flatMap(
      (subdomain) => {
        if (!subdomain.isDirectory()) return []
        const subdomainPath = path.join(repoRoot, 'packages', subdomain.name)
        return readdirSync(subdomainPath, { withFileTypes: true })
          .filter(
            (entry) =>
              entry.isDirectory() &&
              existsSync(path.join(subdomainPath, entry.name, 'package.json')),
          )
          .map((entry) =>
            readJson(
              path.join('packages', subdomain.name, entry.name, 'package.json'),
              packageManifestSchema,
            ),
          )
      },
    ),
  ]
}

function readJson<T>(relativePath: string, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')))
}

function matches(selector: string, projectName: string): boolean {
  return selector.endsWith('*') && projectName.startsWith(selector.slice(0, -1))
}
