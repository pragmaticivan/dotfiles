---
theme:
  override:
    code:
      alignment: left
      background: false
---

What are Dotfiles?
===

Configuration files that customize your development environment

<!-- column_layout: [1, 1] -->

<!-- column: 0 -->

## Common dotfiles:

* `.bashrc` / `.zshrc` - Shell configuration
* `.gitconfig` - Git settings
* `.vimrc` / `.nvim/` - Editor configuration
* `.tmux.conf` - Terminal multiplexer
* `.ssh/config` - SSH configuration
* `.aliases` - Custom command shortcuts

<!-- column: 1 -->

## Why you need dotfiles:

* **Productivity** - Optimized workflows and shortcuts
* **Consistency** - Same environment across all machines
* **Backup** - Never lose your customizations again
* **Sharing** - Learn from others' configurations
* **Quick setup** - New machine ready in minutes
* **Version control** - Track and revert changes
* **Portability** - Take your environment anywhere

<!-- end_slide -->

Why Manage Dotfiles with Chezmoi?
===

A modern approach to dotfile management

* **Secure** - Templates and secrets management with encryption
* **Cross-platform** - Works seamlessly on Linux, macOS, and Windows
* **Template-driven** - Dynamic configuration based on machine/OS
* **Git-based** - Version controlled with conflict resolution
* **Machine-specific** - Different configs for different environments
* **Easy migration** - Handles file permissions and symlinks

<!-- end_slide -->

Getting Started with Chezmoi
===

Installation and initial setup

```bash +exec
# Install chezmoi (macOS with Homebrew)
brew install chezmoi

# Alternative: direct install
sh -c "$(curl -fsLS get.chezmoi.io)"
```

```bash +exec
# Initialize chezmoi with your dotfiles repository
chezmoi init https://github.com/yourusername/dotfiles.git

# Or start fresh
chezmoi init
```

```bash +exec
# Check what chezmoi will do
chezmoi diff

# Apply the dotfiles
chezmoi apply
```

<!-- end_slide -->

Adding and Managing Files
===

How to add files to chezmoi management

```bash +exec
# Add a file to chezmoi
chezmoi add ~/.bashrc

# Add with automatic template detection
chezmoi add --template ~/.gitconfig

# Add an entire directory
chezmoi add ~/.config/nvim
```

```bash +exec
# Edit a managed file
chezmoi edit ~/.bashrc

# See what files are managed
chezmoi managed

# Check differences
chezmoi diff ~/.bashrc
```

<!-- end_slide -->

Templates and Machine-Specific Configuration
===

Dynamic configuration using Go templates

<!-- column_layout: [1, 1] -->

<!-- column: 0 -->

## `.chezmoi.toml.tmpl` example:

```toml
[data]
    email = "{{ .email }}"
    name = "{{ .name }}"
[data.machine]
    hostname = "{{ .chezmoi.hostname }}"
    os = "{{ .chezmoi.os }}"
```

## `.gitconfig.tmpl`:

```ini
[user]
    name = {{ .name }}
    email = {{ .email }}
{{ if eq .chezmoi.os "darwin" }}
[credential]
    helper = osxkeychain
{{ end }}
```

<!-- column: 1 -->

## Template functions:

* `{{ .chezmoi.hostname }}` - Machine hostname
* `{{ .chezmoi.os }}` - Operating system
* `{{ .chezmoi.arch }}` - CPU architecture
* `{{ .email }}` - Custom data variables
* `{{ if eq .chezmoi.os "linux" }}` - Conditionals

## Data sources:

* User input prompts
* Environment variables
* External commands
* JSON/YAML files

<!-- end_slide -->


Thank You!
===

## Questions?

🎯 **Get started today:**
* `brew install chezmoi`
* `chezmoi init`
* Start managing your dotfiles!

📚 **Resources:**
* [chezmoi.io](https://chezmoi.io) - Official documentation
* [github.com/twpayne/chezmoi](https://github.com/twpayne/chezmoi) - Source code
* [r/chezmoi](https://reddit.com/r/chezmoi) - Community discussions

💬 **Let's discuss your dotfile challenges!**

