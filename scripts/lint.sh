#!/usr/bin/env bash
#
# Runs shellcheck on the shell files and yamllint on the YAML files.
#
# Most shell in this repository is a chezmoi template, and shellcheck cannot read
# Go template syntax. So each `*.sh.tmpl` file goes through `chezmoi
# execute-template` first, and shellcheck reads the result.
#
# Needs shellcheck and yamllint. `mise` pins shellcheck, and the Brewfile
# installs the two of them. If yamllint is not on PATH, this script uses
# `uvx yamllint`, because `mise` pins uv.
#
# The rules come from ./.yamllint, not from the global config that this
# repository ships to ~/.config/yamllint/config.

set -Eeuo pipefail

if [ "${DOTFILES_DEBUG:-}" ]; then
    set -x
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
declare -r REPO_ROOT
declare -r RENDER_DIR="${TMPDIR:-/tmp}/dotfiles-lint-render"

FAILED=0

function need() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "lint: $1 is not on PATH. Install it, then run this script again." >&2
        return 1
    fi
}

# Lists the repository's files under the given pathspecs, tracked and untracked,
# so a new file is linted before its first `git add`.
#
# `--cached` also lists a file that the index still holds after a removal from
# the disk, so drop each path that is not there.
function repo_files() {
    local path
    git -C "${REPO_ROOT}" ls-files --cached --others --exclude-standard -- "$@" |
        while IFS= read -r path; do
            [ -f "${REPO_ROOT}/${path}" ] && printf '%s\n' "${path}"
        done
}

function yamllint_cmd() {
    if command -v yamllint >/dev/null 2>&1; then
        yamllint "$@"
    else
        uvx --quiet --from yamllint yamllint "$@"
    fi
}

# Run shellcheck on the plain shell files, which have no template syntax.
function lint_plain_shell() {
    local -a files=()

    while IFS= read -r file; do
        files+=("${file}")
    done < <(repo_files 'setup.sh' 'scripts' 'install' 'home/dot_claude/hooks' |
        grep -E '\.sh$')

    if [ ${#files[@]} -eq 0 ]; then
        echo "lint: no plain shell files found" >&2
        return 1
    fi

    echo "shellcheck: ${#files[@]} plain shell file(s)"
    (cd "${REPO_ROOT}" && shellcheck -S info "${files[@]}") || FAILED=1
}

# Templates that read the destination directory, and so cannot render on a bare
# checkout. CI has no fetched externals, so a render here would always fail.
declare -r RENDER_SKIP="home/.chezmoiscripts/unix/run_once_after_10-bat-build-cache.sh.tmpl"

# Run shellcheck on each rendered template. A template that fails to render is a
# failure too, because `chezmoi apply` would hit the same error.
function lint_template_shell() {
    local count=0
    local skipped=0

    rm -rf "${RENDER_DIR}"
    mkdir -p "${RENDER_DIR}"

    while IFS= read -r file; do
        local out

        if printf '%s\n' "${RENDER_SKIP}" | grep -qxF "${file}"; then
            skipped=$((skipped + 1))
            continue
        fi

        out="${RENDER_DIR}/$(echo "${file}" | tr '/' '_' | sed 's/\.tmpl$//')"

        if ! chezmoi execute-template --source "${REPO_ROOT}" <"${REPO_ROOT}/${file}" >"${out}"; then
            echo "lint: ${file} does not render" >&2
            # Leave no empty file behind, or shellcheck reports SC2148 for it too.
            rm -f "${out}"
            FAILED=1
            continue
        fi

        # A template can render to nothing when its OS guard excludes this host.
        # An empty file has no shebang, so skip it instead of reporting SC2148.
        if [ ! -s "${out}" ]; then
            rm -f "${out}"
            continue
        fi

        count=$((count + 1))
    done < <(repo_files 'home' | grep -E '\.sh\.tmpl$')

    echo "shellcheck: ${count} rendered template(s), ${skipped} skipped"
    if [ "${count}" -gt 0 ]; then
        shellcheck -S info "${RENDER_DIR}"/* || FAILED=1
    fi
}

# Only the YAML this repository authors: the CI workflows and the chezmoi data.
# The files under home/dot_config are application configs, and each application
# dictates its own format, so a shared style rule does not belong to them.
function lint_yaml() {
    local -a files=()

    while IFS= read -r file; do
        files+=("${file}")
    done < <(repo_files '.github' 'home/.chezmoidata' | grep -E '\.(yml|yaml)$')

    if [ ${#files[@]} -eq 0 ]; then
        echo "lint: no YAML files found" >&2
        return 1
    fi

    echo "yamllint: ${#files[@]} file(s)"
    (cd "${REPO_ROOT}" && yamllint_cmd -c .yamllint "${files[@]}") || FAILED=1
}

function main() {
    need shellcheck
    need chezmoi
    if ! command -v yamllint >/dev/null 2>&1; then
        need uvx
    fi

    lint_plain_shell
    lint_template_shell
    lint_yaml

    if [ "${FAILED}" -ne 0 ]; then
        echo "lint: FAILED" >&2
        return 1
    fi

    echo "lint: OK"
}

main "$@"
