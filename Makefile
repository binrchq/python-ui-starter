.PHONY: help venv install dev run run-dev test lint fmt frontend-install frontend-build build-frontend package clean

ifeq ($(OS),Windows_NT)
BIN := .venv/Scripts
NPM := npm.cmd
else
BIN := .venv/bin
NPM := npm
endif

PY := $(BIN)/python

help:
	@echo "Available commands:"
	@echo "  make venv             - Create the virtual environment"
	@echo "  make install          - Install the package with dev extras"
	@echo "  make frontend-install - Install frontend (npm) dependencies"
	@echo "  make frontend-build   - Build the TypeScript bundle into app/resources/web"
	@echo "  make dev              - Run the Vite dev server"
	@echo "  make run              - Launch the Qt app (bundled assets)"
	@echo "  make run-dev          - Launch the Qt app against the Vite dev server"
	@echo "  make test             - Run the pytest suite"
	@echo "  make lint             - Run ruff"
	@echo "  make package          - Build a standalone executable with PyInstaller"
	@echo "  make clean            - Remove build artifacts"

venv:
	python -m venv .venv

install: venv
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -e ".[dev]"

frontend-install:
	cd frontend && $(NPM) install

frontend-build:
	$(PY) scripts/build_frontend.py

dev:
	cd frontend && $(NPM) run dev

run:
	$(PY) -m app

run-dev:
	$(PY) -m app --dev

test:
	$(PY) -m pytest -q

lint:
	$(PY) -m ruff check .

fmt:
	$(PY) -m ruff check --fix .
	$(PY) -m ruff format .

package:
	$(PY) -m PyInstaller --noconfirm --windowed --name python-ui-starter \
		--add-data "app/resources/web:app/resources/web" app/main.py

clean:
	rm -rf build dist .pytest_cache .ruff_cache
	rm -rf frontend/node_modules frontend/dist
	find . -type d -name __pycache__ -prune -exec rm -rf {} +