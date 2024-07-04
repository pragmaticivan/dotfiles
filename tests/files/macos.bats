#!/usr/bin/env bats

@test "[macos] dotfiles" {
    files_exists=(
        "${HOME}/.zsh/client/zshrc"
        "${HOME}/.zsh/client/zprofile"
        "${HOME}/.bash/client/bashrc"
    )
    for file in "${files_exists[@]}"; do
        echo "Checking ${file}"
        [ -f "${file}" ]
    done

    directories_exists=(
        "${HOME}/.local/bin/client"
        "${HOME}/.zprezto"
    )
    for directory in "${directories_exists[@]}"; do
        echo "Checking ${directory}"
        [ -d "${directory}" ]
    done

    symbolic_links_exists=(
        "${HOME}/Library/Application Support/iTerm2/DynamicProfiles/hotkey_window.json"
    )
    for link in "${symbolic_links_exists[@]}"; do
        echo "Checking ${link}"
        [ -L "${link}" ]
    done

    files_not_exists=(
        "${HOME}/.zsh/server/zshrc"
        "${HOME}/.zsh/server/zprofile"
    )
    for file in "${files_not_exists[@]}"; do
        echo "Checking ${file}"
        [ ! -f "${file}" ]
    done
}
