# yazi: Yet Another Zsh Integration
function yy() {
	local tmp="$(mktemp -t "yazi-cwd.XXXXXX")"
	yazi "$@" --cwd-file="$tmp"
	if cwd="$(cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
		cd -- "$cwd"
	fi
	rm -f -- "$tmp"
}

function kexec() {
  local choice=$(kubectl get pods -o custom-columns=NAME:.metadata.name --no-headers=true | fzf)
  kubectl exec -it $choice -- sh
}

function klogs() {
  local choice=$(kubectl get pods -o custom-columns=NAME:.metadata.name --no-headers=true | fzf)
  kubectl logs -f $choice
}

function kdescribe() {
  local choice=$(kubectl get pods -o custom-columns=NAME:.metadata.name --no-headers=true | fzf)
  kubectl describe pod $choice
}
