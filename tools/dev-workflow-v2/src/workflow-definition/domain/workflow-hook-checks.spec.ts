import {
  spec, eventsToSubmittingPr, eventsToVerifying 
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

    it('blocks git push in VERIFYING', () => {
      const { result } = spec
        .given(...eventsToVerifying())
        .when((wf) => wf.checkBashAllowed('Bash', 'git push origin main'))
      expect(result.pass).toBe(false)
    })
  })

  describe('verifyIdentity', () => {
    it('always returns pass', () => {
      const { result } = spec.given().when((wf) => wf.verifyIdentity('/test-output/transcript'))
      expect(result).toStrictEqual({ pass: true })
    })
  })
})
