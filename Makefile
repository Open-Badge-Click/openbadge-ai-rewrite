IMAGE ?= ai-engine-node
NAME  ?= ai-engine-node
PORT  ?= 3000

.PHONY: build up down restart logs

build:
	docker build -t $(IMAGE) .

up: build
	-docker rm -f $(NAME) 2>/dev/null
	docker run -d --name $(NAME) --restart unless-stopped --env-file .env -e PORT=3000 -p $(PORT):3000 $(IMAGE)

down:
	-docker rm -f $(NAME)

restart: down up

logs:
	docker logs -f $(NAME)
