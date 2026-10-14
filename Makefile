IMAGE ?= ai-engine-node
NAME  ?= ai-engine-node
PORT  ?= 3000

REGISTRY ?= europe-west1-docker.pkg.dev/winter-campaign-452210-t1/ai-engine-node
TAG      ?= $(shell git rev-parse --short HEAD)

.PHONY: build push up down restart logs

build:
	docker build -t $(IMAGE) .

push: build
	docker tag $(IMAGE) $(REGISTRY)/$(IMAGE):$(TAG)
	docker tag $(IMAGE) $(REGISTRY)/$(IMAGE):latest
	docker push $(REGISTRY)/$(IMAGE):$(TAG)
	docker push $(REGISTRY)/$(IMAGE):latest

up: build
	-docker rm -f $(NAME) 2>/dev/null
	docker run -d --name $(NAME) --restart unless-stopped --env-file .env -e PORT=3000 -p $(PORT):3000 $(IMAGE)

down:
	-docker rm -f $(NAME)

restart: down up

logs:
	docker logs -f $(NAME)
