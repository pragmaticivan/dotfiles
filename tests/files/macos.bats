#!/usr/bin/env bats

@test "[macos] dotfiles" {
    files_exists=(
        "${HOME}/.zshrc"
        "${HOME}/.zprofile"
        "${HOME}/.bashrc"
    )
    for file in "${files_exists[@]}"; do
        echo "Checking ${file}"
        [ -f "${file}" ]
    done

    # directories_exists=(
    #     "${HOME}/.local/bin/client"
    # )
    # for directory in "${directories_exists[@]}"; do
    #     echo "Checking ${directory}"
    #     [ -d "${directory}" ]
    # done

    # symbolic_links_exists=(
    #     "${HOME}/Library/Application Support/iTerm2/DynamicProfiles/hotkey_window.json"
    # )
    # for link in "${symbolic_links_exists[@]}"; do
    #     echo "Checking ${link}"
    #     [ -L "${link}" ]
    # done

    # files_not_exists=(
    #     "${HOME}/.zsh/zshrc"
    #     "${HOME}/.zsh/zprofile"
    # )
    # for file in "${files_not_exists[@]}"; do
    #     echo "Checking ${file}"
    #     [ ! -f "${file}" ]
    # done
}
