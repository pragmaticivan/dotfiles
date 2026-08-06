#!/usr/bin/env bash
#
# Compares each pinned upstream commit against the head of its default branch,
# and rewrites the pin. Dependabot cannot read these files, so without this
# script the pins stay at whatever commit they got on the day someone added them.
#
#   ./scripts/update-pins.sh          # report only, no write
#   ./scripts/update-pins.sh --write  # rewrite the pins in place
#
# Needs git only. It reads each upstream head with `git ls-remote`, so it has no
# API rate limit and it needs no token.

set -Eeuo pipefail

if [ "${DOTFILES_DEBUG:-}" ]; then
    set -x
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
declare -r REPO_ROOT
declare -a TARGETS=(
    "home/.chezmoiexternals/antidote.toml.tmpl"
    "home/.chezmoiexternals/universal.toml.tmpl"
    "home/.chezmoiexternals/unix.toml.tmpl"
    "home/.chezmoiexternals/yazi.toml.tmpl"
    "home/.chezmoidata/skills.yaml"
)

WRITE=0
[ "${1:-}" = "--write" ] && WRITE=1

# A newline-separated "repo<TAB>sha" cache. macOS ships bash 3.2, which has no
# associative array, so this stays a plain string.
HEAD_CACHE=""
CHANGED=0
STALE=0

# Echoes the head commit of the repository's default branch, and caches it.
#
# `git ls-remote HEAD` gives the default branch head in one call. The GitHub REST
# API needs two calls per repository, and its unauthenticated limit of 60 calls
# per hour is too low for the number of pins here.
function head_sha() {
    local repo="$1"
    local cached sha

    cached="$(printf '%s\n' "${HEAD_CACHE}" | awk -F'\t' -v r="${repo}" '$1==r {print $2; exit}')"
    if [ -n "${cached}" ]; then
        echo "${cached}"
        return 0
    fi

    sha="$(git ls-remote "https://github.com/${repo}" HEAD 2>/dev/null | awk 'NR==1 {print $1}')"

    # An empty or short answer means the call failed. Stop, because a silent
    # failure here reports every pin as stale and rewrites nothing useful.
    if ! printf '%s' "${sha}" | grep -qE '^[0-9a-f]{40}$'; then
        echo "cannot read the head of ${repo}" >&2
        return 1
    fi

    HEAD_CACHE="${HEAD_CACHE}${repo}	${sha}
"
    echo "${sha}"
}

# Echoes every "owner/repo<TAB>sha" pair that the file pins.
function pins_in() {
    local file="$1"

    # A file holds only some of these three forms, and grep returns 1 when it
    # matches nothing. Without `|| true` that exit code ends the function here
    # under `set -e`, and the later forms are never read.

    # github.com/OWNER/REPO/archive/SHA.tar.gz
    { grep -oE 'github\.com/[^/]+/[^/]+/archive/[0-9a-f]{40}' "${file}" || true; } |
        sed -E 's#github\.com/([^/]+/[^/]+)/archive/([0-9a-f]{40})#\1\t\2#'

    # raw.githubusercontent.com/OWNER/REPO/SHA/path
    { grep -oE 'raw\.githubusercontent\.com/[^/]+/[^/]+/[0-9a-f]{40}' "${file}" || true; } |
        sed -E 's#raw\.githubusercontent\.com/([^/]+/[^/]+)/([0-9a-f]{40})#\1\t\2#'

    # skills.yaml: a "repo:" line, then a "sha:" line
    awk '
        /^[[:space:]]+repo:[[:space:]]/ { repo = $2 }
        /^[[:space:]]+sha:[[:space:]]/  { if (repo != "") print repo "\t" $2 }
    ' "${file}"
}

function main() {
    cd "${REPO_ROOT}"

    for file in "${TARGETS[@]}"; do
        while IFS=$'\t' read -r repo old; do
            [ -n "${repo}" ] || continue

            local new
            new="$(head_sha "${repo}")"

            if [ "${new}" = "${old}" ]; then
                echo "current  ${repo} ${old:0:12} (${file})"
                continue
            fi

            STALE=$((STALE + 1))
            echo "stale    ${repo} ${old:0:12} -> ${new:0:12} (${file})"

            if [ "${WRITE}" -eq 1 ]; then
                # The SHA is unique enough to substitute without the repo name,
                # and one repo can be pinned on several lines of one file.
                sed -i.bak "s/${old}/${new}/g" "${file}"
                rm -f "${file}.bak"
                CHANGED=1
            fi
        done < <(pins_in "${file}" | sort -u)
    done

    if [ "${STALE}" -eq 0 ]; then
        echo "All the pins are at the upstream head."
        return 0
    fi

    if [ "${CHANGED}" -eq 1 ]; then
        echo "${STALE} pin(s) rewritten. Run: chezmoi apply --refresh-externals"
    else
        echo "${STALE} pin(s) behind. Run with --write to rewrite them."
    fi
}

main "$@"
