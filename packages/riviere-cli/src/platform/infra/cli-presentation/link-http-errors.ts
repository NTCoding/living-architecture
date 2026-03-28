import type { HttpMethod } from '@living-architecture/riviere-schema'
import { formatError } from './output'

interface ApiComponentSummary {
  id: string
  httpMethod: HttpMethod
}
import { CliErrorCode } from './error-codes'

/** @riviere-role cli-output-formatter */
export function reportNoApiFoundForPath(path: string, availablePaths: string[]): void {
  console.log(
    JSON.stringify(
      formatError(
        CliErrorCode.ComponentNotFound,
        `No API found with path '${path}'`,
        availablePaths.length > 0 ? [`Available paths: ${availablePaths.join(', ')}`] : [],
      ),
    ),
  )
}

/** @riviere-role cli-output-formatter */
export function reportAmbiguousApiMatch(path: string, matchingApis: ApiComponentSummary[]): void {
  const apiList = matchingApis.map((api) => `${api.id} (${api.httpMethod})`).join(', ')
  console.log(
    JSON.stringify(
      formatError(
        CliErrorCode.AmbiguousApiMatch,
        `Multiple APIs match path '${path}': ${apiList}`,
        ['Add --method flag to disambiguate'],
      ),
    ),
  )
}
