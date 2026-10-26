/**
 * Mastra evicts run-scoped workflows after an idle TTL, and the eviction leaves
 * pending generation awaits unsettled, which hangs the run. The TTL must
 * outlast every generation budget so the budget's own abort fires first.
 * This module must be imported before anything that loads @mastra/core.
 *
 * @riviere-role shell-configuration
 */
const DEFAULT_RUN_TTL_MS = '5400000'

process.env['MASTRA_SUSPENDED_RUN_TTL_MS'] ??= DEFAULT_RUN_TTL_MS
