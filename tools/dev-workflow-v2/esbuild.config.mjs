import * as esbuild from 'esbuild'

const executableBanner = '#!/usr/bin/env node'

await esbuild.build({
  entryPoints: ['src/shell/codex-workflow-command.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/codex-workflow-command.js',
  banner: { js: executableBanner },
  external: ['@nt-ai-lab/deterministic-agent-workflow-codex'],
})

await esbuild.build({
  entryPoints: ['src/shell/codex-cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/codex-cli.js',
  banner: { js: executableBanner },
  external: [
    '@nt-ai-lab/deterministic-agent-workflow-cli',
    '@nt-ai-lab/deterministic-agent-workflow-codex',
    '@nt-ai-lab/deterministic-agent-workflow-engine',
  ],
})

await esbuild.build({
  entryPoints: ['src/shell/prepare-implementation-branch.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/prepare-implementation-branch.js',
  banner: { js: executableBanner },
})
