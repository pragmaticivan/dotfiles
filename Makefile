DOCKER_IMAGE_NAME=dotfiles
DOCKER_PLATFORM=linux/arm64
#
# Docker
#

.PHONY: docker-build-base
docker-build-base:
	docker build -t $(DOCKER_IMAGE_NAME) \
		--target base \
		--platform $(DOCKER_PLATFORM) . \
		--build-arg USERNAME="$$(whoami)"

.PHONY: docker-run-base
docker-run-base: docker-build-base
	docker run --rm -it \
		--platform $(DOCKER_PLATFORM) $(DOCKER_IMAGE_NAME) \
		/bin/bash --login

.PHONY: docker-build-dev
docker-build-dev:
	docker build -t $(DOCKER_IMAGE_NAME) \
		--target dev \
		--platform $(DOCKER_PLATFORM) . \
		--build-arg USERNAME="$$(whoami)"

.PHONY: docker-dev
docker-dev: docker-build-dev
	docker run --rm -it \
		-v "$$(pwd):/home/$$(whoami)/.local/share/chezmoi" \
		--platform $(DOCKER_PLATFORM) $(DOCKER_IMAGE_NAME) \
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

.PHONY: reset
reset:
	chezmoi state delete-bucket --bucket=scriptState

.PHONY: reset-config
reset-config:
	chezmoi init --data=false
