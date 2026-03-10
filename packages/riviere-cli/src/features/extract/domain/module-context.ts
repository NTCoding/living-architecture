import type { Project } from 'ts-morph'
import type { Module } from '@living-architecture/riviere-extract-config'

/** @riviere-role value-object */
export class ModuleContext {
  constructor(
    readonly module: Module,
    readonly files: string[],
    readonly project: Project,
  ) {}
}
