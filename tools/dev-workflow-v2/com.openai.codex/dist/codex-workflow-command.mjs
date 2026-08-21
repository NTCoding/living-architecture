// src/shell/codex-workflow-command.ts
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join as join2 } from "node:path";
import { fileURLToPath } from "node:url";

// ../../packages/dev-workflow-v2/use-cases/src/infra/external-clients/codex/codex-session.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" && value !== "" ? value : void 0;
}
function readSpawnParentThreadId(source) {
  if (!isRecord(source)) return void 0;
  const subagent = source["subagent"];
  if (!isRecord(subagent)) return void 0;
  const threadSpawn = subagent["thread_spawn"];
  if (!isRecord(threadSpawn)) return void 0;
  return readString(threadSpawn, "parent_thread_id");
}
function readParentThreadId(payload) {
  const spawnParentThreadId = readSpawnParentThreadId(payload["source"]);
  if (spawnParentThreadId !== void 0) return spawnParentThreadId;
  return readString(payload, "parent_thread_id") ?? readString(payload, "forked_from_id");
}
function isSubagentSession(payload) {
  if (payload["thread_source"] === "subagent") return true;
  const source = payload["source"];
  if (!isRecord(source)) return false;
  const subagent = source["subagent"];
  if (!isRecord(subagent)) return false;
  return isRecord(subagent["thread_spawn"]);
}
function findTranscriptPath(directory, threadId) {
  if (!existsSync(directory)) return void 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const transcriptPath = findTranscriptPath(path, threadId);
      if (transcriptPath !== void 0) return transcriptPath;
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(`-${threadId}.jsonl`)) return path;
  }
  return void 0;
}
function readSessionMetadata(transcriptPath) {
  const firstLine = readFileSync(transcriptPath, "utf8").split("\n")[0];
  if (firstLine === void 0 || firstLine === "") return void 0;
  const entry = JSON.parse(firstLine);
  if (!isRecord(entry) || entry["type"] !== "session_meta" || !isRecord(entry["payload"])) {
    return void 0;
  }
  return entry["payload"];
}
var CodexSessionMetadataError = class extends Error {
  constructor(threadId) {
    super(`Codex subagent session ${threadId} is missing parent_thread_id metadata`);
    this.name = "CodexSessionMetadataError";
  }
};
function readCodexParentThreadId(threadId, codexHome2) {
  const transcriptsDirectory = join(codexHome2, "sessions");
  const transcriptPath = findTranscriptPath(transcriptsDirectory, threadId);
  if (transcriptPath === void 0) return void 0;
  const metadata = readSessionMetadata(transcriptPath);
  if (metadata === void 0) return void 0;
  const parentThreadId = readParentThreadId(metadata);
  if (parentThreadId !== void 0) return parentThreadId;
  if (isSubagentSession(metadata)) throw new CodexSessionMetadataError(threadId);
  return void 0;
}

// src/shell/codex-workflow-command.ts
var InvalidWorkflowCommandError = class extends Error {
  constructor() {
    super("Codex workflow command requires <operation> [args]");
    this.name = "InvalidWorkflowCommandError";
  }
};
var MissingCodexThreadIdError = class extends Error {
  constructor() {
    super("Missing required environment variable: CODEX_THREAD_ID");
    this.name = "MissingCodexThreadIdError";
  }
};
var [operation, ...operationArgs] = process.argv.slice(2);
var sessionId = process.env.CODEX_THREAD_ID;
if (operation === void 0 || operation === "") {
  throw new InvalidWorkflowCommandError();
}
if (sessionId === void 0 || sessionId === "") {
  throw new MissingCodexThreadIdError();
}
var codexHome = process.env.CODEX_HOME ?? join2(homedir(), ".codex");
var workflowSessionId = readCodexParentThreadId(sessionId, codexHome) ?? sessionId;
var args = operationArgs[0] === sessionId || operationArgs[0] === workflowSessionId ? operationArgs.slice(1) : operationArgs;
var cliPath = join2(dirname(fileURLToPath(import.meta.url)), "codex-cli.ts");
var require2 = createRequire(import.meta.url);
var runningBundledRuntime = process.argv[1]?.endsWith(".mjs") ?? false;
var bundledCliPath = join2(dirname(fileURLToPath(import.meta.url)), "codex-cli.mjs");
var cliArguments = runningBundledRuntime ? [bundledCliPath, operation, workflowSessionId, ...args] : [require2.resolve("tsx/cli"), cliPath, operation, workflowSessionId, ...args];
var sourceCondition = "--conditions=@living-architecture/source";
var nodeOptions = [process.env.NODE_OPTIONS, sourceCondition].filter(Boolean).join(" ");
var result = spawnSync(
  process.execPath,
  cliArguments,
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions
    }
  }
);
if (result.error !== void 0) {
  throw result.error;
}
process.exit(result.status ?? 1);
