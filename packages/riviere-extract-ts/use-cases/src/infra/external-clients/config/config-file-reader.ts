import { fileExists } from '../filesystem/file-existence'
import { readTextFile } from '../filesystem/file-reader'
import { YamlDocumentError, YamlDocumentReader } from '../yaml/yaml-document-reader'

type ConfigReadResult =
  | Readonly<{ success: true; value: unknown }>
  | Readonly<{
      success: false
      code: 'CONFIG_NOT_FOUND' | 'VALIDATION_ERROR'
      message: string
    }>

/** @riviere-role external-client-service */
export function readConfigYaml(path: string): ConfigReadResult {
  if (!fileExists(path)) {
    return { success: false, code: 'CONFIG_NOT_FOUND', message: `Config file not found: ${path}` }
  }
  try {
    return { success: true, value: YamlDocumentReader.parse(readTextFile(path)).value() }
  } catch (error) {
    if (error instanceof YamlDocumentError) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid config file: ${error.message}`,
      }
    }
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: `Invalid config file: ${String(error)}`,
    }
  }
}
