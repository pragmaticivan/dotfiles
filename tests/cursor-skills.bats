#!/usr/bin/env bats

setup() {
    REPO_ROOT="$(cd "${BATS_TEST_DIRNAME}/.." && pwd)"
    TEST_HOME="${BATS_TEST_TMPDIR}/home"
    mkdir -p "${TEST_HOME}"
    chezmoi execute-template --source "${REPO_ROOT}" \
        <"${REPO_ROOT}/home/.chezmoiscripts/unix/run_onchange_after_20-link-external-skills.sh.tmpl" \
        >"${BATS_TEST_TMPDIR}/link-skills.sh"
    names=$(chezmoi data --source "${REPO_ROOT}" | jq -r '.external_skills | keys[]')
    while IFS= read -r name; do
        [ -n "${name}" ] || continue
        mkdir -p "${TEST_HOME}/.agents/skills/${name}"
        printf '# %s\n' "${name}" >"${TEST_HOME}/.agents/skills/${name}/SKILL.md"
    done <<<"${names}"
}

@test "Cursor has the same explicit skill links as Claude" {
    for source in "${REPO_ROOT}"/home/dot_claude/skills/symlink_*.tmpl; do
        cursor_source="${REPO_ROOT}/home/dot_cursor/skills/$(basename "${source}")"
        [ -f "${cursor_source}" ]
        [ "$(cat "${source}")" = "$(cat "${cursor_source}")" ]
    done
}

@test "external skills link into Cursor and Claude without replacing personal skills" {
    mkdir -p "${TEST_HOME}/.cursor/skills/personal"
    printf '# Personal\n' >"${TEST_HOME}/.cursor/skills/personal/SKILL.md"

    run env HOME="${TEST_HOME}" bash "${BATS_TEST_TMPDIR}/link-skills.sh"
    [ "${status}" -eq 0 ]
    run env HOME="${TEST_HOME}" bash "${BATS_TEST_TMPDIR}/link-skills.sh"
    [ "${status}" -eq 0 ]

    while IFS= read -r name; do
        [ -n "${name}" ] || continue
        for client in .cursor .claude; do
            link="${TEST_HOME}/${client}/skills/${name}"
            [ -L "${link}" ]
            [ "$(readlink "${link}")" = "${TEST_HOME}/.agents/skills/${name}" ]
            [ -f "${link}/SKILL.md" ]
        done
    done <<<"${names}"
    [ ! -L "${TEST_HOME}/.cursor/skills" ]
    [ "$(cat "${TEST_HOME}/.cursor/skills/personal/SKILL.md")" = '# Personal' ]
}

@test "a same-name personal skill stops linking without a nested link" {
    skill="${TEST_HOME}/.cursor/skills/gh-stack"
    mkdir -p "${skill}"
    printf '# Personal\n' >"${skill}/SKILL.md"

    run env HOME="${TEST_HOME}" bash "${BATS_TEST_TMPDIR}/link-skills.sh"

    [ "${status}" -ne 0 ]
    [[ "${output}" == *"${skill}"* ]]
    [ "$(cat "${skill}/SKILL.md")" = '# Personal' ]
    [ ! -L "${skill}/gh-stack" ]
}
