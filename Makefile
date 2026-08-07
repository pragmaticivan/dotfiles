DOCKER_IMAGE_NAME=dotfiles
DOCKER_PLATFORM=linux/arm64
# Each target gets its own tag. One shared tag makes the last build win, so
# `docker-run-base` could start the dev image instead of the base image.
DOCKER_IMAGE_BASE=$(DOCKER_IMAGE_NAME):base
DOCKER_IMAGE_DEV=$(DOCKER_IMAGE_NAME):dev
#
# Docker
#

.PHONY: docker-build-base
docker-build-base:
	docker build -t $(DOCKER_IMAGE_BASE) \
		--target base \
		--platform $(DOCKER_PLATFORM) . \
		--build-arg USERNAME="$$(whoami)"

.PHONY: docker-run-base
docker-run-base: docker-build-base
	docker run --rm -it \
		--platform $(DOCKER_PLATFORM) $(DOCKER_IMAGE_BASE) \
		/bin/bash --login

.PHONY: docker-build-dev
docker-build-dev:
	docker build -t $(DOCKER_IMAGE_DEV) \
		--target dev \
		--platform $(DOCKER_PLATFORM) . \
		--build-arg USERNAME="$$(whoami)"

.PHONY: docker-dev
docker-dev: docker-build-dev
	docker run --rm -it \
		-v "$$(pwd):/home/$$(whoami)/.local/share/chezmoi" \
		--platform $(DOCKER_PLATFORM) $(DOCKER_IMAGE_DEV) \
		/bin/bash --login
#
# Chezmoi
#

.PHONY: init
init:
	chezmoi init --apply --verbose

.PHONY: update
update:
	chezmoi apply --verbose

.PHONY: watch
watch:
	DOTFILES_DEBUG=1 watchexec -- chezmoi apply --verbose

#
# Lint
#

.PHONY: lint
lint:
	./scripts/lint.sh

.PHONY: update-pins
update-pins:
	./scripts/update-pins.sh

.PHONY: reset
reset:
	chezmoi state delete-bucket --bucket=scriptState

.PHONY: reset-config
reset-config:
	chezmoi init --data=false
