#!/usr/bin/env bats

# bats file_tags=macos

@test "[macos] verify homebrew installation" {
    run command -v brew
    [ "$status" -eq 0 ]
}

@test "[macos] verify Brewfile exists" {
    [ -f "${HOME}/Brewfile" ]
}

@test "[macos] core CLI tools are installed" {
    tools=(starship mise)
    for tool in "${tools[@]}"; do
        echo "Checking for ${tool}"
        run command -v "${tool}"
        [ "$status" -eq 0 ]
    done
}

@test "[macos] the homebrew trust list is managed" {
    trust="${HOME}/.config/homebrew/trust.json"
    [ -f "${trust}" ]

    # Homebrew stops brew bundle on an untrusted non-official tap, so a new
    # machine needs this file before the Brewfile can install those entries.
    run jq -e '.trustedformulae | length > 0' "${trust}"
    [ "$status" -eq 0 ]

    # The file names credentials for third-party code, so keep it owner-only.
    perms=$(stat -f "%Lp" "${trust}")
    echo "Mode is ${perms}, want 600"
    [ "${perms}" = "600" ]

    # Each third-party entry in the Brewfile must be trusted, or brew bundle stops.
    while read -r entry; do
        echo "Checking that ${entry} is trusted"
        run jq -e --arg e "${entry}" \
            '(.trustedformulae // []) as $f | (.trustedtaps // []) as $t
             | ($f | index($e)) != null or ($t | index(($e | split("/")[0:2] | join("/")))) != null' \
            "${trust}"
        [ "$status" -eq 0 ]
    done < <(grep -oE '^brew "[^"]+/[^"]+/[^"]+"' "${HOME}/Brewfile" | sed 's/^brew "//;s/"$//')
}
