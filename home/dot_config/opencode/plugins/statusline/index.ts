// Server entry kept for plugin-discovery layout parity. The status line lives
// in tui.tsx; nothing runs on the server.
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "statusline",
  setup() {},
})
