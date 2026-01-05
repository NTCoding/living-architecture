#!/usr/bin/env tsx
/**
 * CLI Reference Documentation Generator
 *
 * Generates markdown documentation from Commander.js command definitions.
 * Run with: pnpm exec tsx scripts/generate-docs.ts
 */

import type {
  Command, Argument 
} from 'commander';
import {
  writeFileSync, mkdirSync 
} from 'node:fs';
import { join } from 'node:path';
import { createProgram } from '../src/cli';

interface OptionInfo {
  flags: string;
  description: string;
  required: boolean;
}

interface ArgumentInfo {
  name: string;
  description: string;
  required: boolean;
}

interface CommandInfo {
  name: string;
  fullName: string;
  description: string;
  options: OptionInfo[];
  arguments: ArgumentInfo[];
  examples: readonly string[];
}

interface CommandWithRegisteredArgs {readonly registeredArguments?: readonly Argument[];}

interface CommandWithEvents {readonly _events?: { readonly afterHelp?: unknown };}

type AfterHelpContext = {
  readonly command: Command;
  readonly write: (str: string) => void;
};

function extractOptions(cmd: Command): readonly OptionInfo[] {
  return cmd.options
    .filter((opt) => opt.long !== '--help' && opt.long !== '--version')
    .map((opt) => ({
      flags: opt.flags,
      description: opt.description ?? '',
      required: opt.required ?? false,
    }));
}

function hasRegisteredArguments(cmd: Command): cmd is Command & CommandWithRegisteredArgs {
  return 'registeredArguments' in cmd && Array.isArray(cmd.registeredArguments);
}

function extractArguments(cmd: Command): readonly ArgumentInfo[] {
  if (!hasRegisteredArguments(cmd)) {
    return [];
  }

  return cmd.registeredArguments.map((arg) => ({
    name: arg.name(),
    description: arg.description,
    required: arg.required,
  }));
}

function isAfterHelpCallback(fn: unknown): fn is (ctx: AfterHelpContext) => string | void {
  return typeof fn === 'function';
}

function callAfterHelpHandler(afterHelp: unknown, cmd: Command): string {
  if (isAfterHelpCallback(afterHelp)) {
    const parts: string[] = [];
    const context: AfterHelpContext = {
      command: cmd,
      write: (str: string) => {
        parts.push(str);
      },
    };
    const result = afterHelp(context);
    return typeof result === 'string' ? result : parts.join('');
  }

  if (typeof afterHelp === 'string') {
    return afterHelp;
  }

  return '';
}

function parseExamplesFromHelpText(helpText: string): readonly string[] {
  const lines = helpText.split('\n');
  const examples: string[] = [];
  const examplesStartIndex = lines.findIndex((line) => line.trim().startsWith('Examples:'));

  if (examplesStartIndex === -1) {
    return examples;
  }

  const exampleLines = lines.slice(examplesStartIndex + 1);
  const exampleParts: string[] = [];

  for (const line of exampleLines) {
    const trimmed = line.trim();
    const isNewExample = trimmed.startsWith('$') || trimmed.startsWith('#');
    const isContinuation = trimmed && exampleParts.length > 0 && !isNewExample;
    const isBlankAfterExample = !trimmed && exampleParts.length > 0;

    if (isNewExample) {
      if (exampleParts.length > 0) {
        examples.push(exampleParts.join('\n  ').trim());
        exampleParts.length = 0;
      }
      exampleParts.push(trimmed);
    } else if (isContinuation) {
      exampleParts.push(trimmed);
    } else if (isBlankAfterExample) {
      examples.push(exampleParts.join('\n  ').trim());
      exampleParts.length = 0;
    }
  }

  if (exampleParts.length > 0) {
    examples.push(exampleParts.join('\n  ').trim());
  }

  return examples;
}

function hasEvents(cmd: Command): cmd is Command & CommandWithEvents {
  return '_events' in cmd && typeof cmd._events === 'object' && cmd._events !== null;
}

function extractExamples(cmd: Command): readonly string[] {
  if (!hasEvents(cmd)) {
    return [];
  }

  const afterHelp = cmd._events?.afterHelp;
  if (!afterHelp) {
    return [];
  }

  try {
    const helpText = callAfterHelpHandler(afterHelp, cmd);
    return helpText ? parseExamplesFromHelpText(helpText) : [];
  } catch {
    return [];
  }
}

function extractCommandInfo(cmd: Command, parentName: string): CommandInfo {
  const fullName = parentName ? `${parentName} ${cmd.name()}` : cmd.name();

  return {
    name: cmd.name(),
    fullName,
    description: cmd.description() ?? '',
    options: [...extractOptions(cmd)],
    arguments: [...extractArguments(cmd)],
    examples: extractExamples(cmd),
  };
}

function collectCommands(cmd: Command, parentName: string): readonly CommandInfo[] {
  const fullName = parentName ? `${parentName} ${cmd.name()}` : cmd.name();

  return cmd.commands.flatMap((subcmd) =>
    subcmd.commands.length > 0
      ? collectCommands(subcmd, fullName)
      : [extractCommandInfo(subcmd, fullName)],
  );
}

function formatOption(opt: OptionInfo): string {
  return `| \`${opt.flags}\` | ${opt.description} |`;
}

function generateCommandMarkdown(cmd: CommandInfo): string {
  const lines: string[] = [];

  lines.push(`### \`${cmd.name}\``);
  lines.push('');
  lines.push(cmd.description);
  lines.push('');

  const args = cmd.arguments.map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`)).join(' ');
  const syntax = `${cmd.fullName}${args ? ' ' + args : ''} [options]`;
  lines.push('```bash');
  lines.push(syntax);
  lines.push('```');
  lines.push('');

  if (cmd.arguments.length > 0) {
    lines.push('**Arguments:**');
    lines.push('| Argument | Description |');
    lines.push('|----------|-------------|');
    for (const arg of cmd.arguments) {
      lines.push(`| \`<${arg.name}>\` | ${arg.description} |`);
    }
    lines.push('');
  }

  const requiredOpts = cmd.options.filter((o) => o.required);
  if (requiredOpts.length > 0) {
    lines.push('**Required:**');
    lines.push('| Flag | Description |');
    lines.push('|------|-------------|');
    for (const opt of requiredOpts) {
      lines.push(formatOption(opt));
    }
    lines.push('');
  }

  const optionalOpts = cmd.options.filter((o) => !o.required);
  if (optionalOpts.length > 0) {
    lines.push('**Optional:**');
    lines.push('| Flag | Description |');
    lines.push('|------|-------------|');
    for (const opt of optionalOpts) {
      lines.push(formatOption(opt));
    }
    lines.push('');
  }

  if (cmd.examples.length > 0) {
    lines.push('**Examples:**');
    lines.push('```bash');
    for (const example of cmd.examples) {
      const cleaned = example.replace(/^\$\s*/, '').replace(/^#\s*/, '# ');
      lines.push(cleaned);
    }
    lines.push('```');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

function generateReference(): string {
  const program = createProgram();
  const allCommands = collectCommands(program, '');

  const builderCommands = allCommands.filter((c) => c.fullName.startsWith('riviere builder'));
  const queryCommands = allCommands.filter((c) => c.fullName.startsWith('riviere query'));

  const lines: string[] = [];

  lines.push('---');
  lines.push('pageClass: reference');
  lines.push('---');
  lines.push('');
  lines.push('# CLI Command Reference');
  lines.push('');
  lines.push('> This file is auto-generated from CLI command definitions.');
  lines.push('> Do not edit manually. Run `nx generate-docs riviere-cli` to regenerate.');
  lines.push('');
  lines.push('Complete documentation for all Riviere CLI commands.');
  lines.push('');

  lines.push('## Installation');
  lines.push('');
  lines.push('```bash');
  lines.push('npm install @living-architecture/riviere-cli');
  lines.push('```');
  lines.push('');

  lines.push('## Usage');
  lines.push('');
  lines.push('```bash');
  lines.push('riviere builder <command> [options]  # Graph building commands');
  lines.push('riviere query <command> [options]    # Graph query commands');
  lines.push('```');
  lines.push('');

  lines.push('## Exit Codes');
  lines.push('');
  lines.push('- `0`: Success (including warnings)');
  lines.push('- `1`: Error or failed validation/consistency');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Builder Commands');
  lines.push('');
  lines.push('Commands for constructing architecture graphs.');
  lines.push('');

  for (const cmd of builderCommands) {
    lines.push(generateCommandMarkdown(cmd));
  }

  lines.push('## Query Commands');
  lines.push('');
  lines.push('Commands for analyzing and querying graphs.');
  lines.push('');

  for (const cmd of queryCommands) {
    lines.push(generateCommandMarkdown(cmd));
  }

  lines.push('## See Also');
  lines.push('');
  lines.push('- [CLI Quick Start](/get-started/cli-quick-start)');
  lines.push('- [Extraction Workflow](/extract/)');
  lines.push('- [Graph Structure](/reference/schema/graph-structure)');
  lines.push('');

  return lines.join('\n');
}

const outputDir = join(import.meta.dirname, '..', 'docs', 'generated');
const outputPath = join(outputDir, 'cli-reference.md');

mkdirSync(outputDir, { recursive: true });

const content = generateReference();
writeFileSync(outputPath, content, 'utf-8');

console.log(`Generated: ${outputPath}`);
console.log(`Lines: ${content.split('\n').length}`);
