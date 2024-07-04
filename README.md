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


## 👏 Acknowledgements

Inspiration and code was taken from many sources, including:

- [shunk031/dotfiles](https://github.com/shunk031/dotfiles).
- [caarlos0/dotfiles](https://github.com/caarlos0/dotfiles).

## 📝 License

The code is available under the [MIT license](https://github.com/pragmaticivan/dotfiles/blob/master/LICENSE).
