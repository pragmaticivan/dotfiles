import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  SessionEntry,
} from "@earendil-works/pi-coding-agent"
import {
  createCheckpoint,
  DEFAULT_MAX_CHECKPOINTS,
  deleteCheckpoint,
  diffCheckpoints,
  findClosestCheckpoint,
  getRepoRoot,
  isGitRepo,
  loadAllCheckpoints,
  MUTATING_TOOLS,
  pruneCheckpoints,
  restoreCheckpoint,
  type CheckpointData,
} from "../../vendor/pi-rewind/src/core.ts"
import {
  MessageTargetIndex,
  messageTargetLabels,
  rewindPlan,
  type MessageTarget,
  type RewindAction,
} from "./rewind-interaction.ts"
import { selectRewindAction } from "./rewind-modal.ts"

type RewindState = {
  generation: number
  root?: string
  sessionId?: string
  checkpoints: Map<string, CheckpointData>
  redo: Array<{
    checkpoint?: CheckpointData
    leafId?: string
    editorText: string
  }>
  pending?: Promise<void>
  turnIndex: number
  prompt: string
  tools: string[]
  mutated: boolean
  lastTree?: string
}

export type MessageRewind = {
  targetFor(component: object, text: string): MessageTarget | undefined
  request(target: MessageTarget): void
}

const choices = [
  { label: "Revert", description: "undo messages and file changes", action: "all" },
  { label: "Revert messages", description: "keep file changes", action: "messages" },
  { label: "Restore changes", description: "keep messages", action: "files" },
] as const

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

function userText(entry: SessionEntry): string | undefined {
  if (entry.type !== "message" || entry.message.role !== "user") return undefined
  const content = entry.message.content
  if (typeof content === "string") return content
  return content.filter((part) => part.type === "text").map((part) => part.text).join("\n")
}

function messageTargets(ctx: ExtensionContext): MessageTarget[] {
  const targets: MessageTarget[] = []
  for (const entry of ctx.sessionManager.getBranch()) {
    const text = userText(entry)
    if (!text) continue
    targets.push({
      id: entry.id,
      parentId: entry.parentId,
      text,
      timestamp: Date.parse(entry.timestamp),
    })
  }
  return targets
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function describeTool(name: string, input: unknown): string {
  if (!record(input)) return name
  if ((name === "write" || name === "edit") && typeof input.path === "string") {
    return `${name} → ${input.path}`
  }
  if (name === "bash" && typeof input.command === "string") {
    return `bash: ${truncate(input.command, 48)}`
  }
  return name
}

function checkpointDescription(state: RewindState): string {
  const prompt = state.prompt ? `“${truncate(state.prompt, 52)}”` : ""
  const tools = state.tools.join(", ")
  return prompt && tools ? `${prompt} → ${tools}` : prompt || tools || `Turn ${state.turnIndex}`
}

function refreshTargets(index: MessageTargetIndex, ctx: ExtensionContext): void {
  index.setEntries(messageTargets(ctx))
}

async function createSafetyCheckpoint(state: RewindState): Promise<CheckpointData | undefined> {
  if (!state.root || !state.sessionId) return undefined
  return createCheckpoint({
    root: state.root,
    id: `before-restore-${state.sessionId}-${Date.now()}`,
    sessionId: state.sessionId,
    trigger: "before-restore",
    turnIndex: state.turnIndex,
    description: "Before rewind",
  })
}

async function selectAction(
  ctx: ExtensionCommandContext,
  hasCheckpoint: boolean,
): Promise<RewindAction | undefined> {
  const available = choices.filter((choice) => hasCheckpoint || choice.action === "messages")
  return selectRewindAction(
    ctx,
    available.map((choice) => ({
      value: choice.action,
      label: choice.label,
      description: choice.description,
    })),
  )
}

async function restoreWithPreview(
  state: RewindState,
  ctx: ExtensionCommandContext,
  target: CheckpointData,
): Promise<CheckpointData | undefined> {
  if (!state.root) return undefined
  const safety = await createSafetyCheckpoint(state)
  if (!safety) return undefined
  const diff = await diffCheckpoints(state.root, target.worktreeTreeSha, safety.worktreeTreeSha)
  if (diff && diff !== "(diff unavailable)") {
    const confirmed = await ctx.ui.confirm("Restore file changes?", diff.slice(0, 2_000))
    if (!confirmed) {
      await deleteCheckpoint(state.root, safety.id)
      return undefined
    }
  }
  await restoreCheckpoint(state.root, target)
  return safety
}

async function runRewind(
  state: RewindState,
  index: MessageTargetIndex,
  target: MessageTarget,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const oldLeafId = ctx.sessionManager.getLeafId() ?? undefined
  const oldEditorText = ctx.ui.getEditorText()
  const checkpoint = findClosestCheckpoint([...state.checkpoints.values()], target.timestamp)
  const action = await selectAction(ctx, checkpoint !== undefined)
  if (!action) return
  const plan = rewindPlan(action, target, checkpoint !== undefined)
  if (!plan) {
    ctx.ui.notify("No checkpoint is available for this message", "warning")
    return
  }

  let safety: CheckpointData | undefined
  if (plan.restoreFiles && checkpoint) {
    safety = await restoreWithPreview(state, ctx, checkpoint)
    if (!safety) return
  }

  if ("navigateTo" in plan) {
    const result = await ctx.navigateTree(plan.navigateTo, { summarize: false, label: "rewind" })
    if (result.cancelled) {
      if (safety && state.root) await restoreCheckpoint(state.root, safety)
      return
    }
    ctx.ui.setEditorText(plan.editorText)
    refreshTargets(index, ctx)
  }

  if (safety || "navigateTo" in plan) {
    state.redo.push({
      ...(safety ? { checkpoint: safety } : {}),
      ...(oldLeafId && "navigateTo" in plan ? { leafId: oldLeafId } : {}),
      editorText: oldEditorText,
    })
  }
  ctx.ui.notify(
    action === "all" ? "Rewound messages and file changes" : action === "messages" ? "Rewound messages" : "Restored file changes",
    "info",
  )
}

async function runRedo(
  state: RewindState,
  index: MessageTargetIndex,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const target = state.redo.at(-1)
  if (!target) {
    ctx.ui.notify("No rewind is available to restore", "warning")
    return
  }

  let rollback: CheckpointData | undefined
  if (target.checkpoint && state.root) {
    rollback = await createSafetyCheckpoint(state)
    if (!rollback) return
    await restoreCheckpoint(state.root, target.checkpoint)
  }
  if (target.leafId) {
    const result = await ctx.navigateTree(target.leafId, { summarize: false, label: "redo" })
    if (result.cancelled) {
      if (rollback && state.root) await restoreCheckpoint(state.root, rollback)
      return
    }
    refreshTargets(index, ctx)
  }
  state.redo.pop()
  ctx.ui.setEditorText(target.editorText)
  ctx.ui.notify("Restored the last rewind", "info")
}

export function installRewind(pi: ExtensionAPI): MessageRewind {
  const index = new MessageTargetIndex()
  let requestEnabled = true
  const state: RewindState = {
    generation: 0,
    checkpoints: new Map(),
    redo: [],
    turnIndex: 0,
    prompt: "",
    tools: [],
    mutated: false,
  }

  pi.on("session_start", async (_event, ctx) => {
    requestEnabled = true
    const generation = ++state.generation
    const cwd = ctx.cwd
    const sessionId = ctx.sessionManager.getSessionId()
    state.root = undefined
    state.sessionId = undefined
    state.checkpoints.clear()
    state.redo = []
    state.lastTree = undefined
    refreshTargets(index, ctx)
    if (!await isGitRepo(cwd) || generation !== state.generation) return
    const root = await getRepoRoot(cwd)
    if (generation !== state.generation) return
    state.root = root
    state.sessionId = sessionId
    for (const checkpoint of await loadAllCheckpoints(root, sessionId)) {
      state.checkpoints.set(checkpoint.id, checkpoint)
    }
    if (generation !== state.generation) return
    const resume = await createCheckpoint({
      root,
      id: `resume-${sessionId}-${Date.now()}`,
      sessionId,
      trigger: "resume",
      turnIndex: 0,
      description: "Session start",
    })
    if (generation !== state.generation) return
    state.checkpoints.set(resume.id, resume)
    state.lastTree = resume.worktreeTreeSha
  })

  pi.on("before_agent_start", (event, ctx) => {
    state.prompt = truncate(String(event.prompt || ""), 60)
    state.tools = []
    state.mutated = false
    refreshTargets(index, ctx)
  })
  pi.on("turn_start", (event) => {
    requestEnabled = false
    state.turnIndex = event.turnIndex
  })
  pi.on("tool_call", (event) => {
    if (!MUTATING_TOOLS.has(event.toolName)) return
    state.tools.push(describeTool(event.toolName, event.input))
  })
  pi.on("tool_execution_end", (event) => {
    if (MUTATING_TOOLS.has(event.toolName)) state.mutated = true
  })
  pi.on("turn_end", async (_event, ctx) => {
    refreshTargets(index, ctx)
    if (!state.mutated || !state.root || !state.sessionId) return
    const generation = state.generation
    const root = state.root
    const sessionId = state.sessionId
    const id = `turn-${sessionId}-${state.turnIndex}-${Date.now()}`
    const description = checkpointDescription(state)
    const pending = (async () => {
      const checkpoint = await createCheckpoint({
        root,
        id,
        sessionId,
        trigger: "tool",
        turnIndex: state.turnIndex,
        description,
      })
      if (generation !== state.generation) return
      if (state.lastTree === checkpoint.worktreeTreeSha) {
        await deleteCheckpoint(root, checkpoint.id)
        return
      }
      state.checkpoints.set(checkpoint.id, checkpoint)
      state.lastTree = checkpoint.worktreeTreeSha
      state.redo = []
      await pruneCheckpoints(root, sessionId, DEFAULT_MAX_CHECKPOINTS)
    })()
    state.pending = pending
    await pending
    if (state.pending === pending) state.pending = undefined
  })
  pi.on("session_tree", (_event, ctx) => refreshTargets(index, ctx))
  pi.on("agent_settled", () => {
    requestEnabled = true
  })
  pi.on("session_shutdown", async () => {
    requestEnabled = false
    state.generation += 1
    if (state.pending) await state.pending
  })

  pi.registerCommand("rewind", {
    description: "Go back to an earlier user message",
    handler: async (args, ctx) => {
      await ctx.waitForIdle()
      const targets = messageTargets(ctx)
      if (targets.length === 0) {
        ctx.ui.notify("No user messages are available", "warning")
        return
      }
      const requested = args.trim()
      if (requested) {
        const target = targets.find((entry) => entry.id === requested)
        if (!target) {
          ctx.ui.notify("The selected message is not on the active branch", "warning")
          return
        }
        await runRewind(state, index, target, ctx)
        return
      }
      const labels = messageTargetLabels(targets).map((label) => truncate(label.replace(/\s+/g, " "), 72))
      const selected = await ctx.ui.select("Go back in time", labels)
      if (!selected) return
      const selectedIndex = labels.indexOf(selected)
      const target = targets[selectedIndex]
      if (target) await runRewind(state, index, target, ctx)
    },
  })
  pi.registerCommand("redo", {
    description: "Restore the last rewind",
    handler: async (_args, ctx) => {
      await ctx.waitForIdle()
      await runRedo(state, index, ctx)
    },
  })

  return {
    targetFor: (component, text) => index.targetFor(component, text),
    request: (target) => {
      if (!requestEnabled) return
      pi.sendUserMessage(`/rewind ${target.id}`, { expandPromptTemplates: true })
    },
  }
}
