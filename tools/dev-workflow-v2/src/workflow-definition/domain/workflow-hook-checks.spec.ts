import {
  spec,
  eventsToSubmittingPr,
  eventsToReviewing,
  eventsToAwaitingCi,
  eventsToCheckingFeedback,
} from './fixtures/workflow-test-fixtures'

describe('Workflow', () => {
  describe('checkBashAllowed', () => {
    it('allows non-Bash tools', () => {
      const { result } = spec.given().when((wf) => wf.checkBashAllowed('Write', 'git push'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('allows safe commands in IMPLEMENTING', () => {
      const { result } = spec.given().when((wf) => wf.checkBashAllowed('Bash', 'npm test'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('blocks git push in IMPLEMENTING', () => {
      const { result } = spec
        .given()
        .when((wf) => wf.checkBashAllowed('Bash', 'git push origin main'))
      expect(result.pass).toBe(false)
    })

    it('blocks gh pr in IMPLEMENTING', () => {
      const { result } = spec.given().when((wf) => wf.checkBashAllowed('Bash', 'gh pr create'))
      expect(result.pass).toBe(false)
    })

    it('allows git push in SUBMITTING_PR (exempt via allowForbidden)', () => {
      const { result } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.checkBashAllowed('Bash', 'git push origin main'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('allows gh pr in SUBMITTING_PR (exempt via allowForbidden)', () => {
      const { result } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.checkBashAllowed('Bash', 'gh pr create'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('blocks --no-verify flag in any state', () => {
      const { result } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.checkBashAllowed('Bash', 'git commit --no-verify'))
      expect(result.pass).toBe(false)
    })

    it('blocks --force flag in any state', () => {
      const { result } = spec.given().when((wf) => wf.checkBashAllowed('Bash', 'git push --force'))
      expect(result.pass).toBe(false)
    })

    it('blocks --hard flag in any state', () => {
      const { result } = spec.given().when((wf) => wf.checkBashAllowed('Bash', 'git reset --hard'))
      expect(result.pass).toBe(false)
    })

    it('appends bash-checked event with allowed=true for safe command', () => {
      const { events } = spec.given().when((wf) => wf.checkBashAllowed('Bash', 'npm test'))
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'bash-checked',
        tool: 'Bash',
        command: 'npm test',
        allowed: true,
      })
    })

    it('appends bash-checked event with allowed=false and reason when blocked', () => {
      const { events } = spec
        .given()
        .when((wf) => wf.checkBashAllowed('Bash', 'git push origin main'))
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'bash-checked',
        tool: 'Bash',
        command: 'git push origin main',
        allowed: false,
        reason: expect.stringContaining('IMPLEMENTING'),
      })
    })

    it('blocks git push in REVIEWING', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.checkBashAllowed('Bash', 'git push origin main'))
      expect(result.pass).toBe(false)
    })

    it('allows gh pr checks in AWAITING_CI (exempt via allowForbidden)', () => {
      const { result } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.checkBashAllowed('Bash', 'gh pr checks 99'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('blocks gh pr create in AWAITING_CI', () => {
      const { result } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.checkBashAllowed('Bash', 'gh pr create'))
      expect(result.pass).toBe(false)
    })

    it('blocks chained commands after exempt command in AWAITING_CI', () => {
      const { result } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.checkBashAllowed('Bash', 'gh pr checks 99 && gh pr merge 99'))
      expect(result.pass).toBe(false)
    })

    it('blocks semicolon-chained commands after exempt command', () => {
      const { result } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.checkBashAllowed('Bash', 'gh pr checks 99; gh pr merge 99'))
      expect(result.pass).toBe(false)
    })

    it('allows gh pr view in CHECKING_FEEDBACK (exempt via allowForbidden)', () => {
      const { result } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.checkBashAllowed('Bash', 'gh pr view 99 --json reviews,comments'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('blocks gh pr create in CHECKING_FEEDBACK', () => {
      const { result } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.checkBashAllowed('Bash', 'gh pr create'))
      expect(result.pass).toBe(false)
    })
  })

  describe('checkWriteAllowed', () => {
    it('allows writes to normal files', () => {
      const { result } = spec.given().when((wf) => wf.checkWriteAllowed('/src/foo.ts'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('blocks writes to nx.json', () => {
      const { result } = spec.given().when((wf) => wf.checkWriteAllowed('/project/nx.json'))
      expect(result.pass).toBe(false)
      expect(result).toMatchObject({ reason: expect.stringContaining('nx.json') })
    })

    it('blocks writes to tsconfig.base.json', () => {
      const { result } = spec
        .given()
        .when((wf) => wf.checkWriteAllowed('/project/tsconfig.base.json'))
      expect(result.pass).toBe(false)
    })

    it('blocks writes to eslint.config.mjs', () => {
      const { result } = spec
        .given()
        .when((wf) => wf.checkWriteAllowed('/project/eslint.config.mjs'))
      expect(result.pass).toBe(false)
    })

    it('blocks writes to vitest.config.ts', () => {
      const { result } = spec
        .given()
        .when((wf) => wf.checkWriteAllowed('/project/vitest.config.ts'))
      expect(result.pass).toBe(false)
    })

    it('blocks writes to vite.config.ts', () => {
      const { result } = spec.given().when((wf) => wf.checkWriteAllowed('/project/vite.config.ts'))
      expect(result.pass).toBe(false)
    })

    it('allows writes to project-level tsconfig.json', () => {
      const { result } = spec
        .given()
        .when((wf) => wf.checkWriteAllowed('/project/packages/foo/tsconfig.json'))
      expect(result).toStrictEqual({ pass: true })
    })

    it('appends write-checked event', () => {
      const { events } = spec.given().when((wf) => wf.checkWriteAllowed('/src/foo.ts'))
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'write-checked',
        tool: 'Write',
        filePath: '/src/foo.ts',
        allowed: true,
      })
    })
  })
})
