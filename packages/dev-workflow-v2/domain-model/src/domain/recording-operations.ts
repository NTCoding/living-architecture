import { defineRecordingOps } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type {
  RecordingOpDefinition,
  RecordingOpsFactory,
  WorkflowRegistry,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'

/**
 * @riviere-role domain-service
 * @riviere-role-justification Building the workflow engine's recording-operation factory is integration behaviour over the engine's registry contract, not behaviour over aggregate or value object state, so no aggregate or value object owns it.
 */
export function buildRecordingOperations<
  TStateName extends string,
  TState extends { currentStateMachineState: TStateName },
  TOperation extends string,
>(
  registry: WorkflowRegistry<TState, TStateName, TOperation>,
  operations: Readonly<Record<string, RecordingOpDefinition<readonly never[]>>>,
): RecordingOpsFactory<TStateName, TState, TOperation> {
  return defineRecordingOps(registry, operations)
}
