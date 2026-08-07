#!/usr/bin/env bats

# bats file_tags=ubuntu

@test "[ubuntu] verify shell environment" {
    run command -v zsh
    [ "$status" -eq 0 ]
}

@test "[ubuntu] verify package manager" {
    run command -v apt-get
    [ "$status" -eq 0 ]
}

@test "[ubuntu] mise is installed" {
    run command -v mise
    [ "$status" -eq 0 ]
}
