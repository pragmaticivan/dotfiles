#!/usr/bin/env bats

# bats file_tags=macos

@test "[macos] verify homebrew installation" {
    run command -v brew
    [ "$status" -eq 0 ]
}

@test "[macos] verify Brewfile exists" {
    [ -f "${HOME}/Brewfile" ]
}

@test "[macos] core CLI tools from Brewfile are installed" {
    tools=(starship mise bat fzf jq atuin)
    for tool in "${tools[@]}"; do
        echo "Checking for ${tool}"
        run command -v "${tool}"
        [ "$status" -eq 0 ]
    done
}
