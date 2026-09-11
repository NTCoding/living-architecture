import type { ExtendingDraftModuleInput, StandaloneDraftModule } from './extraction-config-schema'
import type { ModuleDefaults } from './module-defaults'

/** @riviere-role value-object */
export class ExtendingDraftModule {
  declare private readonly brand: 'ExtendingDraftModule'

  static from(input: Readonly<ExtendingDraftModuleInput>): ExtendingDraftModule {
    return new ExtendingDraftModule(input)
  }

  private constructor(private readonly input: ExtendingDraftModuleInput) {}

  merge(inherited: ModuleDefaults): StandaloneDraftModule {
    const module = this.input
    const mergedCustomTypes =
      inherited.customTypes === undefined && module.customTypes === undefined
        ? undefined
        : { ...inherited.customTypes, ...module.customTypes }
    return {
      name: module.name,
      domain: module.domain,
      path: module.path,
      glob: module.glob,
      ...(module.modules === undefined ? {} : { modules: module.modules }),
      api: module.api ?? inherited.api,
      useCase: module.useCase ?? inherited.useCase,
      domainOp: module.domainOp ?? inherited.domainOp,
      event: module.event ?? inherited.event,
      eventHandler: module.eventHandler ?? inherited.eventHandler,
      ui: module.ui ?? inherited.ui,
      ...(mergedCustomTypes === undefined ? {} : { customTypes: mergedCustomTypes }),
    }
  }
}
