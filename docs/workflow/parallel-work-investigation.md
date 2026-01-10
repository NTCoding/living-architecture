# Parallel Work Investigation

**Issue:** #112

---

## Current End-to-End Process

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRD LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                               │
│  │  CREATE  │───▶│ ACTIVATE │───▶│  TASKS   │                               │
│  │   PRD    │    │   PRD    │    │ CREATED  │                               │
│  └──────────┘    └──────────┘    └──────────┘                               │
│       │                               │                                      │
│       ▼                               ▼                                      │
│  docs/project/              ./scripts/create-task.sh                        │
│  PRD/notstarted/            (one task per deliverable)                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TASK LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │   LIST   │───▶│  SELECT  │───▶│  START   │───▶│IMPLEMENT │              │
│  │  TASKS   │    │   TASK   │    │   TASK   │    │          │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │               │               │               │                     │
│       ▼               ▼               ▼               ▼                     │
│  list-tasks.sh   Agent picks    start-task.sh    Code, test,               │
│  (shows open,    first one      (worktree,       build                     │
│   unassigned)                    assign)                                    │
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ COMPLETE │───▶│    PR    │───▶│  MERGE   │───▶│  POST-   │              │
│  │   TASK   │    │  REVIEW  │    │          │    │  MERGE   │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │               │               │               │                     │
│       ▼               ▼               ▼               ▼                     │
│  /complete-task  Human reviews   Squash merge   cleanup-task.sh            │
│  (verify, PR)    in GitHub                      (remove worktree)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRD COMPLETION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  When all tasks done:  ./scripts/archive-prd.sh                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Parallelism Opportunities at Each Step

### 1. CREATE PRD

**Current state:** PRDs are written sequentially. One PRD is drafted, reviewed, approved.

**Parallel approaches:**

| Approach | How It Works |
|----------|--------------|
| **Multiple PRDs in flight** | Have 2-3 PRDs at different stages (one in planning, one active, one wrapping up). Allows agents to pull from different streams. |
| **Parallel PRD sections** | Different people/agents draft different milestones simultaneously. Merge into single PRD. |

**Applicable tools:** None specific. Process change.

---

### 2. ACTIVATE PRD

**Current state:** Only one PRD active at a time. Single stream of work.

**Parallel approaches:**

| Approach | How It Works |
|----------|--------------|
| **Multiple active PRDs** | Allow 2+ PRDs active simultaneously. Agents pick from either. Requires PRDs to touch different code areas. |
| **PRD + non-PRD mix** | Explicitly allow agents to work non-PRD tasks (bugs, tech debt) when PRD tasks are blocked or sequential. |

**Applicable tools:** None specific. Process change.

---

### 3. TASKS CREATED

**Current state:** Tasks created from PRD deliverables. Dependencies documented as text (`Depends on #X`). Tasks often touch same code areas.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Dependency-aware creation** | Machine-readable dependencies, not prose. Explicit `dependsOn: [taskId]` field. | [Claude Task Master](https://github.com/eyaltoledano/claude-task-master) |
| **File-boundary tasks** | Each task explicitly lists files it will modify. Tasks touching same files = sequential. Different files = parallel. | [Multi-agent orchestration](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) |
| **Domain-sliced tasks** | Split by domain/package, not by layer. `orders` domain tasks separate from `shipping` domain tasks. | Vertical slicing pattern |
| **Topological sorting** | Auto-calculate task order from dependency graph. Surface parallelizable groups. | [Claude Task Master `fix-dependencies`](https://github.com/eyaltoledano/claude-task-master) |

---

### 4. LIST TASKS

**Current state:** `list-tasks.sh` shows all open unassigned tasks. No indication of which are blocked vs ready. Agent must check each task's dependencies manually.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Ready queue** | Only show tasks with all dependencies satisfied. Hide blocked tasks. | [Claude Task Master `next`](https://github.com/eyaltoledano/claude-task-master) |
| **Grouped by parallelizability** | Show tasks grouped: "Can run in parallel: #45, #69, #101" vs "Sequential chain: #48 → #49 → #50" | Custom |
| **Unified view** | Single command shows PRD tasks + bugs + tech debt + ideas. All sources, one list. | Custom |
| **Conflict detection** | Mark tasks that touch same files. Agent knows "#45 and #46 conflict" before starting. | [File locking pattern](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) |

---

### 5. SELECT TASK

**Current state:** Agent picks first task from list. No guidance on parallel-safe selection. No awareness of what other agents are working on.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Auto-assignment** | System assigns next ready task to requesting agent. No picking. | [Vibe Kanban](https://byteiota.com/vibe-kanban-manage-ai-coding-agents-in-parallel/) |
| **Claim mechanism** | Agent "claims" task before starting. Other agents see it's taken. | GitHub issue assignment (already exists) |
| **Conflict-aware selection** | System warns if selected task conflicts with in-progress work by other agents. | Custom |
| **Priority scoring** | Tasks scored by: dependencies cleared + priority level + age. Highest score = next. | [Claude Task Master](https://github.com/eyaltoledano/claude-task-master) |

---

### 6. START TASK

**Current state:** `start-task.sh` creates git worktree, assigns issue. Worktree enables parallel work mechanically.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Git worktrees** | Already implemented. Each agent gets isolated workspace. | Current system |
| **Tmux sessions** | Each task runs in named tmux session. Easy to monitor multiple agents. | [Parallel workflow note](https://worksfornow.pika.page/posts/note-to-a-friend-how-i-run-claude-code-agents-in-parallel) |
| **Container isolation** | Each agent runs in Docker container. Full isolation including dependencies. | [Simon Willison](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) |

---

### 7. IMPLEMENT

**Current state:** Agent codes, tests, builds in isolation. No coordination with other agents.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **File locking** | Agent acquires lock on files before modifying. Other agents blocked from same files. | [Multi-agent orchestration](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) |
| **Subagent parallelism** | Single task splits into parallel subtasks: backend + frontend + tests simultaneously. | [Subagent parallelization](https://zachwills.net/how-to-use-claude-code-subagents-to-parallelize-development/) |
| **Shared context** | Agents share learned knowledge via shared memory/docs. Avoid re-discovering same things. | [Agentic patterns](https://www.marktechpost.com/2025/08/09/9-agentic-ai-workflow-patterns-transforming-ai-agents-in-2025/) |

---

### 8. COMPLETE TASK

**Current state:** `/complete-task` runs verify gate, code review, creates PR. Sequential within single agent.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Parallel review** | Multiple reviewer agents check different aspects (security, performance, style) simultaneously. | [Multi-agent coordination skill](https://claude-plugins.dev/skills/@MadAppGang/claude-code/multi-agent-coordination) |
| **Notify dependents** | When task completes, automatically notify blocked tasks they're now ready. | [Claude Task Master](https://github.com/eyaltoledano/claude-task-master) |

---

### 9. PR REVIEW

**Current state:** Human reviews PR in GitHub. Sequential bottleneck.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Batch review** | Review multiple independent PRs in single session. | [Simon Willison](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) |
| **Tiered review** | Low-stakes PRs get lighter review. High-stakes get deep review. Throughput increases. | [Simon Willison](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) |
| **Pre-review by agent** | Agent does thorough self-review before human sees it. Human reviews agent's review. | Current `/complete-task` already does this |

---

### 10. MERGE

**Current state:** Squash merge to main. Sequential.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Merge queue** | PRs queue for merge. CI runs on merged result before actual merge. Catches conflicts early. | GitHub merge queue |
| **Fast-forward only** | Require rebase before merge. Ensures clean history but adds friction. | Git workflow |

---

### 11. POST-MERGE

**Current state:** `/post-merge-completion` reflects on feedback, creates improvement issues. `cleanup-task.sh` removes worktree.

**Parallel approaches:**

| Approach | How It Works | Source |
|----------|--------------|--------|
| **Trigger dependents** | Merge triggers blocked tasks to become ready. System notifies waiting agents. | [Claude Task Master](https://github.com/eyaltoledano/claude-task-master) |
| **Parallel cleanup** | Multiple worktrees cleaned simultaneously. | Already possible |

---

## Summary: Key Gaps and Solutions

| Gap | Solution | Effort |
|-----|----------|--------|
| Tasks not designed for parallelism | Domain-sliced task creation with explicit file boundaries | High (process change) |
| Dependencies not machine-readable | Structured dependency field, not prose | Medium (tooling) |
| No "ready tasks" view | `list-parallel-tasks.sh` showing only unblocked work | Medium (new script) |
| No conflict detection | Track which files each task modifies | Medium (tooling) |
| Single PRD bottleneck | Allow multiple active PRDs or explicit PRD + non-PRD mixing | Low (process change) |
| No agent coordination | Claim mechanism + visibility into what others are working on | Medium (tooling) |

---

## Framework Comparison

### Task Management & Orchestration Frameworks

| Framework | Parallel Model | Dependency Handling | Task Structure | Key Differentiator |
|-----------|---------------|---------------------|----------------|-------------------|
| **[Claude Task Master](https://github.com/eyaltoledano/claude-task-master)** | Git worktrees + tmux | Explicit `dependsOn` field, `next` command finds ready tasks | PRD → Tasks with IDs | Dependency-aware `next` command |
| **[GitHub Spec Kit](https://github.com/github/spec-kit)** | Agent-agnostic | Tasks ordered by dependencies, parallel markers for concurrent tasks | Specify → Plan → Tasks → Implement (4-phase gated) | Spec-first, prevents drift |
| **[BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD)** | 19 specialized agents | Two-phase: planning agents create specs, dev agents implement | Agent-as-Code (markdown + YAML) | Role-based personas (Analyst, PM, Architect, Dev, QA) |
| **[Gas Town](https://github.com/steveyegge/gastown)** (Steve Yegge) | 20-30 agents via tmux | "Molecules" - sequenced small tasks with TODO checkpoints | 7 agent roles (Mayor, Polecats, Refinery, etc.) | Built on Beads framework, merge queue management |
| **[Claude Flow](https://github.com/ruvnet/claude-flow)** | Up to 10 concurrent agents | Stream-json chaining for agent-to-agent dependencies | 64-agent swarm system | Hive-mind swarm intelligence |
| **[Claude Squad](https://github.com/smtg-ai/claude-squad)** | Tmux sessions + git worktrees | None (assumes independent tasks) | Simple task isolation | Lightweight, tmux-native |
| **[Vibe Kanban](https://github.com/BloopAI/vibe-kanban)** | Git worktrees per task | Visual board (no explicit deps) | Kanban columns: planning → in progress → review → done | Visual management |

### IDE-Integrated Agents

| Framework | Parallel Model | Dependency Handling | Key Feature |
|-----------|---------------|---------------------|-------------|
| **[Cursor](https://cursor.sh)** (2.0) | Up to 8 concurrent agents | Independent workspaces | Mainstream IDE with multi-agent |
| **[Roo Code](https://github.com/RooCodeInc/Roo-Code)** | Custom modes per agent | Orchestrator mode coordinates | Extensible "Custom Modes" for specialized agents |
| **[Cline](https://cline.bot)** | Plan + Act modes | Sequential with approval gates | Open-source, model-agnostic |
| **[Devin](https://devin.ai)** (Cognition) | Multiple parallel Devins | Multi-agent dispatch, confidence evaluation | Integrated IDE + browser + shell |
| **[Aider](https://aider.chat)** | Git-native | Commit-based checkpoints | CLI-first, git integration |

### Multi-Agent Orchestration Frameworks

| Framework | Parallel Model | Dependency Handling | Use Case |
|-----------|---------------|---------------------|----------|
| **[LangGraph](https://www.langchain.com/langgraph)** | Graph-based (nodes = agents) | Edges define dependencies, topological execution | Complex stateful workflows |
| **[CrewAI](https://www.crewai.com)** | Role-based delegation | `allow_delegation`, hierarchical with `allowed_agents` | Team simulation with specialists |
| **[Microsoft AutoGen](https://github.com/microsoft/autogen)** | Async message passing | Supervisor pattern, Magentic orchestration | Enterprise multi-agent |
| **[OpenDevin](https://github.com/OpenDevin/OpenDevin)** | Task assigner dispatches to specialists | Specialized agents (code_editor, browser, command_line) | Open-source Devin alternative |

### Key Patterns Extracted

**1. Dependency-Aware Task Selection**
- Claude Task Master: `next` command identifies ready tasks
- GitHub Spec Kit: Parallel execution markers in task breakdown
- Gas Town: Molecules with sequential checkpoints

**2. Isolation Mechanisms**
- Git worktrees: Claude Squad, Vibe Kanban, Gas Town
- Tmux sessions: Claude Squad, Gas Town
- Containers: Devin (cloud IDE per agent)

**3. Spec-First Development**
- GitHub Spec Kit: 4-phase gated process
- BMAD: Planning agents create detailed specs before dev agents work
- Gas Town: Mayor coordinates overall direction

**4. Role-Based Specialization**
- BMAD: 19 specialized agents with distinct personas
- CrewAI: Hierarchical delegation with `allowed_agents`
- Gas Town: 7 distinct roles (Mayor, Polecats, Refinery, Witness, Deacon, Dogs, Crew)

---

## Sources

### Primary Research

1. **[Embracing the parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/)** - Simon Willison
   Task categories that work for parallel agents: research, understanding systems, low-stakes maintenance, carefully specified work. Emphasizes isolation via fresh checkouts and review bottleneck as constraint.

2. **[Claude Task Master](https://github.com/eyaltoledano/claude-task-master)** - Eyal Toledano
   Dependency-aware task management. `next` command identifies ready tasks. `fix-dependencies` uses AI to recalculate dependency chains. Integrates with Cursor, Windsurf, VS Code.

3. **[Multi-Agent Orchestration: Running 10+ Claude Instances in Parallel](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da)** - Brian Redmond
   Three-tier architecture: meta-agent, task queue (Redis), worker agents. Topological sorting for dependencies. File locking to prevent conflicts.

4. **[Multi-Agent Coordination Skill](https://claude-plugins.dev/skills/@MadAppGang/claude-code/multi-agent-coordination)** - MadAppGang
   4-message pattern for parallel execution. Sequential vs parallel execution models. File-based instructions to avoid context pollution.

5. **[Vibe Kanban](https://byteiota.com/vibe-kanban-manage-ai-coding-agents-in-parallel/)** - BloopAI
   Kanban board interface for agent management. Git worktrees per task. Visual task status tracking.

6. **[How I Run Claude Code Agents in Parallel](https://worksfornow.pika.page/posts/note-to-a-friend-how-i-run-claude-code-agents-in-parallel)** - WorksForNow
   Tmux + git worktrees + claude-task-master workflow. Custom `/delegate` command for spinning up parallel agents.

7. **[How to Use Claude Code Subagents to Parallelize Development](https://zachwills.net/how-to-use-claude-code-subagents-to-parallelize-development/)** - Zach Wills
   "Core trio" pattern: backend + frontend + QA specialists in parallel. Sequential handoffs after parallel phases. Context isolation per specialist.

### Frameworks & Methodologies

1. **[GitHub Spec Kit](https://github.com/github/spec-kit)** - GitHub
   Spec-driven development toolkit. 4-phase gated process: Specify → Plan → Tasks → Implement. Tasks include parallel execution markers.

2. **[Spec-driven development with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)** - GitHub Blog
   Official announcement. Prevents AI drift through structured phases with checkpoints.

3. **[BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD)** - BMad Code
   Agent-as-Code paradigm. 19 specialized agents with roles (Analyst, PM, Architect, Dev, QA). Two-phase: planning agents create specs, dev agents implement.

4. **[What is BMAD-METHOD?](https://medium.com/@visrow/what-is-bmad-method-a-simple-guide-to-the-future-of-ai-driven-development-412274f91419)** - Vishal Mysore
   Overview of persona-driven workflow replacing unstructured vibe coding.

5. **[Welcome to Gas Town](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04)** - Steve Yegge
   Go-based orchestrator for 20-30 parallel agents. Built on Beads framework. "Molecules" for sequenced checkpoints.

6. **[Gas Town GitHub](https://github.com/steveyegge/gastown)** - Steve Yegge
   7 agent roles: Mayor, Polecats, Refinery, Witness, Deacon, Dogs, Crew. Merge queue management.

7. **[Claude Flow](https://github.com/ruvnet/claude-flow)** - ruvnet
   Enterprise-grade swarm intelligence. Up to 10 concurrent agents. Stream-json chaining for agent-to-agent dependencies.

8. **[Claude Squad](https://github.com/smtg-ai/claude-squad)** - smtg-ai
   Lightweight tmux + git worktrees manager. Autoyes mode for hands-off execution.

### IDE & Agent Platforms

1. **[Roo Code](https://github.com/RooCodeInc/Roo-Code)** - RooCodeInc
   Cline fork with Custom Modes for specialized agent personalities.

2. **[Cline](https://cline.bot)** - Cline
   Open-source autonomous coding agent. Plan + Act modes with approval gates.

3. **[Devin 2.0](https://cognition.ai/blog/devin-2)** - Cognition Labs
   Multiple parallel Devins with cloud IDE. Interactive Planning, Devin Search, Devin Wiki.

4. **[Aider](https://aider.chat)** - Paul Gauthier
   Git-native CLI agent. Commit-based checkpoints.

### Multi-Agent Orchestration

1. **[LangGraph Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/)** - LangChain
   Graph-based orchestration. Nodes = agents, edges = dependencies. Supervisor pattern.

2. **[CrewAI](https://docs.crewai.com/en/introduction)** - CrewAI
   Role-based delegation with `allow_delegation`. Hierarchical agent structures.

3. **[Microsoft AutoGen](https://github.com/microsoft/autogen)** - Microsoft
   Async message passing. Magentic orchestration pattern. Evolved into Microsoft Agent Framework.

4. **[Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)** - Microsoft
   Successor to AutoGen + Semantic Kernel. Enterprise-grade with thread-based state management.

5. **[OpenDevin](https://github.com/OpenDevin/OpenDevin)** - OpenDevin
   Open-source Devin alternative. Specialized agents: code_editor, browser, command_line, error_handling.

### Secondary Research

1. **[Multi-Agent Coding: Parallel Development Guide](https://www.digitalapplied.com/blog/multi-agent-coding-parallel-development)** - Digital Applied
   Overview of multi-agent architectures. Cursor 2.0's 8-agent capability.

2. **[User Story Splitting - Vertical Slice vs Horizontal Slice](https://www.visual-paradigm.com/scrum/user-story-splitting-vertical-slice-vs-horizontal-slice/)** - Visual Paradigm
   Vertical slicing for independent, parallelizable work units.

3. **[Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)** - Anthropic
   Official documentation on Claude Code subagent creation and management.

4. **[9 Agentic AI Workflow Patterns](https://www.marktechpost.com/2025/08/09/9-agentic-ai-workflow-patterns-transforming-ai-agents-in-2025/)** - MarkTechPost
   Shared memory patterns for agent knowledge sharing.

### Tools Summary

| Tool | Purpose | Link |
|------|---------|------|
| Claude Task Master | Dependency-aware task management | [GitHub](https://github.com/eyaltoledano/claude-task-master) |
| GitHub Spec Kit | Spec-driven development | [GitHub](https://github.com/github/spec-kit) |
| BMAD Method | Agent-as-Code framework | [GitHub](https://github.com/bmad-code-org/BMAD-METHOD) |
| Gas Town | Multi-agent orchestrator (20-30 agents) | [GitHub](https://github.com/steveyegge/gastown) |
| Claude Flow | Swarm intelligence platform | [GitHub](https://github.com/ruvnet/claude-flow) |
| Claude Squad | Tmux-based agent management | [GitHub](https://github.com/smtg-ai/claude-squad) |
| Vibe Kanban | Visual agent orchestration | [GitHub](https://github.com/BloopAI/vibe-kanban) |
| Roo Code | Extensible IDE agent | [GitHub](https://github.com/RooCodeInc/Roo-Code) |
| Cline | Open-source autonomous agent | [Website](https://cline.bot) |
| LangGraph | Graph-based orchestration | [LangChain](https://www.langchain.com/langgraph) |
| CrewAI | Role-based multi-agent | [Website](https://www.crewai.com) |
| Microsoft AutoGen | Enterprise multi-agent | [GitHub](https://github.com/microsoft/autogen) |
| OpenDevin | Open-source Devin | [GitHub](https://github.com/OpenDevin/OpenDevin) |
