# ---------------------------------------------------------------------------------------------------------------------
# herdr
# ---------------------------------------------------------------------------------------------------------------------
# HERDR_PANE_ID is exported inside herdr panes, so this never nests.
if [[ -o interactive ]] \
  && [[ -z "$HERDR_PANE_ID" ]] \
  && [[ -z "$TMUX" ]] \
  && [[ -z "$VSCODE_INJECTION" ]] \
  && [[ "$TERM_PROGRAM" != "vscode" ]] \
  && [[ -z "$INSIDE_EMACS" ]] \
  && [[ -z "$ZED_TERM" ]] \
  && command -v herdr >/dev/null 2>&1; then
  exec herdr
fi
