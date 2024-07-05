![dotfiles](https://github.com/pragmaticivan/dotfiles/assets/301291/291198e8-5175-4562-88a2-c885458cc003)

## 🚀 Overview

Your dotfiles are how you personalize your system. These are mine.

Maintaining dotfiles for your computer is crucial for several reasons. Firstly, it ensures consistency across different machines, allowing you to replicate your preferred settings, shortcuts, and configurations effortlessly. This consistency saves time and frustration when transitioning between workstations or setting up a new system. Secondly, dotfiles serve as a personal backup of your customized environment. By version-controlling them with tools like Git, you not only safeguard against accidental changes but also enable easy restoration in case of system crashes or upgrades.

## 🌴 Setup

To set up the dotfiles run the appropriate snippet in the terminal.

### 💻 `MacOS` [![MacOS](https://github.com/pragmaticivan/dotfiles/actions/workflows/macos.yaml/badge.svg)](https://github.com/pragmaticivan/dotfiles/actions/workflows/macos.yaml)

- Configuration snippet of the Apple Silicon MacOS environment for client macnine:

```console
bash -c "$(curl -fsLS https://raw.githubusercontent.com/pragmaticivan/dotfiles/main/setup.sh)"
```

### 🖥️ `Ubuntu` [![Ubuntu](https://github.com/pragmaticivan/dotfiles/actions/workflows/ubuntu.yaml/badge.svg)](https://github.com/pragmaticivan/dotfiles/actions/workflows/ubuntu.yaml)

- Configuration snippet of the Ubuntu environment for both client and server machine:

```console
bash -c "$(wget -qO - https://raw.githubusercontent.com/pragmaticivan/dotfiles/main/setup.sh)"
```

### Minimal setup

The following is a minimal setup command to install chezmoi and my dotfiles from the github repository on a new empty machine:

> sh -c "$(curl -fsLS get.chezmoi.io)" -- init pragmaticivan --apply

## 🛠️ Update & Test 🧪

Updating and testing the dotfiles follows [chezmoi's daily operations](https://www.chezmoi.io/user-guide/daily-operations/).
To verify that the updated scripts work correctly, run the scripts on the actual local machine and on the docker container.

### 🐳 Test on Docker Container

Test the executation of the setup scripts on Ubuntu in its initial state.
The following command will launch the test environment using Docker 🐳.

```shell
make docker-dev

# docker run -it -v "$(pwd):/home/$(whoami)/.local/share/chezmoi" dotfiles /bin/bash --login
# pragmaticivan@6f97d279cb51:~$
```

Run the [`chezmoi init --apply`](https://www.chezmoi.io/user-guide/setup/#use-a-hosted-repo-to-manage-your-dotfiles-across-multiple-machines) command to verify that the system is set up correctly.

```shell
pragmaticivan@5f93d270cb51:~$ chezmoi init --apply
```

### 🦇 Unit Test with [Bats](https://github.com/bats-core/bats-core)

Test the shellscript for setup with [Bash Automated Testing System (bats)](https://github.com/bats-core/bats-core).
The scripts for the unit test can be found under [`./tests`](https://github.com/pragmaticivan/dotfiles/tree/main/tests) directory.

## 👏 Acknowledgements

Inspiration and code was taken from many sources, including:

- [shunk031/dotfiles](https://github.com/shunk031/dotfiles).
- [caarlos0/dotfiles](https://github.com/caarlos0/dotfiles).

## 📝 License

The code is available under the [MIT license](https://github.com/pragmaticivan/dotfiles/blob/main/LICENSE).
