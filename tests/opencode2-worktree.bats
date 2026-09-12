#!/usr/bin/env bats

setup() {
    export TEST_ROOT="${BATS_TEST_TMPDIR}/opencode2-worktree"
    export TEST_BIN="${TEST_ROOT}/bin"
    export TEST_LOG="${TEST_ROOT}/calls"
    export LAUNCHER="${BATS_TEST_DIRNAME}/../home/dot_local/bin/executable_opencode2"
    mkdir -p "${TEST_BIN}" "${TEST_ROOT}/repo"
    REPO_REAL=$(cd "${TEST_ROOT}/repo" && pwd -P)

    cat >"${TEST_BIN}/opencode2" <<'EOF'
#!/usr/bin/env bash
printf '%s\t' "$@" >>"${TEST_LOG}"
printf '\n' >>"${TEST_LOG}"

if [ "${1:-}" = "api" ] && [ "${2:-}" = "v2.worktree.list" ]; then
    printf '%s\n' "${LIST_RESPONSE:-[]}"
elif [ "${1:-}" = "api" ] && [ "${2:-}" = "v2.worktree.create" ]; then
    printf '%s\n' "${CREATE_RESPONSE}"
elif [ "${1:-}" = "api" ] && [ "${2:-}" = "v2.worktree.remove" ]; then
    printf '%s\n' '{}'
elif [ "${1:-}" = "api" ] && [ "${2:-}" = "v2.session.get" ]; then
    printf '%s\n' "${SESSION_RESPONSE}"
fi
EOF
    chmod +x "${TEST_BIN}/opencode2"
    cat >"${TEST_BIN}/mise" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "${TEST_BIN}/opencode2"
EOF
    chmod +x "${TEST_BIN}/mise"
cat >"${TEST_BIN}/wt" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *"step eval"* ]]; then
    printf '%s\n' "${WORKTREE_PARENT}"
elif [[ -n "${WT_LIST_RESPONSE:-}" ]]; then
    printf '%s\n' "${WT_LIST_RESPONSE}"
else
    printf '%s\n' '{"schema":2,"items":[]}'
fi
EOF
    chmod +x "${TEST_BIN}/wt"
    export WORKTREE_PARENT="${REPO_REAL}/.worktrees"
    export PATH="${TEST_BIN}:${PATH}"
}

@test "passes arguments through when worktree mode is absent" {
    run bash "${LAUNCHER}" --standalone "${TEST_ROOT}/repo"

    [ "${status}" -eq 0 ]
    [ "$(cat "${TEST_LOG}")" = $'--standalone\t'"${TEST_ROOT}"$'/repo\t' ]
}

@test "preserves native session resume outside worktree mode" {
    run bash "${LAUNCHER}" -s ses_test

    [ "${status}" -eq 0 ]
    [ "$(cat "${TEST_LOG}")" = $'-s\tses_test\t' ]
}

@test "reuses an existing named worktree" {
    export LIST_RESPONSE='[{"directory":"'"${TEST_ROOT}"'/trees/feature-a","strategy":"worktrunk"}]'

    run bash "${LAUNCHER}" -w feature-a

    [ "${status}" -eq 0 ]
    [ "$(tail -n 1 "${TEST_LOG}")" = "${TEST_ROOT}/trees/feature-a"$'\t' ]
    [ "$(grep -c 'v2.worktree.create' "${TEST_LOG}" || true)" -eq 0 ]
}

@test "does not reuse a worktree from another strategy" {
    export LIST_RESPONSE='[{"directory":"'"${TEST_ROOT}"'/trees/feature-a","strategy":"git"}]'
    export CREATE_RESPONSE='{"directory":"'"${TEST_ROOT}"'/trees/worktrunk-feature-a"}'

    run bash "${LAUNCHER}" -w feature-a

    [ "${status}" -eq 0 ]
    grep -F $'api\tv2.worktree.create\t' "${TEST_LOG}"
}

@test "creates a missing named worktree" {
    export CREATE_RESPONSE='{"directory":"'"${TEST_ROOT}"'/trees/feature-b"}'

    run bash "${LAUNCHER}" --worktree feature-b

    [ "${status}" -eq 0 ]
    grep -F $'api\tv2.worktree.create\t' "${TEST_LOG}"
    grep -F -- $'--data\t{"directory":"'"${WORKTREE_PARENT}"$'","name":"feature-b"}\t' "${TEST_LOG}"
    [ "$(tail -n 1 "${TEST_LOG}")" = "${TEST_ROOT}/trees/feature-b"$'\t' ]
}

@test "lets OpenCode generate an unnamed worktree" {
    export CREATE_RESPONSE='{"directory":"'"${TEST_ROOT}"'/trees/generated"}'

    run bash "${LAUNCHER}" --worktree --standalone

    [ "${status}" -eq 0 ]
    grep -F -- $'--data\t{"directory":"'"${WORKTREE_PARENT}"$'"}\t' "${TEST_LOG}"
    [ "$(tail -n 1 "${TEST_LOG}")" = $'--standalone\t'"${TEST_ROOT}"$'/trees/generated\t' ]
}

@test "removes a new unchanged worktree after OpenCode exits" {
    local worktree="${TEST_ROOT}/trees/clean-tree"
    export CREATE_RESPONSE='{"directory":"'"${worktree}"'"}'
    export WT_LIST_RESPONSE='{"schema":2,"items":[{"worktree":{"path":"'"${worktree}"'","changes":{"staged":false,"modified":false,"untracked":false,"renamed":false,"deleted":false,"conflicted":false}},"display":{"state":"empty"}}]}'

    run bash "${LAUNCHER}" --worktree clean-tree

    [ "${status}" -eq 0 ]
    grep -F $'api\tv2.worktree.remove\t' "${TEST_LOG}"
    grep -F -- $'--data\t' "${TEST_LOG}" | grep -F '"force":false'
}

@test "keeps a new worktree with uncommitted changes" {
    local worktree="${TEST_ROOT}/trees/dirty-tree"
    export CREATE_RESPONSE='{"directory":"'"${worktree}"'"}'
    export WT_LIST_RESPONSE='{"schema":2,"items":[{"worktree":{"path":"'"${worktree}"'","changes":{"staged":false,"modified":true,"untracked":false,"renamed":false,"deleted":false,"conflicted":false}},"display":{"state":"same_commit"}}]}'

    run bash "${LAUNCHER}" --worktree dirty-tree

    [ "${status}" -eq 0 ]
    [ "$(grep -c 'v2.worktree.remove' "${TEST_LOG}" || true)" -eq 0 ]
}

@test "uses and replaces an explicit source directory" {
    export CREATE_RESPONSE='{"directory":"'"${TEST_ROOT}"'/trees/feature-c"}'

    run bash "${LAUNCHER}" "${TEST_ROOT}/repo" -w feature-c --auto

    [ "${status}" -eq 0 ]
    grep -F -- $'--param\tlocation[directory]='"${REPO_REAL}"$'\t' "${TEST_LOG}"
    [ "$(tail -n 1 "${TEST_LOG}")" = $'--auto\t'"${TEST_ROOT}"$'/trees/feature-c\t' ]
}

@test "resumes a session in its existing worktree" {
    local worktree="${TEST_ROOT}/trees/session-tree"
    export LIST_RESPONSE='[{"directory":"'"${worktree}"'","strategy":"worktrunk"},{"directory":"'"${REPO_REAL}"'"}]'
    export SESSION_RESPONSE='{"data":{"id":"ses_test","location":{"directory":"'"${worktree}"'"}}}'

    run bash "${LAUNCHER}" "${TEST_ROOT}/repo" -w -s ses_test

    [ "${status}" -eq 0 ]
    grep -F $'api\tv2.session.get\t--param\tsessionID=ses_test\t' "${TEST_LOG}"
    [ "$(grep -c 'v2.worktree.create' "${TEST_LOG}" || true)" -eq 0 ]
    [ "$(tail -n 1 "${TEST_LOG}")" = $'-s\tses_test\t'"${worktree}"$'\t' ]
}

@test "accepts the long session equals form" {
    local worktree="${TEST_ROOT}/trees/session-tree"
    export LIST_RESPONSE='[{"directory":"'"${worktree}"'","strategy":"worktrunk"},{"directory":"'"${REPO_REAL}"'"}]'
    export SESSION_RESPONSE='{"data":{"id":"ses_test","location":{"directory":"'"${worktree}"'"}}}'

    run bash "${LAUNCHER}" "${TEST_ROOT}/repo" -w --session=ses_test

    [ "${status}" -eq 0 ]
    [ "$(tail -n 1 "${TEST_LOG}")" = $'--session=ses_test\t'"${worktree}"$'\t' ]
}

@test "rejects a named worktree that conflicts with the session" {
    local worktree="${TEST_ROOT}/trees/session-tree"
    export LIST_RESPONSE='[{"directory":"'"${worktree}"'","strategy":"worktrunk"},{"directory":"'"${REPO_REAL}"'"}]'
    export SESSION_RESPONSE='{"data":{"id":"ses_test","location":{"directory":"'"${worktree}"'"}}}'

    run bash "${LAUNCHER}" "${TEST_ROOT}/repo" -w other-tree -s ses_test

    [ "${status}" -eq 2 ]
    [[ "${output}" == *"belongs to worktree session-tree"* ]]
    [ "$(grep -c 'v2.worktree.create' "${TEST_LOG}" || true)" -eq 0 ]
}

@test "rejects a session whose worktree no longer exists" {
    local worktree="${TEST_ROOT}/trees/missing-tree"
    export LIST_RESPONSE='[{"directory":"'"${REPO_REAL}"'"}]'
    export SESSION_RESPONSE='{"data":{"id":"ses_test","location":{"directory":"'"${worktree}"'"}}}'

    run bash "${LAUNCHER}" "${TEST_ROOT}/repo" -w -s ses_test

    [ "${status}" -eq 2 ]
    [[ "${output}" == *"no longer exists"* ]]
    [ "$(grep -c 'v2.worktree.create' "${TEST_LOG}" || true)" -eq 0 ]
}

@test "routes Zsh calls through the local launcher" {
    local home="${TEST_ROOT}/home"
    mkdir -p "${home}/.local/bin"
    cat >"${home}/.local/bin/opencode2" <<'EOF'
#!/usr/bin/env bash
printf 'local launcher\n'
EOF
    chmod +x "${home}/.local/bin/opencode2"

    run env HOME="${home}" PATH="${TEST_BIN}:/usr/bin:/bin" /bin/zsh -dfc \
        "source '${BATS_TEST_DIRNAME}/../home/dot_config/zsh/autoload/functions.zsh'; whence -w opencode2; opencode2"

    [ "${status}" -eq 0 ]
    [ "${output}" = $'opencode2: function\nlocal launcher' ]
}
