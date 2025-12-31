#!/usr/bin/env bats

# bats test_tags=ubuntu:client
@test "[ubuntu-client] verify shell environment" {
    run command -v zsh
    [ "$status" -eq 0 ]
}

# bats test_tags=ubuntu:server
@test "[ubuntu-server] verify shell environment" {
    run command -v zsh
    [ "$status" -eq 0 ]
}

@test "[ubuntu] verify package manager" {
    run command -v apt-get
    [ "$status" -eq 0 ]
}
