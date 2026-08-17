# --env-file is required, not cosmetic: Compose resolves ${VAR} interpolation
# against the *project directory* (infra/, where the compose file lives), so
# without this the root .env is invisible to ${..._PUBLISHED_PORT} and they
# silently fall back to their defaults. Service env still comes from env_file.
COMPOSE := docker compose -f infra/docker-compose.yml --env-file .env

.PHONY: help infra up down nuke logs init health

help:
	@echo "make infra   - backing services only (redis, postgres, minio)"
	@echo "make up      - full stack (infra + init + api + worker)"
	@echo "make init    - re-run migrations / bucket bootstrap"
	@echo "make logs    - tail api + worker"
	@echo "make health  - curl the API health endpoint"
	@echo "make down    - stop everything (keeps volumes)"
	@echo "make nuke    - stop everything and delete volumes"

# Compose reads ../.env; seed it from the committed example on first run.
.env:
	cp .env.example .env
	@echo "created .env from .env.example"

infra: .env
	$(COMPOSE) up -d

up: .env
	$(COMPOSE) --profile app up --build

init: .env
	$(COMPOSE) run --rm --build init

down:
	$(COMPOSE) --profile app down

nuke:
	$(COMPOSE) --profile app down -v

logs:
	$(COMPOSE) logs -f api worker

health:
	@curl -s http://localhost:8000/health | python3 -m json.tool
