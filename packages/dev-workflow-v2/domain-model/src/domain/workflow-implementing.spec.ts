import {
  spec,
  makeDeps,
  eventsToReviewing,
  buildTestWorkflow,
  TEST_WORKFLOW_REGISTRY,
} from './__fixtures__/workflow-test-fixtures'

describe('Workflow', () => {
  describe('createFresh', () => {
    it('creates a workflow in IMPLEMENTING state with empty pending events', () => {
      const wf = buildTestWorkflow(makeDeps())
      expect(wf.getState().currentStateMachineState).toBe('IMPLEMENTING')
      expect(wf.getPendingEvents()).toHaveLength(0)
      expect(wf.registry()).not.toBe(TEST_WORKFLOW_REGISTRY)
      expect(wf.registry().IMPLEMENTING).toBe(TEST_WORKFLOW_REGISTRY.IMPLEMENTING)
    })
  })

  describe('startSession', () => {
    it('appends session-started event with repository', () => {
      const { events } = spec.given().when((wf) => wf.startSession('', 'owner/repo'))
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'session-started',
        repository: 'owner/repo',
        transcriptPath: '',
      })
    })

    it('appends session-started event without repository when undefined', () => {
      const { events } = spec.given().when((wf) => wf.startSession('', undefined))
      expect(events).toHaveLength(1)
      expect(events[0]).not.toHaveProperty('repository')
      expect(events[0]).toHaveProperty('transcriptPath', '')
    })
  })

  describe('getAgentInstructions', () => {
    it('returns path from registry agentInstructions field', () => {
      const { result } = spec.given().when((wf) => wf.getAgentInstructions('/plugin'))
      expect(result).toBe('/plugin/states/implementing.md')
    })
  })

  describe('getTranscriptPath', () => {
    it('throws when session has not been started', () => {
      const wf = buildTestWorkflow(makeDeps())
      expect(() => wf.getTranscriptPath()).toThrow(
        'Transcript path not set. Session has not been started.',
      )
    })

    it('returns transcript path after session started', () => {
      const { result } = spec.given().when((wf) => {
        wf.startSession('some/path', undefined)
        return wf.getTranscriptPath()
      })
      expect(result).toBe('some/path')
    })
  })

  describe('registerAgent', () => {
    it('returns pass (no-op for single-agent workflow)', () => {
      const { result, events } = spec.given().when((wf) => wf.registerAgent('lead', 'agent-1'))
      expect(result).toStrictEqual({ pass: true })
      expect(events).toHaveLength(0)
    })
  })

  describe('handleTeammateIdle', () => {
    it('returns pass (no-op for single-agent workflow)', () => {
      const { result, events } = spec.given().when((wf) => wf.handleTeammateIdle('agent-1'))
      expect(result).toStrictEqual({ pass: true })
      expect(events).toHaveLength(0)
    })
  })

  describe('review records', () => {
    it('returns current reviews and rejects an unknown review detail', () => {
      const workflow = buildTestWorkflow(makeDeps())
      expect(workflow.getRecordedReviews()).toStrictEqual([])
      expect(workflow.getLatestReviewByType('code-review')).toBeUndefined()
      expect(() => workflow.getReviewDetails(1)).toThrow('Review 1 not found')
    })

    it('finds the latest review of a type', () => {
      const workflow = buildTestWorkflow(
        makeDeps({
          listSessionReviews: () => [
            {
              id: 1,
              sessionId: 'session',
              createdAt: '2026-01-01T00:00:00Z',
              reviewType: 'code-review',
              sourceState: 'REVIEWING',
              verdict: 'PASS',
              summary: 'first',
              findings: [],
            },
            {
              id: 2,
              sessionId: 'session',
              createdAt: '2026-01-02T00:00:00Z',
              reviewType: 'code-review',
              sourceState: 'REVIEWING',
              verdict: 'PASS',
              summary: 'latest',
              findings: [],
            },
          ],
        }),
      )
      expect(workflow.getReviewDetails(1).summary).toBe('first')
      expect(workflow.getLatestReviewByType('code-review')?.id).toBe(2)
    })
  })

  describe('IMPLEMENTING state', () => {
    it('sets githubIssue when record-issue succeeds', () => {
      const { result, state, events } = spec
        .given()
        .when((wf) => wf.executeRecording('record-issue', 42))
      expect(result).toStrictEqual({ pass: true })
      expect(state.githubIssue).toBe(42)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'issue-recorded',
            issueNumber: 42,
          }),
        ]),
      )
    })

    it('fails record-issue in non-IMPLEMENTING states', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-issue', 42))
      expect(result.pass).toBe(false)
    })

    it('sets featureBranch when record-branch succeeds', () => {
      const { result, state, events } = spec
        .given()
        .when((wf) => wf.executeRecording('record-branch', 'feature/x'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.featureBranch).toBe('feature/x')
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'branch-recorded',
            branch: 'feature/x',
          }),
        ]),
      )
    })

    it('fails record-branch in non-IMPLEMENTING states', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-branch', 'feature/x'))
      expect(result.pass).toBe(false)
    })
  })

  describe('REVIEWING state', () => {
    it('records a named reviewer status only while reviewing', () => {
      const { result, state } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordReviewerStatus('code-review', 'OPEN_FEEDBACK'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.reviewerStatuses['code-review']).toBe('OPEN_FEEDBACK')
    })

    it('rejects reviewer status recording outside reviewing', () => {
      const workflow = buildTestWorkflow(makeDeps())
      expect(workflow.recordReviewerStatus('code-review', 'APPROVED').pass).toBe(false)
    })
  })

  describe('getPullRequestNumber', () => {
    it('throws when no pull request has been recorded', () => {
      const workflow = buildTestWorkflow(makeDeps())
      expect(() => workflow.getPullRequestNumber()).toThrow(
        'Workflow has no recorded pull request.',
      )
    })

    it('returns the pull request number after recording', () => {
      const { result } = spec.given().when((wf) => {
        wf.recordPullRequest(99, 'https://github.com/example/repo/pull/99')
        return wf.getPullRequestNumber()
      })
      expect(result).toBe(99)
    })
  })

  describe('getSubmissionDetails', () => {
    it('throws when no issue or branch has been recorded', () => {
      const workflow = buildTestWorkflow(makeDeps())
      expect(() => workflow.getSubmissionDetails()).toThrow(
        'Workflow is not ready to submit a pull request.',
      )
    })

    it('returns submission details when issue and branch are recorded', () => {
      const { result } = spec.given().when((wf) => {
        wf.executeRecording('record-issue', 42)
        wf.executeRecording('record-branch', 'issue-42')
        return wf.getSubmissionDetails()
      })
      expect(result).toStrictEqual({ githubIssue: 42, featureBranch: 'issue-42' })
    })
  })

  describe('recordPullRequest', () => {
    it('records a pull request and updates the state', () => {
      const { result, state, events } = spec
        .given()
        .when((wf) => wf.recordPullRequest(99, 'https://github.com/example/repo/pull/99'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.prNumber).toBe(99)
      expect(state.prUrl).toBe('https://github.com/example/repo/pull/99')
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'pr-recorded',
            prNumber: 99,
            prUrl: 'https://github.com/example/repo/pull/99',
          }),
        ]),
      )
    })
  })

  describe('transition', () => {
    it('transitions to a legal target state', () => {
      const { result, state, events } = spec
        .given(
          ...eventsToReviewing().slice(0, 0),
          {
            type: 'issue-recorded',
            at: '2026-01-01T00:00:00Z',
            issueNumber: 42,
          },
          {
            type: 'branch-recorded',
            at: '2026-01-01T00:00:00Z',
            branch: 'issue-42',
          },
        )
        .when((wf) => wf.transition('SUBMITTING_PR'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('SUBMITTING_PR')
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'transitioned',
            from: 'IMPLEMENTING',
            to: 'SUBMITTING_PR',
          }),
        ]),
      )
    })

    it('rejects an illegal transition', () => {
      const { result } = spec.given().when((wf) => wf.transition('REVIEWING'))
      expect(result).toStrictEqual({
        pass: false,
        reason: 'Illegal transition IMPLEMENTING -> REVIEWING.',
      })
    })

    it('rejects a legal transition when its guard fails before recording an event', () => {
      const workflow = buildTestWorkflow(
        makeDeps({
          getGitInfo: () => ({
            currentBranch: 'issue-42',
            workingTreeClean: false,
            headCommit: 'abc123',
            changedFilesVsDefault: ['src/test.ts'],
            hasCommitsVsDefault: true,
          }),
        }),
      )
      workflow.executeRecording('record-issue', 42)
      workflow.executeRecording('record-branch', 'issue-42')
      const result = workflow.transition('SUBMITTING_PR')
      expect(result).toStrictEqual({
        pass: false,
        reason: 'Working tree is not clean. Commit all changes before transitioning.',
      })
      expect(workflow.getPendingEvents()).toHaveLength(2)
      expect(workflow.getState().currentStateMachineState).toBe('IMPLEMENTING')
    })

    it('records a legal transition for a state without a guard', () => {
      const workflow = buildTestWorkflow(makeDeps())
      workflow.executeRecording('record-issue', 42)
      workflow.executeRecording('record-branch', 'issue-42')
      expect(workflow.transition('SUBMITTING_PR')).toStrictEqual({ pass: true })
      workflow.recordPullRequest(99, 'https://example.test/pr/99')
      expect(workflow.transition('REVIEWING')).toStrictEqual({ pass: true })
      for (const reviewer of [
        'architecture-review',
        'code-review',
        'bug-scanner',
        'task-check',
        'coderabbit',
      ] as const)
        workflow.recordReviewerStatus(reviewer, 'APPROVED')
      expect(workflow.transition('HUMAN_REVIEWING')).toStrictEqual({ pass: true })
      expect(workflow.transition('BLOCKED')).toStrictEqual({ pass: true })
    })
  })

  describe('reviewOutcome', () => {
    it('returns APPROVED when every reviewer is approved', () => {
      const { result } = spec.given(...eventsToReviewing()).when((wf) => {
        for (const reviewer of [
          'architecture-review',
          'code-review',
          'bug-scanner',
          'task-check',
          'coderabbit',
        ] as const)
          wf.recordReviewerStatus(reviewer, 'APPROVED')
        return wf.reviewOutcome()
      })
      expect(result).toBe('APPROVED')
    })

    it('returns OPEN_FEEDBACK when any reviewer has open feedback', () => {
      const { result } = spec.given(...eventsToReviewing()).when((wf) => {
        wf.recordReviewerStatus('code-review', 'OPEN_FEEDBACK')
        return wf.reviewOutcome()
      })
      expect(result).toBe('OPEN_FEEDBACK')
    })

    it('returns PENDING when a reviewer has not responded', () => {
      const { result } = spec.given(...eventsToReviewing()).when((wf) => wf.reviewOutcome())
      expect(result).toBe('PENDING')
    })

    it('ignores CodeRabbit when asked', () => {
      const { result } = spec.given(...eventsToReviewing()).when((wf) => {
        wf.recordReviewerStatus('coderabbit', 'OPEN_FEEDBACK')
        for (const reviewer of [
          'architecture-review',
          'code-review',
          'bug-scanner',
          'task-check',
        ] as const)
          wf.recordReviewerStatus(reviewer, 'APPROVED')
        return wf.reviewOutcome({ ignoreCodeRabbit: true })
      })
      expect(result).toBe('APPROVED')
    })
  })
})
