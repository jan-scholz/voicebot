.PHONY: check-hatch run build run-web-dev

VERSION := $(shell hatch version)
WEB_DIR=src/web
DIST_DIR=$(WEB_DIR)/dist

test: check-hatch
coverage: check-hatch
clean-all: clean

# Check if hatch is installed
check-hatch:
	@command -v hatch >/dev/null 2>&1 || { \
		echo >&2 "Error: Could not find 'hatch'." \
		"Please activate virtual environment and/or install 'hatch'."; \
		exit 1; \
	}

# Run FastAPI + frontend (assumes dist already built)
run:
	hatch run uvicorn aas.main:app --reload

build-web:
	cd $(WEB_DIR) && npm install && npm run build

run-web-dev:
	cd $(WEB_DIR) && npm run dev

build-docker:
	docker build -t azure-app-demo .

run-docker:
	docker run --rm -p 8000:8000 azure-app-demo

run-docker-env:
	docker run --rm -p 8000:8000 --env-file .env azure-app-demo

clean:
	rm -rf .coverage coverage.xml htmlcov dist build .pytest_cache .mypy_cache "src/"*.egg-info
	find . -type d -name '__pycache__' -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
	rm -rf $(DIST_DIR)

clean-all:
	rm -rf $(WEB_DIR)/node_modules
