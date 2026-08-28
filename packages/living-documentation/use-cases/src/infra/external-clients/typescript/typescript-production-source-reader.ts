import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { compareTypescriptText } from './typescript-source-reader'

/** @riviere-role external-client-model */
export interface TypescriptParsedSource {
  readonly sourceFile: ts.SourceFile
}

/** @riviere-role external-client-service */
export function readTypescriptProductionSources(
  sourceRoot: string,
): readonly TypescriptParsedSource[] {
  if (!existsSync(sourceRoot)) return []
  return productionSourcePaths(sourceRoot).map((sourcePath) => ({
    sourceFile: ts.createSourceFile(
      sourcePath,
      readFileSync(sourcePath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  }))
}

/** @riviere-role external-client-service */
export function isTypescriptFixtureDirectory(directoryName: string): boolean {
  return directoryName === '__fixtures__' || directoryName === 'fixtures'
}

function productionSourcePaths(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => compareTypescriptText(left.name, right.name))
    .flatMap((entry): readonly string[] => {
      if (entry.isDirectory()) {
        return isExcludedProductionSourceDirectory(entry.name)
          ? []
          : productionSourcePaths(path.join(directory, entry.name))
      }
      return entry.isFile() && isProductionTypeScriptFile(entry.name)
        ? [path.join(directory, entry.name)]
        : []
    })
}

function isExcludedProductionSourceDirectory(directoryName: string): boolean {
  return (
    isTypescriptFixtureDirectory(directoryName) ||
    directoryName === '__tests__' ||
    directoryName === 'test' ||
    directoryName === 'tests'
  )
}

function isProductionTypeScriptFile(fileName: string): boolean {
  const isTypeScript = /\.(?:[cm]?ts|tsx)$/.test(fileName)
  const isTest = /\.(spec|test)\.[cm]?[jt]sx?$/.test(fileName)
  const isFixture = /(?:^|[.-])fixtures?\.[cm]?[jt]sx?$/.test(fileName)
  const isDeclaration = /\.d\.[cm]?ts$/.test(fileName)
  return isTypeScript && !isDeclaration && !isTest && !isFixture
}
