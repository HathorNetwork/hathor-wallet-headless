
.PHONY: all
all:
	@echo "No default action."

# docker:

docker_subtag := dev-$(shell git describe --tags --dirty)
docker_tag := hathor-wallet-service:$(docker_subtag)
docker_build_arg :=
docker_build_flags :=
ifneq ($(docker_build_arg),)
	docker_build_flags +=  --build-arg $(docker_build_arg)
endif

.PHONY: docker
docker: Dockerfile package.json
	docker build$(docker_build_flags) -f Dockerfile -t $(docker_tag) ./

.PHONY: docker-push
docker-push: docker
	docker tag $(docker_tag) hathornetwork/hathor-wallet-headless:$(docker_subtag)
	docker push hathornetwork/hathor-wallet-headless:$(docker_subtag)
