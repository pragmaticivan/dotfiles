import { execFile } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"
import { Plugin } from "@opencode-ai/plugin"
import { z } from "zod"
import { findNamedWorktree } from "./navigation.ts"
import { createArguments, isSafeToRemove, parseList, parseSwitch, removeArguments } from "./worktree.ts"

const execute = promisify(execFile)

async function runWorktrunk(args: string[], cwd: string, signal?: AbortSignal): Promise<string> {
  const result = await execute("wt", args, { cwd, encoding: "utf8", signal })
  return result.stdout
}

export default Plugin.define({
  id: "worktrunk",
  async setup(ctx) {
    const controller = new AbortController()
    const directory = ctx.location.directory
    const worktreeParent = path.join(ctx.location.project.canonical, ".worktrees")

    const registration = await ctx.worktree.transform((editor) => {
      editor.add({
        id: "worktrunk",
        async create(input, context) {
          const stdout = await runWorktrunk(createArguments({
            sourceDirectory: input.sourceDirectory,
            suggestedDirectory: input.directory,
            branch: input.branch,
          }), input.sourceDirectory, context.signal)
          return { directory: parseSwitch(stdout) }
        },
        async list(sourceDirectory, context) {
          const stdout = await runWorktrunk(
            ["-C", sourceDirectory, "list", "--format=json"],
            sourceDirectory,
            context.signal,
          )
          return parseList(stdout)
        },
        async remove(input, context) {
          await runWorktrunk(removeArguments(input), input.directory, context.signal)
        },
      })
    })

    const tools = await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "worktree",
        description: "Run independent agent work in isolated Worktrunk worktrees.",
      })
      editor.add({
        name: "agent",
        description: "Run an independent task in a new Worktrunk worktree and OpenCode session.",
        options: { namespace: "worktree" },
        input: z.object({
          task: z.string().min(1),
          name: z.string().min(1).optional(),
          agent: z.string().min(1).default("build"),
        }),
        async execute(input, tool) {
          const parent = await ctx.session.get({ sessionID: tool.sessionID })
          const name = input.name ?? `opencode-${String(tool.id).slice(-8)}`
          const worktree = await ctx.worktree.create({
            location: { directory: parent.location.directory },
            name,
            directory: worktreeParent,
          })
          const child = await ctx.session.create({
            title: `Worktree agent: ${name}`,
            agent: input.agent,
            model: parent.model,
            location: { directory: worktree.directory },
            metadata: { worktree: worktree.directory, parentSessionID: parent.id },
          })

          await ctx.session.prompt({ sessionID: child.id, text: input.task })
          await ctx.session.wait({ sessionID: child.id })
          const messages = await ctx.session.context({ sessionID: child.id })
          const response = messages.toReversed().find((message) => message.type === "assistant")
          const answer = response?.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n") ?? "The isolated agent did not return text."

          const inventory = await runWorktrunk(
            ["-C", worktree.directory, "list", "--format=json"],
            worktree.directory,
          )
          const removed = isSafeToRemove(inventory, worktree.directory)
          if (removed) await ctx.worktree.remove({ directory: worktree.directory, force: false })

          return {
            content: [
              answer,
              "",
              `Session: ${child.id}`,
              removed ? "Worktree: removed because it was unchanged" : `Worktree: ${worktree.directory}`,
            ].join("\n"),
            metadata: {
              sessionID: child.id,
              worktree: worktree.directory,
              removed,
            },
          }
        },
      })
    })

    const commands = await ctx.command.transform((editor) => {
      editor.add({
        name: "worktree",
        description: "Move this session to an existing or new Worktrunk worktree.",
        async execute({ sessionID, prompt }) {
          const name = prompt.text.trim()
          if (!name) throw new Error("Use /worktree <name>")

          const session = await ctx.session.get({ sessionID })
          const location = { directory: session.location.directory }
          const inventory = await ctx.worktree.list({ location })
          const existing = findNamedWorktree(inventory, name)
          const directory = existing ?? (await ctx.worktree.create({
            location,
            name,
            directory: worktreeParent,
          })).directory
          await ctx.session.move({ sessionID, directory })
          await ctx.session.synthetic({ sessionID, text: `Session moved to Worktrunk worktree ${name}.` })
        },
      })
    })

    const updateMarker = async (marker?: string) => {
      const action = marker ? ["set", marker] : ["clear"]

      try {
        await execute("wt", ["config", "state", "marker", ...action], { cwd: directory })
      } catch {
        return
      }
    }

    const watcher = (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (event.location?.directory !== directory) continue

        switch (event.type) {
          case "session.status":
            await updateMarker(event.data.status.type === "idle" ? "💬" : "🤖")
            break
          case "session.idle":
            await updateMarker("💬")
            break
          case "session.deleted":
            await updateMarker()
            break
        }
      }
    })().catch((error: unknown) => {
      if (!controller.signal.aborted) console.error("Worktrunk activity tracking stopped", error)
    })

    return async () => {
      controller.abort()
      await watcher
      await updateMarker()
      await commands.dispose()
      await tools.dispose()
      await registration.dispose()
    }
  },
})
