import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { Plugin } from "@opencode-ai/plugin"

const execute = promisify(execFile)

export default Plugin.define({
  id: "worktrunk",
  setup(ctx) {
    const controller = new AbortController()
    const directory = ctx.location.directory

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
    }
  },
})
