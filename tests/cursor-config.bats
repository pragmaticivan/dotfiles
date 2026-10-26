#!/usr/bin/env bats

setup() {
    REPO_ROOT="$(cd "${BATS_TEST_DIRNAME}/.." && pwd)"
    export HOME="${BATS_TEST_TMPDIR}/home"
    export XDG_CONFIG_HOME="${HOME}/.config"
    mkdir -p "${HOME}"
    chezmoi init --no-tty --source "${REPO_ROOT}" >/dev/null
    MODIFIER="${REPO_ROOT}/home/dot_cursor/modify_private_cli-config.json"
}

render() {
    chezmoi execute-template --source "${REPO_ROOT}" <"${REPO_ROOT}/$1"
}

make_cursor_source() {
    source_dir="${BATS_TEST_TMPDIR}/source"
    mkdir -p "${source_dir}/.chezmoitemplates"
    cp -R "${REPO_ROOT}/home/dot_cursor" "${source_dir}/"
    cp -R "${REPO_ROOT}/home/.chezmoidata" "${source_dir}/"
    cp -R "${REPO_ROOT}/home/.chezmoitemplates/agents" "${source_dir}/.chezmoitemplates/"
    cp "${REPO_ROOT}/home/.chezmoitemplates/ste-card.tmpl" "${source_dir}/.chezmoitemplates/"
    mkdir -p "${source_dir}/.chezmoiscripts/unix"
    cp "${REPO_ROOT}/home/.chezmoiscripts/unix/run_before_10-check-cursor-skill-links.sh.tmpl" \
        "${source_dir}/.chezmoiscripts/unix/"
}

@test "native Cursor agents preserve shared bodies and explicit write permissions" {
    for id in ci-watcher prose-editor skeptical-reviewer comment-sicko unit-test-writer security-reviewer; do
        render "home/dot_cursor/agents/${id}.md.tmpl" >"${BATS_TEST_TMPDIR}/agent.md"
        grep -qx "name: ${id}" "${BATS_TEST_TMPDIR}/agent.md"
        grep -q '^description: "' "${BATS_TEST_TMPDIR}/agent.md"
        grep -qx 'model: inherit' "${BATS_TEST_TMPDIR}/agent.md"
        case "${id}" in
            ci-watcher | prose-editor | skeptical-reviewer) readonly=true ;;
            *) readonly=false ;;
        esac
        grep -qx "readonly: ${readonly}" "${BATS_TEST_TMPDIR}/agent.md"
        keys=$(awk '/^---$/ { section++; next } section == 1 { sub(/:.*/, ""); print }' "${BATS_TEST_TMPDIR}/agent.md")
        [ "${keys}" = $'name\ndescription\nmodel\nreadonly' ]
        body=$(awk '/^---$/ { section++; next } section == 2 { print }' "${BATS_TEST_TMPDIR}/agent.md")
        [ "${body#$'\n'}" = "$(cat "${REPO_ROOT}/home/.chezmoitemplates/agents/body/${id}.md")" ]
    done
    run chezmoi execute-template --source "${REPO_ROOT}" \
        '{{ range .agents }}{{ if not (has "cursor" .targets) }}{{ fail "Cursor target is absent." }}{{ end }}{{ end }}'
    [ "${status}" -eq 0 ]
}

@test "dotfiles is a discoverable local plugin with an always-on STE rule" {
    make_cursor_source
    chezmoi cat --no-tty --source "${source_dir}" --destination "${HOME}" \
        "${HOME}/.cursor/plugins/local/dotfiles/.cursor-plugin/plugin.json" >"${BATS_TEST_TMPDIR}/plugin.json"
    jq -e '.name == "dotfiles"' "${BATS_TEST_TMPDIR}/plugin.json"
    chezmoi cat --no-tty --source "${source_dir}" --destination "${HOME}" \
        "${HOME}/.cursor/plugins/local/dotfiles/rules/global.mdc" >"${BATS_TEST_TMPDIR}/global.mdc"
    grep -qx 'alwaysApply: true' "${BATS_TEST_TMPDIR}/global.mdc"
    grep -q 'Ivan' "${BATS_TEST_TMPDIR}/global.mdc"
    grep -q '[~]/[.]agents/skills' "${BATS_TEST_TMPDIR}/global.mdc"
    grep -q '[~]/[.]cursor/skills' "${BATS_TEST_TMPDIR}/global.mdc"
    sed -n '/^STE MODE/,$p' "${BATS_TEST_TMPDIR}/global.mdc" >"${BATS_TEST_TMPDIR}/ste-card"
    cmp "${REPO_ROOT}/home/.chezmoitemplates/ste-card.tmpl" "${BATS_TEST_TMPDIR}/ste-card"
}

@test "chezmoi applies Cursor files without changing machine-local MCP data" {
    make_cursor_source
    mkdir -p "${HOME}/.cursor"
    printf '%s\n' '{"mcpServers":{"personal":{"url":"https://example.invalid/mcp"}}}' >"${HOME}/.cursor/mcp.json"
    cp "${HOME}/.cursor/mcp.json" "${BATS_TEST_TMPDIR}/mcp.json"
    printf '%s\n' '{"model":{"id":"user-selected"},"unknown":42}' >"${HOME}/.cursor/cli-config.json"

    chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}" "${HOME}/.cursor"

    cmp "${BATS_TEST_TMPDIR}/mcp.json" "${HOME}/.cursor/mcp.json"
    [ ! -L "${HOME}/.cursor/plugins/local/dotfiles" ]
    [ -f "${HOME}/.cursor/plugins/local/dotfiles/.cursor-plugin/plugin.json" ]
    [ -f "${HOME}/.cursor/agents/ci-watcher.md" ]
    jq -e '.model == {id: "user-selected"} and .unknown == 42 and .version == 1 and
        .attribution == {attributeCommitsToAgent: false, attributePRsToAgent: false}' "${HOME}/.cursor/cli-config.json"
}

@test "Cursor apply refuses a same-name personal skill directory before replacing content" {
    make_cursor_source
    skill="${HOME}/.cursor/skills/architect"
    mkdir -p "${skill}"
    printf '# Personal\n' >"${skill}/SKILL.md"

    run chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"

    [ ! -L "${skill}" ]
    [ "$(cat "${skill}/SKILL.md")" = '# Personal' ]
    [ "${status}" -ne 0 ]
    [[ "${output}" == *"Cannot link skill. A personal file or directory exists at ${skill}"* ]]
    [ ! -e "${HOME}/.cursor/cli-config.json" ]
}

@test "Cursor apply refuses a same-name personal skill file before replacing content" {
    make_cursor_source
    skill="${HOME}/.cursor/skills/architect"
    mkdir -p "$(dirname "${skill}")"
    printf '# Personal\n' >"${skill}"

    run chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"

    [ ! -L "${skill}" ]
    [ "$(cat "${skill}")" = '# Personal' ]
    [ "${status}" -ne 0 ]
    [[ "${output}" == *"Cannot link skill. A personal file or directory exists at ${skill}"* ]]
    [ ! -e "${HOME}/.cursor/cli-config.json" ]
}

@test "Cursor apply protects new declarative skill names" {
    make_cursor_source
    printf '{{ .chezmoi.homeDir }}/.agents/skills/test-managed\n' \
        >"${source_dir}/dot_cursor/skills/symlink_test-managed.tmpl"
    skill="${HOME}/.cursor/skills/test-managed"
    mkdir -p "$(dirname "${skill}")"
    printf '# Personal\n' >"${skill}"

    run chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"

    [ ! -L "${skill}" ]
    [ "$(cat "${skill}")" = '# Personal' ]
    [ "${status}" -ne 0 ]
    [[ "${output}" == *"${skill}"* ]]
}

@test "Cursor apply checks external skill names on every apply" {
    make_cursor_source
    rm "${source_dir}/dot_cursor/skills/symlink_gh-stack.tmpl"
    chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"
    skill="${HOME}/.cursor/skills/gh-stack"
    mkdir -p "${skill}"
    printf '# Personal\n' >"${skill}/SKILL.md"

    run chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"

    [ "${status}" -ne 0 ]
    [[ "${output}" == *"Cannot link skill. A personal file or directory exists at ${skill}"* ]]
    [ "$(cat "${skill}/SKILL.md")" = '# Personal' ]
}

@test "Cursor apply preserves personal and archive skills and accepts existing symlinks" {
    make_cursor_source
    mkdir -p "${HOME}/.cursor/skills/personal" "${HOME}/.cursor/skills/worktrunk" \
        "${HOME}/.agents/skills/architect"
    printf '# Personal\n' >"${HOME}/.cursor/skills/personal/SKILL.md"
    printf '# Worktrunk\n' >"${HOME}/.cursor/skills/worktrunk/SKILL.md"
    printf '# Architect\n' >"${HOME}/.agents/skills/architect/SKILL.md"
    ln -s "${HOME}/.agents/skills/architect" "${HOME}/.cursor/skills/architect"
    ln -s "${HOME}/.agents/skills/bro" "${HOME}/.cursor/skills/bro"
    ln -s "${HOME}/.agents/skills/gh-stack" "${HOME}/.cursor/skills/gh-stack"

    chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"
    chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"

    [ ! -L "${HOME}/.cursor/skills" ]
    [ ! -L "${HOME}/.cursor/skills/personal" ]
    [ "$(cat "${HOME}/.cursor/skills/personal/SKILL.md")" = '# Personal' ]
    [ "$(cat "${HOME}/.cursor/skills/worktrunk/SKILL.md")" = '# Worktrunk' ]
    for name in architect bro gh-stack; do
        [ -L "${HOME}/.cursor/skills/${name}" ]
        [ "$(readlink "${HOME}/.cursor/skills/${name}")" = "${HOME}/.agents/skills/${name}" ]
    done
    [ "$(cat "${HOME}/.cursor/skills/architect/SKILL.md")" = '# Architect' ]
}

@test "Cursor apply preserves private CLI config mode and authentication" {
    make_cursor_source
    config="${HOME}/.cursor/cli-config.json"
    mkdir -p "$(dirname "${config}")"
    printf '%s\n' '{"authentication":{"testToken":"not-a-real-token"}}' >"${config}"
    chmod 0600 "${config}"

    chezmoi apply --no-tty --source "${source_dir}" --destination "${HOME}"

    jq -e '.authentication == {testToken: "not-a-real-token"} and .version == 1' "${config}"
    python3 - "${config}" <<'PY'
import os
import stat
import sys

mode = stat.S_IMODE(os.stat(sys.argv[1]).st_mode)
assert mode == 0o600, f"Expected 0600, got {mode:04o}"
PY
}

@test "CLI modifier supplies defaults without a model or approval override" {
    run bash "${MODIFIER}" </dev/null
    [ "${status}" -eq 0 ]
    printf '%s\n' "${output}" | jq -e '. == {
        version: 1,
        editor: {vimMode: false},
        permissions: {allow: [], deny: []},
        attribution: {attributeCommitsToAgent: false, attributePRsToAgent: false}
    }'
}

@test "CLI modifier preserves unmanaged keys and nested user settings" {
    cat >"${BATS_TEST_TMPDIR}/input.json" <<'JSON'
{
    "version": 0,
    "editor": {"vimMode": true, "keymap": "custom"},
    "permissions": {"allow": ["Shell(ls)"], "deny": ["Shell(rm)"], "custom": true},
    "attribution": {"attributeCommitsToAgent": true, "attributePRsToAgent": true, "custom": "keep"},
    "model": {"id": "user-selected", "extra": {"keep": true}},
    "approvalMode": "allowlist",
    "authentication": {"testToken": "not-a-real-token"},
    "display": {"showThinkingBlocks": false},
    "unknown": [1, 2]
}
JSON
    run bash "${MODIFIER}" <"${BATS_TEST_TMPDIR}/input.json"
    [ "${status}" -eq 0 ]
    printf '%s\n' "${output}" | jq -e '. == {
        version: 1,
        editor: {vimMode: true, keymap: "custom"},
        permissions: {allow: ["Shell(ls)"], deny: ["Shell(rm)"], custom: true},
        attribution: {attributeCommitsToAgent: false, attributePRsToAgent: false, custom: "keep"},
        model: {id: "user-selected", extra: {keep: true}},
        approvalMode: "allowlist",
        authentication: {testToken: "not-a-real-token"},
        display: {showThinkingBlocks: false},
        unknown: [1, 2]
    }'
}

@test "CLI modifier adds absent nested defaults without replacing sibling fields" {
    run bash "${MODIFIER}" <<'JSON'
{"editor":{"keymap":"custom"},"permissions":{"deny":["Shell(rm)"]},"attribution":{"custom":true}}
JSON
    [ "${status}" -eq 0 ]
    printf '%s\n' "${output}" | jq -e '
        .editor == {vimMode: false, keymap: "custom"} and
        .permissions == {allow: [], deny: ["Shell(rm)"]} and
        .attribution == {attributeCommitsToAgent: false, attributePRsToAgent: false, custom: true}'
}

@test "CLI modifier is idempotent" {
    bash "${MODIFIER}" <<'JSON' >"${BATS_TEST_TMPDIR}/first.json"
{"editor":{"vimMode":true},"permissions":{"allow":["Shell(ls)"]},"unknown":42}
JSON
    bash "${MODIFIER}" <"${BATS_TEST_TMPDIR}/first.json" >"${BATS_TEST_TMPDIR}/second.json"
    cmp "${BATS_TEST_TMPDIR}/first.json" "${BATS_TEST_TMPDIR}/second.json"
}

@test "CLI modifier rejects malformed JSON instead of replacing user data" {
    [ -f "${MODIFIER}" ]
    run bash "${MODIFIER}" <<'JSON'
{"model":
JSON
    [ "${status}" -ne 0 ]
}

@test "CLI modifier preserves large user settings without command argument limits" {
    jq -n '{custom: ("x" * 3000000)}' >"${BATS_TEST_TMPDIR}/large.json"
    run bash "${MODIFIER}" <"${BATS_TEST_TMPDIR}/large.json"
    [ "${status}" -eq 0 ]
    printf '%s\n' "${output}" | jq -e '.custom | length == 3000000'
}

@test "CLI modifier rejects multiple JSON documents" {
    run bash "${MODIFIER}" <<'JSON'
{"model":{"id":"first"}}
{"model":{"id":"second"}}
JSON
    [ "${status}" -ne 0 ]
}

@test "Cursor archives reuse plugin pins and preserve native plugin and skill paths" {
    render home/.chezmoiexternals/cursor-plugins.toml.tmpl >"${BATS_TEST_TMPDIR}/externals.toml"
    chezmoi execute-template --source "${REPO_ROOT}" \
        "{{ include \"${BATS_TEST_TMPDIR}/externals.toml\" | fromToml | toJson }}" >"${BATS_TEST_TMPDIR}/externals.json"
    jq -e 'keys == [".cursor/plugins/local/compound-engineering", ".cursor/skills/worktrunk"] and
        (.[".cursor/plugins/local/compound-engineering"] | del(.url)) == {
            type: "archive",
            include: ["*/.agents", "*/.agents/plugins", "*/.agents/plugins/**",
                "*/.claude-plugin", "*/.claude-plugin/**", "*/.codex-plugin", "*/.codex-plugin/**",
                "*/.cursor-plugin", "*/.cursor-plugin/**", "*/assets", "*/assets/**",
                "*/plugin.json", "*/skills", "*/skills/**"],
            stripComponents: 1
        } and
        (.[".cursor/skills/worktrunk"] | del(.url)) == {
            type: "archive",
            include: ["*/plugins/worktrunk/skills/worktrunk/**"],
            stripComponents: 5
        }' "${BATS_TEST_TMPDIR}/externals.json"
    chezmoi execute-template --source "${REPO_ROOT}" '{{ .agent_plugins | toJson }}' >"${BATS_TEST_TMPDIR}/registry.json"
    jq -e --slurpfile registry "${BATS_TEST_TMPDIR}/registry.json" '
        . as $archives |
        all($registry[0][] | select(.cursor_plugin or .cursor_skill);
            "https://github.com/\(.repo)/archive/\(.sha).tar.gz" as $url |
            if .cursor_plugin then
                $archives[".cursor/plugins/local/" + .name].url == $url
            else $archives[".cursor/skills/" + .name].url == $url end)' \
        "${BATS_TEST_TMPDIR}/externals.json"
}
