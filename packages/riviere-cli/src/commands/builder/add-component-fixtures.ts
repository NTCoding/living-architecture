interface AddComponentArgsOptions {
  type?: string;
  name?: string;
  domain?: string;
  module?: string;
  repository?: string;
  filePath?: string;
  extraArgs?: string[];
}

const DEFAULTS = {
  type: 'UI',
  name: 'Test Component',
  domain: 'orders',
  module: 'checkout',
  repository: 'https://github.com/org/repo',
  filePath: 'src/test.ts',
} as const;

export function buildAddComponentArgs(options: AddComponentArgsOptions = {}): string[] {
  const { type, name, domain, module, repository, filePath, extraArgs = [] } = { ...DEFAULTS, ...options };
  return [
    'node',
    'riviere',
    'builder',
    'add-component',
    '--type',
    type,
    '--name',
    name,
    '--domain',
    domain,
    '--module',
    module,
    '--repository',
    repository,
    '--file-path',
    filePath,
    ...extraArgs,
  ];
}
