import {
  describe, it, expect 
} from 'vitest'
import { ComponentIndex } from '../component-index'
import { buildCallGraph } from './build-call-graph'
import {
  sharedProject, nextFile, buildComponent, defaultOptions 
} from './call-graph-fixtures'

describe('buildCallGraph coverage - receiver resolution', () => {
  it('skips call when receiver has no property access in source method', () => {
    const file = nextFile(`
class BCTarget1 {
  run(): void {}
}

function standalone(): void {}

class BCCaller1 {
  private target: BCTarget1
  constructor(target: BCTarget1) { this.target = target }
  execute(): void {
    standalone()
    this.target.run()
  }
}
`)
    const compTarget = buildComponent('BCTarget1', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('BCCaller1', file, 8)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compCaller], index, defaultOptions())

    expect(result).toHaveLength(1)
  })

  it('skips call when receiver type has no symbol in source method', () => {
    const file = nextFile(`
class BCTarget2 {
  run(): void {}
}

class BCCaller2 {
  private target: BCTarget2
  constructor(target: BCTarget2) { this.target = target }
  execute(): void {
    (42).toString()
    this.target.run()
  }
}
`)
    const compTarget = buildComponent('BCTarget2', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('BCCaller2', file, 6)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compCaller], index, defaultOptions())

    expect(result).toHaveLength(1)
  })

  it('skips call when receiver type is undefined after resolution', () => {
    const file = nextFile(`
class BCTarget3 {
  run(): void {}
}

class BCCaller3 {
  private target: BCTarget3
  constructor(target: BCTarget3) { this.target = target }
  execute(): void {
    globalThis.setTimeout(() => {}, 0)
    this.target.run()
  }
}
`)
    const compTarget = buildComponent('BCTarget3', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('BCCaller3', file, 6)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compCaller], index, defaultOptions())

    expect(result).toHaveLength(1)
  })

  it('skips non-property-access call during non-component tracing', () => {
    const file = nextFile(`
class TCTarget1 {
  run(): void {}
}

function tcLog(): void {}

class TCMiddle1 {
  private target: TCTarget1
  constructor(target: TCTarget1) { this.target = target }
  go(): void {
    tcLog()
    this.target.run()
  }
}

class TCCaller1 {
  private mid: TCMiddle1
  constructor(mid: TCMiddle1) { this.mid = mid }
  execute(): void { this.mid.go() }
}
`)
    const compTarget = buildComponent('TCTarget1', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('TCCaller1', file, 17)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compCaller], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:tccaller1',
        target: 'orders:orders-module:domainOp:tctarget1',
      }),
    ])
  })

  it('does not throw on bare function call during non-component tracing in strict mode', () => {
    const file = nextFile(`
class StrictTarget {
  run(): void {}
}

class StrictMiddle {
  private target: StrictTarget
  constructor(target: StrictTarget) { this.target = target }
  go(): void {
    fetch('https://example.com')
    this.target.run()
  }
}

class StrictCaller {
  private mid: StrictMiddle
  constructor(mid: StrictMiddle) { this.mid = mid }
  execute(): void { this.mid.go() }
}
`)
    const compTarget = buildComponent('StrictTarget', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('StrictCaller', file, 15)
    const index = new ComponentIndex([compTarget, compCaller])
    const strictOptions = {
      ...defaultOptions(),
      strict: true,
    }

    expect(() => buildCallGraph(sharedProject, [compCaller], index, strictOptions)).not.toThrow()

    const result = buildCallGraph(sharedProject, [compCaller], index, strictOptions)
    expect(result).toStrictEqual([
      expect.objectContaining({
        source: expect.stringContaining('strictcaller'),
        target: expect.stringContaining('stricttarget'),
      }),
    ])
  })

  it('skips unresolvable-typed call during non-component tracing', () => {
    const file = nextFile(`
class AnyTarget {
  run(): void {}
}

class AnyMiddle {
  private target: AnyTarget
  private helper: any
  constructor(target: AnyTarget, helper: any) { this.target = target; this.helper = helper }
  go(): void {
    this.helper.doSomething()
    this.target.run()
  }
}

class AnyCaller {
  private mid: AnyMiddle
  constructor(mid: AnyMiddle) { this.mid = mid }
  execute(): void { this.mid.go() }
}
`)
    const compTarget = buildComponent('AnyTarget', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('AnyCaller', file, 16)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compCaller], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: expect.stringContaining('anycaller'),
        target: expect.stringContaining('anytarget'),
      }),
    ])
  })

  it('skips call with no symbol during non-component tracing', () => {
    const file = nextFile(`
class TCTarget2 {
  run(): void {}
}

class TCMiddle2 {
  private target: TCTarget2
  constructor(target: TCTarget2) { this.target = target }
  go(): void {
    (42).toString()
    this.target.run()
  }
}

class TCCaller2 {
  private mid: TCMiddle2
  constructor(mid: TCMiddle2) { this.mid = mid }
  execute(): void { this.mid.go() }
}
`)
    const compTarget = buildComponent('TCTarget2', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('TCCaller2', file, 15)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compCaller], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:tccaller2',
        target: 'orders:orders-module:domainOp:tctarget2',
      }),
    ])
  })

  it('skips non-component class with matching name but no matching method during trace', () => {
    const file = nextFile(`
class TCNoMethodTarget {
  run(): void {}
}

class TCNoMethodMid {
  doStuff(): void {}
}

class TCNoMethodCaller {
  private mid: TCNoMethodMid
  constructor(mid: TCNoMethodMid) { this.mid = mid }
  execute(): void { this.mid.nonExistent() }
}
`)
    const compTarget = buildComponent('TCNoMethodTarget', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('TCNoMethodCaller', file, 10)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compCaller], index, defaultOptions())

    expect(result).toStrictEqual([])
  })
})

describe('buildCallGraph coverage', () => {
  it('skips component when source file not found in project', () => {
    const comp = buildComponent('NonExistentClass', '/src/missing-file.ts', 1)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())
    expect(result).toStrictEqual([])
  })

  it('skips call expression when receiver has no property access', () => {
    const file = nextFile(`
class CovTarget {
  run(): void {}
}

class CovCaller {
  private target: CovTarget
  constructor(target: CovTarget) { this.target = target }
  execute(): void {
    console.log('hello')
    this.target.run()
  }
}
`)
    const compTarget = buildComponent('CovTarget', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('CovCaller', file, 6)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compTarget, compCaller], index, defaultOptions())

    expect(result).toHaveLength(1)
  })

  it('skips tracing when non-component class has no matching method', () => {
    const file = nextFile(`
class CovTarget2 {
  run(): void {}
}

class CovMiddle {
  doStuff(): void {}
}

class CovCaller2 {
  private mid: CovMiddle
  constructor(mid: CovMiddle) { this.mid = mid }
  execute(): void {
    this.mid.nonExistentMethod()
  }
}
`)
    const compTarget = buildComponent('CovTarget2', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('CovCaller2', file, 10)
    const index = new ComponentIndex([compTarget, compCaller])
    const result = buildCallGraph(sharedProject, [compTarget, compCaller], index, defaultOptions())
    expect(result).toStrictEqual([])
  })

  it('skips self-link during transitive tracing', () => {
    const file = nextFile(`
class CovSelfComp {
  helper(): void {}
}

class CovMid {
  private comp: CovSelfComp
  constructor(comp: CovSelfComp) { this.comp = comp }
  go(): void { this.comp.helper() }
}

class CovSelfSource {
  private mid: CovMid
  constructor(mid: CovMid) { this.mid = mid }
  execute(): void { this.mid.go() }
}
`)
    const compSource = buildComponent('CovSelfSource', file, 12)
    const compTarget = buildComponent('CovSelfComp', file, 2, { type: 'domainOp' })
    const index = new ComponentIndex([compSource, compTarget])
    const result = buildCallGraph(sharedProject, [compSource], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:covselfsource',
        target: 'orders:orders-module:domainOp:covselfcomp',
      }),
    ])
  })

  it('avoids infinite loop when tracing visits same non-component twice', () => {
    const file = nextFile(`
class CovNC4Target {
  run(): void {}
}

class CovNC4Helper {
  private target: CovNC4Target
  constructor(target: CovNC4Target) { this.target = target }
  step(): void { this.target.run() }
}

class CovNC4Router {
  private helper: CovNC4Helper
  constructor(helper: CovNC4Helper) { this.helper = helper }
  route(): void {
    this.helper.step()
    this.helper.step()
  }
}

class CovNC4Origin {
  private router: CovNC4Router
  constructor(router: CovNC4Router) { this.router = router }
  execute(): void { this.router.route() }
}
`)
    const compTarget = buildComponent('CovNC4Target', file, 2, { type: 'domainOp' })
    const compOrigin = buildComponent('CovNC4Origin', file, 21)
    const index = new ComponentIndex([compTarget, compOrigin])
    const result = buildCallGraph(sharedProject, [compOrigin], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:covnc4origin',
        target: 'orders:orders-module:domainOp:covnc4target',
      }),
    ])
  })

  it('emits uncertain link during tracing when interface defined in source has no implementation', () => {
    const file = nextFile(`
interface TCNotifier {
  notify(): void
}

class TCMiddleNotify {
  private notifier: TCNotifier
  constructor(notifier: TCNotifier) { this.notifier = notifier }
  go(): void {
    this.notifier.notify()
  }
}

class TCCallerNotify {
  private mid: TCMiddleNotify
  constructor(mid: TCMiddleNotify) { this.mid = mid }
  execute(): void { this.mid.go() }
}
`)
    const comp = buildComponent('TCCallerNotify', file, 14)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:tccallernotify',
        target: '_unresolved',
        _uncertain: expect.stringContaining('No implementation found for TCNotifier'),
      }),
    ])
  })

  it('skips transitive trace self-link when source component is the target', () => {
    const file = nextFile(`
class CovSelfComp3 {
  doWork(): void {}
  execute(): void { this.mid.go() }
  private mid: CovSelfMid3
  constructor(mid: CovSelfMid3) { this.mid = mid }
}

class CovSelfMid3 {
  private caller: CovSelfComp3
  constructor(caller: CovSelfComp3) { this.caller = caller }
  go(): void { this.caller.doWork() }
}
`)
    const comp = buildComponent('CovSelfComp3', file, 2)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())

    expect(result).toStrictEqual([])
  })
})
