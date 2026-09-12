import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { findNamedWorktree } from "./navigation.ts"

describe("findNamedWorktree", () => {
  it("finds a Worktrunk worktree by its directory name", () => {
    assert.equal(findNamedWorktree([
      { directory: "/repo", strategy: undefined },
      { directory: "/repo/.worktrees/feature-a", strategy: "worktrunk" },
    ], "feature-a"), "/repo/.worktrees/feature-a")
  })

  it("does not select the project root", () => {
    assert.equal(findNamedWorktree([
      { directory: "/repo", strategy: undefined },
    ], "repo"), undefined)
  })
})
