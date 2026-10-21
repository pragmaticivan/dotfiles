#!/usr/bin/env bats

setup() {
    export TEST_ROOT="${BATS_TEST_TMPDIR}/worktree-audit"
    export TEST_BIN="${TEST_ROOT}/bin"
    export SCRIPT="${BATS_TEST_DIRNAME}/../home/dot_agents/skills/kaizen-mode/scripts/executable_worktree-audit.sh"
    export GIT_CONFIG_GLOBAL="${TEST_ROOT}/gitconfig"
    export GIT_CONFIG_NOSYSTEM=1
    mkdir -p "${TEST_BIN}"
    printf '%s\n' '[user]' 'name = t' 'email = t@example.com' '[init]' 'defaultBranch = master' >"${GIT_CONFIG_GLOBAL}"

    cat >"${TEST_BIN}/gh" <<'EOF'
#!/usr/bin/env bash
echo '[]'
EOF
    chmod +x "${TEST_BIN}/gh"
    export PATH="${TEST_BIN}:${PATH}"

    git init -q --bare "${TEST_ROOT}/origin"
    git init -q "${TEST_ROOT}/seed"
    git -C "${TEST_ROOT}/seed" commit -q --allow-empty -m "root"
    git -C "${TEST_ROOT}/seed" checkout -q -b feature
    git -C "${TEST_ROOT}/seed" commit -q --allow-empty -m "feature"
    git -C "${TEST_ROOT}/seed" checkout -q master
    git -C "${TEST_ROOT}/seed" merge -q --ff-only feature
    git -C "${TEST_ROOT}/seed" push -q "${TEST_ROOT}/origin" master feature

    git clone -q "${TEST_ROOT}/origin" "${TEST_ROOT}/repo"
    git -C "${TEST_ROOT}/repo" worktree add -q "${TEST_ROOT}/wt" feature
    export WT="$(cd "${TEST_ROOT}/wt" && pwd -P)"
}

merged_column() {
    printf '%s\n' "${output}" | awk -F'\t' -v wt="${WT}" '$9 == wt { print $3 }'
}

@test "marks a branch merged into a master default branch as MERGED=YES" {
    run bash "${SCRIPT}" "${TEST_ROOT}/repo"

    [ "${status}" -eq 0 ]
    [ "$(merged_column)" = "YES" ]
}

@test "names the base in the header and on stderr when -b is absent" {
    run bash "${SCRIPT}" "${TEST_ROOT}/repo"

    [ "${status}" -eq 0 ]
    printf '%s\n' "${output}" | grep -qx '# base: origin/master'
    printf '%s\n' "${output}" | grep -q 'warn: no -b given; MERGED checks against origin/master'
}

@test "-b fetches a base branch the clone does not have yet" {
    git -C "${TEST_ROOT}/seed" checkout -q -b release
    git -C "${TEST_ROOT}/seed" push -q "${TEST_ROOT}/origin" release
    git -C "${TEST_ROOT}/repo" remote set-branches origin master
    ! git -C "${TEST_ROOT}/repo" rev-parse --verify --quiet origin/release

    run bash "${SCRIPT}" -b origin/release "${TEST_ROOT}/repo"

    [ "${status}" -eq 0 ]
    printf '%s\n' "${output}" | grep -qx '# base: origin/release'
    [ "$(merged_column)" = "YES" ]
}

@test "-b with a ref that does not exist exits 1" {
    run bash "${SCRIPT}" -b origin/nope "${TEST_ROOT}/repo"

    [ "${status}" -eq 1 ]
    printf '%s\n' "${output}" | grep -q 'error: base ref not found: origin/nope'
}

@test "-h prints the usage and exits 0" {
    run bash "${SCRIPT}" -h

    [ "${status}" -eq 0 ]
    printf '%s\n' "${output}" | grep -q 'Usage: worktree-audit.sh'
}

@test "an unknown option exits 2" {
    run bash "${SCRIPT}" --bogus "${TEST_ROOT}/repo"

    [ "${status}" -eq 2 ]
    printf '%s\n' "${output}" | grep -q 'error: unknown option: --bogus'
}
