#!/usr/bin/env bats

# bats file_tags=common
@test "[common] dotfiles" {
    files_exists=(
        "${HOME}/.config/git/ignore"
        "${HOME}/.config/git/config"
        "${HOME}/.ssh/config"
    )
    for file in "${files_exists[@]}"; do
        echo "Checking ${file}"
        [ -f "${file}" ]
    done

    # directories_exists=(
    #     "${HOME}/.config/fzf"
    # )
    # for directory in "${directories_exists[@]}"; do
    #     echo "Checking ${directory}"
    #     [ -d "${directory}" ]
    # done

    # symbolic_links_exists=(
    #     "${HOME}/.zshrc"
    #     "${HOME}/.zprofile"
    # )
    # for link in "${symbolic_links_exists[@]}"; do
    #     echo "Checking ${link}"
    #     [ -L "${link}" ]
    # done
}
