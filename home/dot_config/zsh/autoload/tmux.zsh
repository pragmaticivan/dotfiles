# if [[ -z "$TMUX" ]] \
#   && [[ -z "$VSCODE_INJECTION" ]] \
#   && [[ "$TERM_PROGRAM" != "vscode" ]] \
#   && [[ -z "$INSIDE_EMACS" ]] \
#   && [[ -z "$ZED_TERM" ]] \
#   && command -v tmux >/dev/null 2>&1; then
#   exec tmux new-session -A -s main
# fi
