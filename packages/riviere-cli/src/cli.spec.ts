import { createProgram, parsePackageJson } from './cli';
import { Command } from 'commander';

describe('parsePackageJson', () => {
  it('returns version when package.json is valid', () => {
    const result = parsePackageJson({ version: '1.2.3' });

    expect(result).toEqual({ version: '1.2.3' });
  });

  it('throws when input is null', () => {
    expect(() => parsePackageJson(null)).toThrow('Invalid package.json: missing version field');
  });

  it('throws when input is not an object', () => {
    expect(() => parsePackageJson('not an object')).toThrow('Invalid package.json: missing version field');
  });

  it('throws when version field is missing', () => {
    expect(() => parsePackageJson({ name: 'test' })).toThrow('Invalid package.json: missing version field');
  });

  it('throws when version is not a string', () => {
    expect(() => parsePackageJson({ version: 123 })).toThrow('Invalid package.json: version must be a string');
  });
});

describe('createProgram', () => {
  it('returns a Commander program instance', () => {
    const program = createProgram();

    expect(program).toBeInstanceOf(Command);
  });

  it('returns program named riviere', () => {
    const program = createProgram();

    expect(program.name()).toBe('riviere');
  });

  it('returns program with version from package.json', () => {
    const program = createProgram();

    expect(program.version()).toBe('0.1.0');
  });

  it('registers builder subcommand', () => {
    const program = createProgram();
    const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');

    expect(builderCmd?.name()).toBe('builder');
  });

  it('registers query subcommand', () => {
    const program = createProgram();
    const queryCmd = program.commands.find((cmd) => cmd.name() === 'query');

    expect(queryCmd?.name()).toBe('query');
  });

  it('describes builder as graph construction commands', () => {
    const program = createProgram();
    const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');

    expect(builderCmd?.description()).toBe('Commands for building a graph');
  });

  it('describes query as graph querying commands', () => {
    const program = createProgram();
    const queryCmd = program.commands.find((cmd) => cmd.name() === 'query');

    expect(queryCmd?.description()).toBe('Commands for querying a graph');
  });

  it('shows builder in help output', () => {
    const program = createProgram();

    expect(program.helpInformation()).toContain('builder');
  });

  it('shows query in help output', () => {
    const program = createProgram();

    expect(program.helpInformation()).toContain('query');
  });
});
