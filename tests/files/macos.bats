#!/usr/bin/env bats

@test "[macos] verify homebrew installation" {
    run command -v brew
    [ "$status" -eq 0 ]
}

@test "[macos] verify Brewfile exists" {
    [ -f "${HOME}/Brewfile" ]
}
