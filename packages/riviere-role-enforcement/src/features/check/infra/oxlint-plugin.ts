import path from 'node:path'
import { eslintCompatPlugin } from '@oxlint/plugins'
import {
  checkTargetSymbol, isFileInScope, isFileInsideScopeRoots 
} from '../domain/check-role-target'
import { RoleEnforcementConfigError } from '../../../platform/domain/role-enforcement-config-error'
import type { CompiledRoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import { loadRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import { normalizePath } from '../../../platform/infra/path-patterns'
import {
  extractRoleTargets, isProgramNode, type BaseNode 
} from './role-target-extraction'

interface RoleRuleOptions {configPath?: string}

/** @riviere-role lint-plugin-adapter */
function getRuleOptions(context: { options?: readonly unknown[] }): RoleRuleOptions {
  const [firstOption] = context.options ?? []

  if (typeof firstOption !== 'object' || firstOption === null) {
    return {}
  }

  if ('configPath' in firstOption && typeof firstOption.configPath === 'string') {
    return { configPath: firstOption.configPath }
  }

  return {}
}

/** @riviere-role lint-plugin-adapter */
function getFilename(context: {
  filename?: string;
  getFilename?: () => string 
}): string {
  if (typeof context.getFilename === 'function') {
    return context.getFilename()
  }

  return context.filename ?? '<unknown>'
}

/** @riviere-role lint-plugin-adapter */
function shouldInspectFile(filename: string): boolean {
  return filename.endsWith('.ts') || filename.endsWith('.tsx')
}

/** @riviere-role lint-plugin-adapter */
function createScopeCoverageMessage(relativeFilePath: string): string {
  return [
    'Role enforcement error: out-of-scope-by-omission',
    '',
    `File: ${relativeFilePath}`,
    'Why: This file contains targetable declarations and is inside the configured scope roots, but no enforcement include pattern covers it.',
    'Suggested fix: Expand the enforcement scope for this path or move the file into an explicitly excluded category. Do not rely on config omission as an exception.',
  ].join('\n')
}

/** @riviere-role lint-plugin-adapter */
function loadCompiledConfig(configPath: string):
  | {
    config: CompiledRoleEnforcementConfig
    error: null
  }
  | {
    config: null
    error: RoleEnforcementConfigError
  } {
  try {
    return {
      config: loadRoleEnforcementConfig(configPath),
      error: null,
    }
  } catch (error) {
    return {
      config: null,
      error:
        error instanceof RoleEnforcementConfigError
          ? error
          : new RoleEnforcementConfigError('Unknown role enforcement config error'),
    }
  }
}

const plugin = eslintCompatPlugin({
  meta: { name: 'riviere-role' },
  rules: {
    'enforce-role-definitions': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce repository role definitions for explicitly annotated classes, static methods, and standalone functions',
        },
        schema: [
          {
            type: 'object',
            properties: { configPath: { type: 'string' } },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        const options = getRuleOptions(context)

        return {
          Program(node: BaseNode) {
            if (!isProgramNode(node)) {
              return
            }

            const filename = getFilename(context)

            if (!shouldInspectFile(filename)) {
              return
            }

            const configPath = options.configPath ?? './riviere-role-enforcement.yaml'
            const configResult = loadCompiledConfig(configPath)

            if (configResult.config === null) {
              context.report({
                node,
                message: `Role enforcement config error: ${configResult.error.message}`,
              })
              return
            }

            const relativeFilePath = normalizePath(path.relative(process.cwd(), filename))
            const extractionResult = extractRoleTargets(node, context.sourceCode, relativeFilePath)

            if (
              (extractionResult.targets.length > 0 || extractionResult.issues.length > 0) &&
              isFileInsideScopeRoots(relativeFilePath, configResult.config) &&
              !isFileInScope(relativeFilePath, configResult.config)
            ) {
              context.report({
                node,
                message: createScopeCoverageMessage(relativeFilePath),
              })
              return
            }

            for (const issue of extractionResult.issues) {
              context.report({
                node: issue.reportNode,
                message: issue.message,
              })
            }

            for (const target of extractionResult.targets) {
              const violations = checkTargetSymbol(target, configResult.config)

              for (const violation of violations) {
                context.report({
                  node: target.reportNode,
                  message: violation.message,
                })
              }
            }
          },
        }
      },
    },
  },
})

export default plugin
