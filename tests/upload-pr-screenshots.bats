#!/usr/bin/env bats

SCRIPT="$BATS_TEST_DIRNAME/../home/dot_agents/skills/creating-pull-requests/scripts/executable_upload-pr-screenshots.sh"

setup() {
  export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
  export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com
  work=$(mktemp -d)
  git init -q --bare "$work/remote.git"
  git init -q -b main "$work/repo"
  git -C "$work/repo" remote add origin "$work/remote.git"
  git -C "$work/repo" commit -q --allow-empty -m init
  git -C "$work/repo" push -q origin main
  printf 'png-a' >"$work/before.png"
  printf 'png-b' >"$work/after.png"
}

teardown() {
  rm -rf "$work"
}

@test "creates the orphan branch and prints one link for each image" {
  cd "$work/repo"
  run bash "$SCRIPT" 12 "$work/before.png" "$work/after.png"
  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 2 ]
  [[ ${lines[0]} == "![before](https://github.com/"*"/pr-12/before.png?raw=true)" ]]
  run git -C "$work/remote.git" ls-tree -r --name-only pr-screenshots
  [ "$output" = "$(printf 'pr-12/after.png\npr-12/before.png')" ]
  run git -C "$work/remote.git" rev-list --count pr-screenshots
  [ "$output" -eq 1 ]
}

@test "the link contains the commit SHA that holds the image" {
  cd "$work/repo"
  run bash "$SCRIPT" 7 "$work/after.png"
  sha=$(sed -E 's#.*/blob/([0-9a-f]+)/.*#\1#' <<<"$output")
  run git -C "$work/remote.git" show "$sha:pr-7/after.png"
  [ "$output" = "png-b" ]
}

@test "parallel uploads for different PRs all land in their own folders" {
  cd "$work/repo"
  for pr in 1 2 3 4 5 6; do
    bash "$SCRIPT" "$pr" "$work/after.png" >"$work/out-$pr" 2>&1 &
  done
  wait
  run git -C "$work/remote.git" ls-tree -r --name-only pr-screenshots
  [ "$output" = "$(printf 'pr-%s/after.png\n' 1 2 3 4 5 6)" ]
  for pr in 1 2 3 4 5 6; do
    grep -q "pr-$pr/after.png" "$work/out-$pr"
  done
}

@test "a second upload for the same PR keeps the first link valid" {
  cd "$work/repo"
  first=$(bash "$SCRIPT" 9 "$work/after.png")
  printf 'png-c' >"$work/after.png"
  bash "$SCRIPT" 9 "$work/after.png"
  sha=$(sed -E 's#.*/blob/([0-9a-f]+)/.*#\1#' <<<"$first")
  run git -C "$work/remote.git" show "$sha:pr-9/after.png"
  [ "$output" = "png-b" ]
}

@test "rejects a PR number that is not digits" {
  cd "$work/repo"
  run bash "$SCRIPT" abc "$work/after.png"
  [ "$status" -eq 2 ]
  [[ $output == *"must be digits"* ]]
}

@test "does not leave a temporary ref behind" {
  cd "$work/repo"
  bash "$SCRIPT" 3 "$work/after.png"
  run git for-each-ref refs/upload-pr-screenshots
  [ -z "$output" ]
}

@test "links point at the GitHub repository of the remote URL" {
  cd "$work/repo"
  git remote set-url origin git@github.com:acme/shop.git
  git config url."$work/remote.git".insteadOf git@github.com:acme/shop.git
  run bash "$SCRIPT" 4 "$work/after.png"
  [ "$status" -eq 0 ]
  [[ $output == "![after](https://github.com/acme/shop/blob/"*"/pr-4/after.png?raw=true)" ]]
}
