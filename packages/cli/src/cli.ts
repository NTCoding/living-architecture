import { Command } from 'commander';
import { createRequire } from 'module';
import { createAddComponentCommand } from './commands/builder/add-component';
import { createAddDomainCommand } from './commands/builder/add-domain';
import { createAddSourceCommand } from './commands/builder/add-source';
import { createInitCommand } from './commands/builder/init';
import { createLinkCommand } from './commands/builder/link';
import { createLinkExternalCommand } from './commands/builder/link-external';
import { createLinkHttpCommand } from './commands/builder/link-http';

interface PackageJson {
  version: string;
}

export function parsePackageJson(pkg: unknown): PackageJson {
  if (typeof pkg !== 'object' || pkg === null || !('version' in pkg)) {
    throw new Error('Invalid package.json: missing version field');
  }
  if (typeof pkg.version !== 'string') {
    throw new Error('Invalid package.json: version must be a string');
  }
  return { version: pkg.version };
}

function loadPackageJson(): PackageJson {
  const require = createRequire(import.meta.url);
  return parsePackageJson(require('../package.json'));
}

const packageJson = loadPackageJson();

export function createProgram(): Command {
  const program = new Command();

  program.name('riviere').version(packageJson.version);

  const builderCmd = program
    .command('builder')
    .description('Commands for building a graph');

  builderCmd.addCommand(createAddComponentCommand());
  builderCmd.addCommand(createAddDomainCommand());
  builderCmd.addCommand(createAddSourceCommand());
  builderCmd.addCommand(createInitCommand());
  builderCmd.addCommand(createLinkCommand());
  builderCmd.addCommand(createLinkExternalCommand());
  builderCmd.addCommand(createLinkHttpCommand());

  program
    .command('query')
    .description('Commands for querying a graph');

  return program;
}
