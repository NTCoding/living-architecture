import {
  Project, ScriptTarget, ModuleKind 
} from 'ts-morph'

export function createProject(): Project {
  return new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      strict: true,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
    },
  })
}
