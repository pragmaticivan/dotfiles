# ---------------------------------------------------------------------------------------------------------------------
# ssh-agent
# ---------------------------------------------------------------------------------------------------------------------
# Keeps one agent for each shell and each login, with the keys the macOS
# keychain holds.
#
# ~/.ssh/config sets UseKeychain, but that belongs to `ssh`. Git signs a commit
# with `ssh-keygen -Y sign`, and `ssh-keygen` does not read the keychain, so
# commit signing needs an agent. The socket goes below ~/.ssh, because macOS
# erases /tmp at each boot.
#
# `ssh-add -l` gives 0 with keys, 1 for an agent with no keys, and 2 for no
# agent. So this keeps an agent that another tool started, and it makes a new
# one only when there is none.
#
# `ssh-add -l` gives a non-zero status as its normal answer, so each call is in
# an OR list. A bare call stops a caller that sets `errexit`.
if [[ "$OSTYPE" == darwin* ]]; then
    _ssh_agent_state=0
    ssh-add -l >/dev/null 2>&1 || _ssh_agent_state=$?

    case ${_ssh_agent_state} in
    1)
        ssh-add --apple-load-keychain -q 2>/dev/null || true
        ;;
    2)
        export SSH_AUTH_SOCK="${HOME}/.ssh/agent.sock"
        if ! ssh-add -l >/dev/null 2>&1; then
            rm -f "${SSH_AUTH_SOCK}"
            ssh-agent -a "${SSH_AUTH_SOCK}" >/dev/null 2>&1 || true
            ssh-add --apple-load-keychain -q 2>/dev/null || true
        fi
        ;;
    esac

    unset _ssh_agent_state
fi
