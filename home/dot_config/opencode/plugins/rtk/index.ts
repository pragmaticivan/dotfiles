import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { Plugin } from "@opencode-ai/plugin"

const execute = promisify(execFile)

export default Plugin.define({
  id: "rtk",
  async setup(ctx) {
    const registration = await ctx.tool.hook("execute.before", async (event) => {
      if (event.tool !== "shell") return
      if (typeof event.input !== "object" || event.input === null || !("command" in event.input)) return

      const command = event.input.command
      if (typeof command !== "string" || command.length === 0) return

      try {
        const { stdout } = await execute("rtk", ["rewrite", command], { encoding: "utf8" })
        const rewritten = stdout.trim()
        if (rewritten && rewritten !== command) event.input.command = rewritten
      } catch {
        return
      }
    })

    return () => registration.dispose()
  },
})
