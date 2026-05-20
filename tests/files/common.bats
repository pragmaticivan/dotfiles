#!/usr/bin/env bats

# bats file_tags=common

@test "[common] configuration files exist" {
    files_exists=(
        "${HOME}/.zshrc"
        "${HOME}/.config/zsh/.zshrc"
        "${HOME}/.config/starship.toml"
        "${HOME}/.config/alacritty/alacritty.toml"
        "${HOME}/.config/atuin/config.toml"
        "${HOME}/.config/bat/config"
        "${HOME}/.config/btop/btop.conf"
        "${HOME}/.config/ghostty/config"
        "${HOME}/.config/git/config"
        "${HOME}/.config/k9s/config.yaml"
        "${HOME}/.config/lazygit/config.yml"
        "${HOME}/.config/mise/config.toml"
        "${HOME}/.config/nvim/init.lua"
        "${HOME}/.config/yazi/yazi.toml"
        "${HOME}/.config/zellij/config.kdl"
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
        "${HOME}/.config/git"
        "${HOME}/.config/k9s"
        "${HOME}/.config/lazygit"
        "${HOME}/.config/mise"
        "${HOME}/.config/nvim"
        "${HOME}/.config/yazi"
        "${HOME}/.config/zellij"
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

@test "[common] chezmoi is on PATH" {
    run command -v chezmoi
    [ "$status" -eq 0 ]
}

@test "[common] chezmoi doctor reports no errors" {
    run chezmoi doctor
    [ "$status" -eq 0 ]
    [[ "$output" != *"error"* ]] || {
        echo "$output"
        return 1
    }
}

@test "[common] verify ssh config" {
    [ -f "${HOME}/.ssh/config" ]
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
