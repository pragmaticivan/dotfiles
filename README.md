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

### 🧹 Lint

`make lint` uses shellcheck on the shell files and on each rendered `*.sh.tmpl` template.
It also uses yamllint on the CI workflows and the chezmoi data. The `Lint` workflow uses the same script on
each push and each `pull request`.

Rules come from `./.yamllint`. That file is not the same as `home/dot_config/yamllint/config`,
which is the global config for other work.

### 📌 External pins

`.chezmoiexternals/*.toml.tmpl` and `.chezmoidata/skills.yaml` pin each upstream commit by SHA.
Dependabot cannot read those files, so `make update-pins` reports the pins that are behind the
upstream head. Add `--write` to rewrite them:

```console
./scripts/update-pins.sh --write
chezmoi apply --refresh-externals
```

The `Update pins` workflow does the same each month, and it opens a `pull request`. Read that
`pull request` before the merge. It moves a pin to the upstream head, which can be an untested
commit, and it does not change the `# pin:` comment.

### 🔀 macOS install profiles (personal vs restricted)

On macOS, Homebrew apps are installed from a templated `Brewfile` that respects a profile:

- personal: full set of apps (default)
- restricted: minimal set for locked-down environments

The profile is stored per machine in `~/.config/chezmoi/chezmoi.toml`, captured at `chezmoi init`. Set it once:

```
DOTFILES_PROFILE=restricted chezmoi init --apply   # or answer the "Install profile" prompt
```

Every later `chezmoi apply` keeps that profile. To check: `chezmoi data | jq .profile`.

The env var also works as a one-off override on any command:

```
DOTFILES_PROFILE=restricted chezmoi apply
```

Be aware that a one-off override leaves the affected files differing from the stored target state, so the next plain `chezmoi apply` reverts them. Prefer changing the stored value (re-run `chezmoi init`, or edit `profile` in `~/.config/chezmoi/chezmoi.toml`).

Profile-aware targets are `Brewfile` (personal-only casks: extra browsers, chat apps, media, games) and `.gitconfig` (commit email). Note that `brew bundle` never uninstalls, so switching to `restricted` stops installing personal apps but does not remove ones already present.

### 🔔 Divoom Pixoo 64 alerts for Claude Code (optional)

Claude Code can show its state on a Divoom Pixoo 64 and alert the Mac when it needs you. The device stays quiet. `terminal-notifier` shows a macOS notification with the state, the project, the git branch, and the message, and it plays a system sound. The Brewfile installs `terminal-notifier`. macOS asks for permission at the first alert. The feature is off by default. Turn it on at `chezmoi init`:

```
chezmoi init --apply   # answer "Send Claude Code alerts to a Divoom Pixoo 64", then give the IP
```

The answer is kept in `~/.config/chezmoi/chezmoi.toml` as `pixooEnabled` and `pixooAddress`. If the option is off, chezmoi does not install the script and does not add the hooks to `~/.claude/settings.json`.

The panel has three zones. The top zone gives the state with a 16 by 16 icon and a large headline, thus you can read it from across the room. The middle zone gives the project, the git branch, and the message. The bottom zone gives the clock.

| Event              | Icon      | Headline    | Mac notification  | Sound  |
| ------------------ | --------- | ----------- | ----------------- | ------ |
| `Notification`     | bell      | `NEEDS YOU` | "Claude needs you" | Sosumi |
| `Stop`             | check     | `DONE`      | "Claude is done"   | Glass  |
| `UserPromptSubmit` | hourglass | `WORKING`   | none              | none   |
| `SessionEnd`       | —         | clock face  | none              | none   |

The notification gives the project and the branch in the subtitle, and the message in the body. Each project gets its own group, thus a new alert replaces the last alert of that project only.

The message keeps only its useful part. "Claude needs your permission to use Bash" becomes `ALLOW BASH?`. If a message does not match a known form, the panel wraps it on two lines. If there is no message, the panel drops the line and centers the remaining text, and the notification gives a short default text.

Test the device and see the frame in your terminal:

```
~/.claude/hooks/pixoo-notify.py test --host 192.168.30.26            # send a frame and show an alert
~/.claude/hooks/pixoo-notify.py test --preview --dry-run --host x    # draw in the terminal only
```

To change the text or the sound, edit the `notice`, `fallback`, and `sound` values of the event in the script. Use a sound name from `/System/Library/Sounds`, for example `Hero` or `Funk`.

Set `PIXOO_NOTIFY_DISABLE=1` to stop the alerts for one session, for example when you are away from that network. If the device is off, the hook does nothing and Claude Code continues.

The hook calls `/usr/bin/python3`, and not `python3` from the path. A Python that mise installs has no permission for the local network on macOS, thus each request fails with "no route to host". The system Python has the permission. If you see that error, use the full path:

```
/usr/bin/python3 ~/.claude/hooks/pixoo-notify.py test --host 192.168.30.26
```

## 👏 Acknowledgements

Inspiration and code was taken from many sources, including:

- [shunk031/dotfiles](https://github.com/shunk031/dotfiles).
- [caarlos0/dotfiles](https://github.com/caarlos0/dotfiles).
- [KevinNitroG/dotfiles](https://github.com/KevinNitroG/dotfiles).

## 📝 License

The code is available under the [MIT license](https://github.com/pragmaticivan/dotfiles/blob/main/LICENSE).
