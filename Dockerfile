ARG BASE_IMAGE=ubuntu:24.04

# ========================================
#  Base environment
# ========================================

FROM ${BASE_IMAGE} AS base

# Avoid the following error:
# curl: (77) error setting certificate file: /etc/ssl/certs/ca-certificates.crt
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates

# Install minimum requirements.
# `apt-get update` runs again because a cached layer above can leave the package
# lists empty, and then this install fails.
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    git \
    wget \
    curl

ARG USERNAME=pragmaticivan
ARG USER_UID=1000
ARG USER_GID=${USER_UID}

# Ubuntu 24.04 ships a UID 1000 "ubuntu" user, so remove it before useradd.
RUN userdel --remove ubuntu 2>/dev/null || true
RUN groupadd --gid ${USER_GID} ${USERNAME} \
    && useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME} -G sudo -s /bin/bash \
    && echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers \
    && echo 'Defaults verifypw = any' >> /etc/sudoers
USER ${USERNAME}

WORKDIR /home/${USERNAME}

FROM base AS dev

# Install chezmoi
RUN sudo sh -c "$(curl -fsLS get.chezmoi.io)" -- -b /usr/local/bin

# Install requirements for testing
RUN sudo apt-get update && sudo apt-get install -y --no-install-recommends \
    bats \
    shellcheck \
    yamllint

WORKDIR /home/${USERNAME}/.local/share/chezmoi
