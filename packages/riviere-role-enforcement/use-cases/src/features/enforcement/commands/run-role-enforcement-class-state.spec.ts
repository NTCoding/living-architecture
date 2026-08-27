import { expect, it } from 'vitest'
import { configWithGenericClassStateConstraints } from './__fixtures__/class-state-test-fixture-config'
import {
  configWithPrivateDataMembers,
  configWithReadonlyDataMembers,
  genericTestConfig,
} from './__fixtures__/test-fixture-config'
import {
  runTestRoleEnforcement,
  withGenericFixtureWorkspace,
  writeDomainFile,
} from './__fixtures__/test-fixture-workspace'

function runWith(config: typeof genericTestConfig, workspaceDir: string) {
  return runTestRoleEnforcement(config, workspaceDir)
}

it('rejects classes with callable instance data members when role forbids them', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  readonly label = 'beta'
  readonly matches: () => boolean = () => true

  static parse(): Beta {
    return new Beta()
  }
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain("forbids callable instance data members on 'Beta'")
    expect(result.stdout).toContain('Found [matches]')
  })
})

it('rejects classes without non-callable instance data members when role requires them', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'

  static parse(): Beta {
    return new Beta()
  }
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain(
      "requires at least one non-callable instance data member on 'Beta'",
    )
  })
})

it('accepts classes with non-callable instance data members when role requires them', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  private constructor(readonly label: string) {}

  static parse(label: string): Beta {
    return new Beta(label)
  }

  cancel(): void {}
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts normal instance methods when callable instance data members are forbidden', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  private constructor(readonly label: string) {}

  static parse(label: string): Beta {
    return new Beta(label)
  }

  rename(): Beta {
    return new Beta(this.label)
  }
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects public aggregate state and accepts private aggregate state', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  readonly label = 'beta'
  private readonly secret = 'secret'
  static readonly category = 'test'

  rename(): void {}
}
`,
    )
    const result = runWith(configWithPrivateDataMembers(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain("requires private instance data members on 'Beta'")
    expect(result.stdout).toContain('Found [label]')
  })
})

it('accepts private aggregate state and static fields', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly label = 'beta'
  static readonly category = 'test'

  rename(): void {}
}
`,
    )
    const result = runWith(configWithPrivateDataMembers(), workspaceDir)
    expect(result.exitCode).toBe(0)
  })
})

it('rejects mutable instance fields when the role requires readonly data members', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private label = 'beta'
}
`,
    )
    const result = runWith(configWithReadonlyDataMembers(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain("requires readonly instance data members on 'Beta'")
    expect(result.stdout).toContain('Found [label]')
  })
})

it('rejects mutable constructor parameter properties when the role requires readonly data members', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  constructor(private label: string) {}
}
`,
    )
    const result = runWith(configWithReadonlyDataMembers(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain("requires readonly instance data members on 'Beta'")
    expect(result.stdout).toContain('Found [label]')
  })
})

it('accepts readonly fields, readonly parameter properties, and classes without data members', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly label = 'beta'

  constructor(private readonly id: string) {}
}

/** @riviere-role role-b */
export class EmptyBeta {}
`,
    )
    const result = runWith(configWithReadonlyDataMembers(), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects a class without a static factory method beginning with an allowed prefix', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  readonly label = 'beta'

  static create(): Beta {
    return new Beta()
  }
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain(
      "requires at least one static factory method beginning with one of 'parse', 'from' on 'Beta'",
    )
  })
})

it('accepts multiple static factory methods beginning with allowed prefixes', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  private constructor(readonly label: string) {}

  static parse(label: string): Beta {
    return new Beta(label)
  }

  static fromLabel(label: string): Beta {
    return new Beta(label)
  }
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it.each(['parseDefault', 'fromDefault'])(
  "rejects zero-parameter static factory method '%s'",
  (factoryMethodName) => {
    withGenericFixtureWorkspace((workspaceDir) => {
      writeDomainFile(
        workspaceDir,
        `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  readonly label = 'beta'

  private constructor() {}

  static ${factoryMethodName}(): Beta {
    return new Beta()
  }
}
`,
      )
      const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain(
        `requires static factory method '${factoryMethodName}' on 'Beta' to accept at least one parameter`,
      )
    })
  },
)

it('rejects a class with a public constructor when the role requires a private constructor', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  readonly label: string

  constructor(label: string) {
    this.label = label
  }

  static parse(label: string): Beta {
    return new Beta(label)
  }
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain("requires a private constructor on 'Beta'")
  })
})

it('accepts a class with a private constructor when the role requires it', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  readonly label: string

  private constructor(label: string) {
    this.label = label
  }

  static parse(label: string): Beta {
    return new Beta(label)
  }
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})
