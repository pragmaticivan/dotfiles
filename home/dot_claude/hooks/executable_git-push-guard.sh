#!/usr/bin/env bash
# PreToolUse hook. It stops a `git push` that goes to main or master.
# Exit code 2 tells Claude Code to deny the tool call.
set -uo pipefail

PROTECTED_BRANCHES="main master"

payload=$(cat)
command=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[[ -n ${command} ]] || exit 0
cwd=$(printf '%s' "$payload" | jq -r '.cwd // empty' 2>/dev/null)
[[ -n ${cwd} ]] || cwd=$PWD

deny() {
    printf 'Blocked: this pushes to "%s". Push a feature branch, then open a pull request.\n' "$1" >&2
    exit 2
}

is_protected() {
    local branch=$1
    local protected
    for protected in $PROTECTED_BRANCHES; do
        [[ ${branch} == "${protected}" ]] && return 0
    done
    return 1
}

current_branch() {
    git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null
}

# A refspec is [+]<src>[:<dst>]. The destination decides the risk.
destination_of() {
    local refspec=${1#+}
    [[ ${refspec} == *:* ]] && refspec=${refspec##*:}
    refspec=${refspec#refs/heads/}
    [[ ${refspec} == HEAD ]] && refspec=$(current_branch)
    printf '%s' "$refspec"
}

check_push() {
    local -a args=("$@")
    local -a positional=()
    local delete=0 index=0 arg

    while ((index < ${#args[@]})); do
        arg=${args[index]}
        case ${arg} in
            --all | --mirror) deny "all branches, which includes main" ;;
            --delete | -d) delete=1 ;;
            -o | --push-option | --receive-pack | --exec) ((index++)) ;;
            -*) ;;
            *) positional+=("${arg}") ;;
        esac
        ((index++))
    done

    # positional[0] is the remote. The rest are refspecs or branches to delete.
    local -a refspecs=("${positional[@]:1}")

    if ((${#refspecs[@]} == 0)); then
        ((delete == 1)) && return 0
        local branch
        branch=$(current_branch)
        is_protected "${branch}" && deny "${branch}"
        return 0
    fi

    local refspec destination
    for refspec in "${refspecs[@]}"; do
        destination=$(destination_of "${refspec}")
        is_protected "${destination}" && deny "${destination}"
    done
}

while IFS= read -r segment; do
    read -ra tokens <<<"${segment}"
    ((${#tokens[@]} > 1)) || continue

    push_index=-1
    saw_git=0
    for index in "${!tokens[@]}"; do
        [[ ${tokens[index]} == git || ${tokens[index]} == */git ]] && saw_git=1
        if ((saw_git == 1)) && [[ ${tokens[index]} == push ]]; then
            push_index=$index
            break
        fi
    done
    ((push_index >= 0)) || continue

    check_push "${tokens[@]:$((push_index + 1))}"
done < <(printf '%s\n' "$command" | tr ';|&\n' '\n')

exit 0
