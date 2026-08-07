#!/usr/bin/env bats

# bats file_tags=common

@test "[common] configuration files exist" {
    files_exists=(
        "${HOME}/.config/zsh/.zshrc"
        "${HOME}/.config/starship.toml"
        "${HOME}/.config/alacritty/alacritty.toml"
        "${HOME}/.config/atuin/config.toml"
        "${HOME}/.config/bat/config"
        "${HOME}/.config/btop/btop.conf"
        "${HOME}/.config/ghostty/config"
        "${HOME}/.config/k9s/config.yaml"
        "${HOME}/.config/lazygit/config.yml"
        "${HOME}/.config/mise/config.toml"
        "${HOME}/.config/nvim/init.lua"
        "${HOME}/.config/yazi/yazi.toml"
        "${HOME}/.config/herdr/config.toml"
    )

    for file in "${files_exists[@]}"; do
        echo "Checking for existence of ${file}"
        [ -f "${file}" ]
    done
}

@test "[common] configuration directories exist" {
    directories_exists=(
        "${HOME}/.config/alacritty"
        "${HOME}/.config/atuin"
        "${HOME}/.config/bat"
        "${HOME}/.config/btop"
        "${HOME}/.config/ghostty"
        "${HOME}/.config/k9s"
        "${HOME}/.config/lazygit"
        "${HOME}/.config/mise"
        "${HOME}/.config/nvim"
        "${HOME}/.config/yazi"
        "${HOME}/.config/herdr"
        "${HOME}/.config/zsh"
    )

    for directory in "${directories_exists[@]}"; do
        echo "Checking for existence of directory ${directory}"
        [ -d "${directory}" ]
    done
}

@test "[common] verify git configuration" {
    # Verify git config is valid
    run git config --list
    [ "$status" -eq 0 ]
}

@test "[common] ~/.gitconfig is the only global git config" {
    [ -f "${HOME}/.gitconfig" ]

    # Git reads ~/.config/git/config too, and ~/.gitconfig wins on each shared
    # key. A second file hides the effective value, so it must not come back.
    [ ! -f "${HOME}/.config/git/config" ]
    [ ! -f "${HOME}/.config/git/ignore" ]

    for key in user.email user.name user.signingKey commit.gpgSign core.excludesFile; do
        echo "Checking ${key}"
        run git config --get "${key}"
        [ "$status" -eq 0 ]
        [ -n "$output" ]
    done

    [ "$(git config --get core.excludesFile)" = "~/.gitignore_global" ]
}

@test "[common] commit signatures verify against allowed_signers" {
    signers="${HOME}/.ssh/allowed_signers"
    [ -f "${signers}" ]

    # A machine with no signing key gets an empty file, and it cannot sign. CI
    # is that machine, so skip before each assertion that needs a key.
    if [ ! -s "${signers}" ]; then
        skip "no signing key on this machine, so allowed_signers is empty"
    fi

    # gpg.ssh.allowedSignersFile must point at the file chezmoi writes, or
    # `git log --show-signature` gives U and cannot name the signer.
    [ "$(git config --get gpg.ssh.allowedSignersFile)" = "~/.ssh/allowed_signers" ]

    # principals, namespaces, key type, key material.
    run awk 'NF != 4 { exit 1 }' "${signers}"
    [ "$status" -eq 0 ]
    grep -q 'namespaces="git"' "${signers}"

    # The commit address must be one of the principals, or git cannot match it.
    grep -qF "$(git config --get user.email)" "${signers}"

    # End to end: the last signed commit must verify as good.
    cd "$(chezmoi source-path)"
    run git log --format=%G? -1
    echo "Signature status: ${output}"
    [ "${output}" = "G" ]
}

@test "[common] chezmoi is on PATH" {
    run command -v chezmoi
    [ "$status" -eq 0 ]
}

@test "[common] verify ssh config" {
    [ -f "${HOME}/.ssh/config" ]
}

@test "[common] claude hooks are executable" {
    hooks=(
        "${HOME}/.claude/hooks/session-start.sh"
        "${HOME}/.claude/hooks/statusline.sh"
        "${HOME}/.claude/hooks/herdr-agent-state.sh"
    )

    for hook in "${hooks[@]}"; do
        echo "Checking hook ${hook}"
        [ -f "${hook}" ]
        [ -x "${hook}" ]
        run bash -n "${hook}"
        [ "$status" -eq 0 ]
    done
}

@test "[common] STE rule reaches every agent" {
    # Standing instructions carry the card. No hook repeats it on each prompt.
    [ ! -e "${HOME}/.claude/hooks/ste-mode.sh" ]
    ! grep -q "ste-mode" "${HOME}/.claude/settings.json"

    for doc in "${HOME}/.claude/CLAUDE.md" "${HOME}/.copilot/copilot-instructions.md"; do
        echo "Checking ${doc}"
        grep -q "STE MODE" "${doc}"
        grep -q "simplified-technical-english" "${doc}"
    done

    # The dictionaries do the work of the deleted checker, so grep must find them.
    skill="${HOME}/.agents/skills/simplified-technical-english"
    for dictionary in dictionary-approved dictionary-unapproved; do
        [ -f "${skill}/references/${dictionary}.md" ]
    done
    grep -qi "^ensure " "${skill}/references/dictionary-unapproved.md"

    # No python. The skill is judgment plus a lookup.
    [ ! -d "${skill}/scripts" ]

    for parent in "${HOME}/.claude/skills" "${HOME}/.copilot/skills"; do
        [ -e "${parent}/simplified-technical-english" ]
    done
}

@test "[common] the STE card stays small" {
    # The card is the text from "STE MODE" to the next heading of CLAUDE.md.
    card="${BATS_TEST_TMPDIR}/card.txt"
    awk '/^STE MODE/{f=1} f && /^## /{exit} f' \
        "${HOME}/.claude/CLAUDE.md" >"${card}"

    # The card is in the standing context of every session, so each word costs
    # tokens. It holds the scope and the rules of the most value. The 53 rules
    # and the dictionary belong in the skill.
    words=$(wc -w <"${card}")
    echo "Card is ${words} words (limit 200)"
    [ "${words}" -ge 50 ]
    [ "${words}" -le 200 ]
}

@test "[common] agent skills are individually symlinked" {
    [ -d "${HOME}/.agents/skills" ]

    for parent in "${HOME}/.claude/skills" "${HOME}/.copilot/skills"; do
        echo "Checking skills directory ${parent}"
        [ -d "${parent}" ]
        [ ! -L "${parent}" ]

        link_count=0
        shopt -s nullglob
        for entry in "${parent}"/*; do
            [ -L "${entry}" ] || continue
            [ -e "${entry}" ]
            link_count=$((link_count + 1))
        done
        shopt -u nullglob

        echo "Found ${link_count} skill symlinks in ${parent}"
        [ "${link_count}" -gt 0 ]
    done
}
